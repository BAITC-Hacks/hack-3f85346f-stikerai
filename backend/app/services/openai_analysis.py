"""OpenAI explanation layer for deterministic scenario evaluation.

This service explains caller-supplied scores and indicator results. It never
calculates, adjusts, or persists a score. Uses only stdlib HTTP so no SDK is
needed by the backend image.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


DEFAULT_MODEL = "gpt-6-astra"
DEFAULT_BASE_URL = "https://api.openai.com/v1"
PROMPT_VERSION = "astana-evaluation-explanation-v1"
MAX_CONTEXT_BYTES = 60_000
MAX_RESPONSE_BYTES = 100_000
MAX_OUTPUT_TOKENS = 1_200
MAX_ITEMS_PER_SECTION = 8
MAX_TEXT_LENGTH = 2_000


class OpenAIAnalysisError(RuntimeError):
    """Safe-to-display failure from the optional analysis service."""


class OpenAIConfigurationError(OpenAIAnalysisError):
    """Missing or invalid server-side configuration."""


class OpenAIProviderError(OpenAIAnalysisError):
    """Provider request, refusal, or response validation failed."""


@dataclass(frozen=True)
class EvaluationExplanation:
    summary: str
    strengths: list[str]
    risks: list[str]
    consequences: list[str]
    recommendations: list[str]

    def as_dict(self) -> dict[str, object]:
        return {
            "summary": self.summary,
            "strengths": self.strengths,
            "risks": self.risks,
            "consequences": self.consequences,
            "recommendations": self.recommendations,
        }


EVALUATION_SCHEMA: dict[str, object] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "consequences": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "strengths", "risks", "consequences", "recommendations"],
}

INSTRUCTIONS = """Explain an already-computed deterministic city scenario evaluation.
Treat all supplied score values, rankings, indicator values, and initiative
effects as authoritative inputs. Never recalculate, alter, or invent a score,
indicator value, initiative, causal effect, or evidence source. Distinguish
model-derived implications from facts in the supplied context. Be concise,
specific, and understandable to a city resident. Explain tradeoffs and
uncertainty. If context does not support a claim, say that evidence is missing.
Return a summary and lists of strengths, risks, consequences, and
recommendations. Recommendations must be framed as options for human review,
not automatic decisions."""


class _NoRedirect(HTTPRedirectHandler):
    """Do not risk forwarding the server-side bearer token across redirects."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def explain_evaluation(context: dict) -> tuple[dict[str, object], str]:
    """Return ``(evaluation-shaped explanation, model_name)``.

    Missing credentials are an explicit configuration error; the function does
    not return placeholder/fake AI content. ``context`` is JSON encoded and
    size-limited before network I/O. The API key is read from the server
    environment and never included in errors or results.
    """
    if not isinstance(context, dict):
        raise OpenAIAnalysisError("Evaluation context must be a JSON object")
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise OpenAIConfigurationError("AI explanation is disabled: OPENAI_API_KEY is not configured")

    model_name = os.getenv("OPENAI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    base_url = os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL).strip().rstrip("/") or DEFAULT_BASE_URL
    timeout = _configured_timeout()
    _validate_base_url(base_url)
    try:
        context_json = json.dumps(context, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError):
        raise OpenAIAnalysisError("Evaluation context must contain finite JSON values only") from None
    context_bytes = context_json.encode("utf-8")
    if len(context_bytes) > MAX_CONTEXT_BYTES:
        raise OpenAIAnalysisError(f"Evaluation context exceeds the {MAX_CONTEXT_BYTES}-byte limit")

    payload = {
        "model": model_name,
        "instructions": INSTRUCTIONS,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": context_json}]}],
        "max_output_tokens": MAX_OUTPUT_TOKENS,
        "store": False,
        "tools": [],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "scenario_evaluation_explanation",
                "strict": True,
                "schema": EVALUATION_SCHEMA,
            }
        },
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    request = Request(
        f"{base_url}/responses",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with build_opener(_NoRedirect).open(request, timeout=timeout) as response:
            response_body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        # Do not include provider response bodies or request headers in errors.
        if 300 <= exc.code < 400:
            raise OpenAIProviderError("OpenAI endpoint redirects are not followed") from None
        raise OpenAIProviderError(f"OpenAI request failed with HTTP {exc.code}") from None
    except (URLError, TimeoutError, OSError):
        raise OpenAIProviderError("OpenAI request failed or timed out") from None

    if len(response_body) > MAX_RESPONSE_BYTES:
        raise OpenAIProviderError("OpenAI response exceeded the configured size limit")
    try:
        response = json.loads(response_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise OpenAIProviderError("OpenAI returned an invalid response") from None

    try:
        output_text = _extract_output_text(response)
        result = json.loads(output_text)
        explanation = _validate_explanation(result)
    except OpenAIProviderError:
        raise
    except (json.JSONDecodeError, TypeError, ValueError):
        raise OpenAIProviderError("OpenAI returned an invalid structured explanation") from None
    return explanation.as_dict(), model_name


def _configured_timeout() -> float:
    raw = os.getenv("OPENAI_TIMEOUT_SECONDS", "45").strip()
    try:
        timeout = float(raw)
    except ValueError:
        raise OpenAIConfigurationError("OPENAI_TIMEOUT_SECONDS must be a number") from None
    if not 1 <= timeout <= 180:
        raise OpenAIConfigurationError("OPENAI_TIMEOUT_SECONDS must be between 1 and 180")
    return timeout


def _validate_base_url(base_url: str) -> None:
    parts = urlsplit(base_url)
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in local_hosts):
        raise OpenAIConfigurationError(
            "OPENAI_BASE_URL must use HTTPS (HTTP is allowed only for localhost development)"
        )
    if not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
        raise OpenAIConfigurationError("OPENAI_BASE_URL must be an origin/path URL without credentials")


def _extract_output_text(response: object) -> str:
    if not isinstance(response, dict):
        raise OpenAIProviderError("OpenAI returned an invalid response shape")
    if response.get("status") not in (None, "completed"):
        raise OpenAIProviderError("OpenAI response did not complete")
    output = response.get("output")
    if not isinstance(output, list):
        raise OpenAIProviderError("OpenAI response did not contain output items")
    chunks: list[str] = []
    for item in output:
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "refusal":
                raise OpenAIProviderError("OpenAI declined to produce an evaluation explanation")
            if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                chunks.append(part["text"])
    text = "".join(chunks)
    if not text:
        raise OpenAIProviderError("OpenAI response did not contain structured text")
    return text


def _validate_explanation(value: object) -> EvaluationExplanation:
    expected = set(EVALUATION_SCHEMA["required"])
    if not isinstance(value, dict) or set(value) != expected:
        raise ValueError("Unexpected result properties")
    summary = _bounded_text(value["summary"], "summary")
    lists: dict[str, list[str]] = {}
    for name in ("strengths", "risks", "consequences", "recommendations"):
        items = value[name]
        if not isinstance(items, list) or len(items) > MAX_ITEMS_PER_SECTION:
            raise ValueError("Invalid result list")
        lists[name] = [_bounded_text(item, name) for item in items]
    return EvaluationExplanation(summary=summary, **lists)


def _bounded_text(value: object, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text")
    result = value.strip()
    if not result or len(result) > MAX_TEXT_LENGTH:
        raise ValueError(f"{field_name} has invalid length")
    return result
