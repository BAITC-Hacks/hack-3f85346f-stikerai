# Public Signals pilot operations

This folder holds the review artifacts required before any real source is
connected to Public Signals. The application demo uses explicitly synthetic
aggregates; no social posts or personal data are included.

## Before enabling a source

Copy [source-card-template.md](source-card-template.md) for each source and get
the accountable project owner to record approval. The card must establish
provider authorization, permitted purpose and fields, local availability,
retention/deletion behavior, quotas/cost, and what may be displayed. “Publicly
visible” is not itself an approval. Do not add a connector until the card is
complete.

## Before reporting stance or topic quality

Create a consented or otherwise approved, de-identified evaluation sample using
[language-evaluation-template.csv](language-evaluation-template.csv). Two
reviewers should label Kazakh and Russian separately, including code-switching,
transliteration, irony, negation, and unclear cases. Resolve disagreements and
report precision/recall per language and label. Do not use the evaluation
sample as a user dataset or training corpus unless its terms separately allow
that use.

For a hackathon demo, populate the interface with invented, clearly labeled
aggregate numbers and fixed sample evidence. Do not seed the app with copied
social comments. A meaningful live demo can instead use publicly documented
consultation metadata and manually entered aggregate counts after source
permission is established.

## Deployment gates

- Disable provider adapters unless their source card is approved.
- Retain only aggregate rows and the minimum source identifiers required for
  deduplication/deletion. Never retain handles, names, profile attributes,
  inferred location, or per-person stance history.
- Publish sample sizes, source and language coverage, last update, stale/error
  state, and a non-representative sample notice in the interface.
- Keep scenario simulation separate from observed aggregates and label output
  as an exploratory hypothesis. No city quality score or recommendation is
  changed by Public Signals.
- Before public release, have Kazakhstan counsel review the current Digital
  Code, personal-data rules, and platform terms; validate deletion propagation,
  access controls, and language quality.

## Data boundary

Public Signals records may refer to an existing proposal or context layer by
its stable ID and source URL. They must not edit `datadoc.md`,
`backend/data/astana-v1.json`, scores, weights, baseline district shares, or
indicator definitions. The district boundary vintage mismatch documented in
the main enrichment plan also prevents assigning discussion to the existing
synthetic district rows.
