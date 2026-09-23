"""Opt-in adapter boundary for exploratory MiroFish scenario runs.

This module does not collect source material. Its request schema permits only
proposal text and reviewed aggregate evidence. Outbound I/O is disabled unless
all gateway settings are explicitly configured.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator


class MiroFishError(RuntimeError):
    """Base error for the optional adapter."""


class MiroFishDisabledError(MiroFishError):
    """Raised when a scenario is submitted while integration is disabled."""


class MiroFishConfigurationError(MiroFishError):
    """Raised when explicit integration settings are incomplete or unsafe."""


class MiroFishGatewayError(MiroFishError):
    """Raised when the configured gateway cannot complete a request."""


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EvidenceAggregate(_StrictModel):
    """A single non-identifying aggregate; free-form post/comment text is absent."""

    source_id: str = Field(min_length=1, max_length=120)
    metric: str = Field(min_length=1, max_length=120)
    value: float = Field(allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=40)
    period: str = Field(min_length=1, max_length=80)
    geography: str = Field(min_length=1, max_length=80)
    sample_size: int | None = Field(default=None, ge=0)
    suppression_applied: bool

    @model_validator(mode="after")
    def require_privacy_safe_sample(self) -> "EvidenceAggregate":
        if self.sample_size is None and not self.suppression_applied:
            raise ValueError("unknown sample size requires suppression_applied=true")
        if self.sample_size is not None and self.sample_size < 5:
            raise ValueError("aggregates below the minimum sample size cannot be sent")
        return self


class PrivacyReviewedBrief(_StrictModel):
    review_status: Literal["approved"]
    reviewer_role: str = Field(min_length=1, max_length=80)
    reviewed_at: datetime
    aggregates: list[EvidenceAggregate] = Field(min_length=1, max_length=200)

    @field_validator("reviewed_at")
    @classmethod
    def reviewed_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("reviewed_at must include a timezone")
        return value


class MiroFishRequest(_StrictModel):
    proposal_text: str = Field(min_length=1, max_length=20_000)
    evidence_brief: PrivacyReviewedBrief


class MiroFishGatewayResponse(_StrictModel):
    result_text: str = Field(min_length=1, max_length=100_000)
    run_id: str | None = Field(default=None, max_length=160)
    limitations: list[str] = Field(default_factory=list, max_length=40)


class ExploratoryResult(_StrictModel):
    status: Literal["completed"] = "completed"
    interpretation: Literal["exploratory scenario hypotheses"] = "exploratory scenario hypotheses"
    calibration: Literal["not calibrated"] = "not calibrated"
    result_text: str
    provider_run_id: str | None
    limitations: list[str]


def validate_request(payload: object) -> MiroFishRequest:
    """Validate the privacy boundary without reflecting submitted data in errors.

    Extra fields are rejected at every object level by ``extra='forbid'``. This
    rejects common raw-input fields such as comments, posts, user IDs, handles,
    profile data, and arbitrary nested source records.
    """
    try:
        return MiroFishRequest.model_validate(payload)
    except ValidationError as exc:
        raise MiroFishError(
            "Invalid MiroFish request: only proposal_text and a privacy-reviewed "
            "aggregate evidence_brief are accepted; unknown/raw fields are refused."
        ) from None


class MiroFishConfig:
    """Read-only environment configuration; disabled unless explicitly enabled."""

    def __init__(self, enabled: bool, base_url: str, bearer_token: str, timeout_seconds: float):
        self.enabled = enabled
        self.base_url = base_url.rstrip("/")
        self.bearer_token = bearer_token
        self.timeout_seconds = timeout_seconds

    @classmethod
    def from_env(cls) -> "MiroFishConfig":
        enabled = os.getenv("MIROFISH_ENABLED", "false").strip().lower() in {"1", "true", "yes"}
        raw_timeout = os.getenv("MIROFISH_TIMEOUT_SECONDS", "45").strip()
        try:
            timeout = float(raw_timeout)
        except ValueError:
            raise MiroFishConfigurationError("MIROFISH_TIMEOUT_SECONDS must be a number") from None
        if not 1 <= timeout <= 180:
            raise MiroFishConfigurationError("MIROFISH_TIMEOUT_SECONDS must be between 1 and 180")
        return cls(
            enabled=enabled,
            base_url=os.getenv("MIROFISH_BASE_URL", "").strip(),
            bearer_token=os.getenv("MIROFISH_API_TOKEN", "").strip(),
            timeout_seconds=timeout,
        )

    def capability(self) -> dict[str, object]:
        if not self.enabled:
            state = "disabled"
        elif not self.base_url or not self.bearer_token:
            state = "configuration_incomplete"
        else:
            state = "configured_gateway"
        return {
            "enabled": self.enabled,
            "state": state,
            "outbound_calls": self.enabled and state == "configured_gateway",
            "calibrated": False,
        }


class MiroFishAdapter:
    """Submit reviewed aggregate briefs to a configured authenticated gateway.

    The configured URL must be a project-controlled gateway that implements
    ``POST /api/astana/scenario`` and authenticates the bearer token. Upstream
    MiroFish does not expose this single-request contract; the gateway owns its
    multi-step orchestration and its security boundary.
    """

    endpoint_path = "/api/astana/scenario"
    fixed_limitations = [
        "Exploratory hypotheses only; this run is not calibrated to Astana residents.",
        "Simulated personas are not a representative sample or public opinion poll.",
        "This output does not change the simulator score or existing indicators.",
    ]

    def __init__(self, config: MiroFishConfig | None = None):
        self.config = config or MiroFishConfig.from_env()

    def capability(self) -> dict[str, object]:
        """Return configuration state without probing the configured host."""
        return self.config.capability()

    def submit(self, payload: object) -> ExploratoryResult:
        request_data = validate_request(payload)
        config = self.config
        if not config.enabled:
            raise MiroFishDisabledError("MiroFish integration is disabled")
        if not config.base_url or not config.bearer_token:
            raise MiroFishConfigurationError(
                "Set MIROFISH_BASE_URL and MIROFISH_API_TOKEN to enable the authenticated gateway"
            )
        self._validate_gateway_url(config.base_url)

        body = json.dumps(request_data.model_dump(mode="json"), ensure_ascii=False).encode("utf-8")
        request = Request(
            config.base_url + self.endpoint_path,
            data=body,
            headers={
                "Authorization": f"Bearer {config.bearer_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=config.timeout_seconds) as response:
                if response.status < 200 or response.status >= 300:
                    raise MiroFishGatewayError("Configured MiroFish gateway returned a non-success status")
                response_body = response.read(1_000_001)
        except HTTPError as exc:
            raise MiroFishGatewayError(
                f"Configured MiroFish gateway returned HTTP {exc.code}"
            ) from None
        except (URLError, TimeoutError, OSError):
            raise MiroFishGatewayError("Configured MiroFish gateway could not be reached") from None

        if len(response_body) > 1_000_000:
            raise MiroFishGatewayError("Configured MiroFish gateway response exceeded 1 MB")
        try:
            gateway_response = MiroFishGatewayResponse.model_validate(json.loads(response_body))
        except (json.JSONDecodeError, ValidationError, TypeError):
            raise MiroFishGatewayError("Configured MiroFish gateway returned an invalid response") from None

        return ExploratoryResult(
            result_text=gateway_response.result_text,
            provider_run_id=gateway_response.run_id,
            limitations=self.fixed_limitations + gateway_response.limitations,
        )

    @staticmethod
    def _validate_gateway_url(base_url: str) -> None:
        parts = urlsplit(base_url)
        local_hosts = {"localhost", "127.0.0.1", "::1", "mirofish"}
        if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in local_hosts):
            raise MiroFishConfigurationError(
                "Use HTTPS for a remote gateway; plain HTTP is allowed only for the local MiroFish host"
            )
        if not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
            raise MiroFishConfigurationError("MIROFISH_BASE_URL must be a plain origin/path URL without credentials")
