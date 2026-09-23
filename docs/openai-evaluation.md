# OpenAI evaluation explanations

`backend/app/services/openai_analysis.py` explains an evaluation that the
backend has already calculated. Its result shape matches the evaluation fields:
`summary`, `strengths`, `risks`, `consequences`, and `recommendations`. It
returns that object with the configured model name. It must never calculate,
change, or persist the score; the caller owns deterministic scoring and
evaluation persistence.

The request context includes selected initiatives, the validated budget,
before/after overall and district scores, and baseline/projected/delta
indicator values for each district. The current decision dataset remains
synthetic. The prompt forbids inferring resident support or dissatisfaction
from selected initiatives; no live source layer or social data is currently
sent to the model.

## Configuration

Set these in the server `.env` file. Compose forwards them to the backend only;
the frontend does not receive the API key.

```dotenv
OPENAI_API_KEY=your-server-side-api-key
OPENAI_MODEL=gpt-6-astra
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_SECONDS=45
```

Without `OPENAI_API_KEY`, `explain_evaluation(context)` raises
`OpenAIConfigurationError`. It does not return placeholder text. Base URLs must
use HTTPS, except localhost development; redirects are not followed, avoiding
credential forwarding to another host. Context is limited to 60,000 UTF-8
bytes; response data to 100,000 bytes; each returned text field to 2,000
characters; and each list to eight entries. Provider errors are sanitized.

To check whether Compose passed a key without revealing it, run:

```sh
docker compose exec backend python -c 'import os; print("OPENAI_API_KEY configured:", bool(os.getenv("OPENAI_API_KEY")))'
```

Do not use `env`, `printenv`, or `cat .env` to diagnose key presence because
those commands display the secret value.

The Responses API request uses strict JSON Schema output, sends `store: false`,
sets `tools: []`, and bounds generation to 1,200 output tokens. OpenAI documents
strict Structured Outputs and the `text.format` JSON Schema form for Responses;
the GPT-6 Astra model page lists Structured Outputs and the Responses endpoint
as supported. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
`store: false` opts out of retaining the response for later API retrieval; it
does not itself promise zero data retention for all processing. [Responses API
storage parameter](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

Before enabling this integration, ensure the context contains only data
necessary to explain the scenario and does not include personal information or
secret values. Keep user-facing explanations labeled as AI-generated analysis;
verify facts and recommendations against the deterministic evaluation and
source evidence.

`docker compose up --build` runs migrations, then the idempotent demo seed as a
one-shot service; the backend waits for that seed to finish successfully. The
OpenAI key is passed only to the backend container, not migration, seed, or
frontend containers.
