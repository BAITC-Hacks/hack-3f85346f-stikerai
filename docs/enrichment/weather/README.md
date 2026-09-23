# Astana weather enrichment

Status: **optional contextual snapshot; never an input to the simulator score**.

This workstream adds a small, versioned, city-reference forecast sample and a
retrieval recipe. It does not update `datadoc.md`,
`backend/data/astana-v1.json`, scoring, district indicators, or district
population shares. The sample is for the Astana city reference point only; no
district boundaries or district centroids are asserted here.

## What is in this package

- [`source-card.md`](source-card.md): source comparison, current access and
  license notes, temporal/spatial support, and known gaps.
- [`forecast-sample.json`](../../../backend/data/enrichment/astana-context-v1/weather/forecast-sample.json):
  a deliberately small two-day future forecast excerpt captured 2026-09-23.
- [`forecast-raw-response.json`](../../../backend/data/enrichment/astana-context-v1/weather/forecast-raw-response.json):
  the original API response used to make the excerpt; SHA-256 is recorded in
  `forecast-sample.json`.
- Retrieval is documented below so the sample can be regenerated without a key
  or a runtime call from the application.

The sample records both the requested point and the API's returned grid-cell
coordinate. It reports forecast fields, not station observations. It is useful
only as a dated demo/context layer; do not reuse it as a current forecast after
its valid dates.

## Reproduce the snapshot

For non-commercial research, education, or a non-profit demo, the Open-Meteo
free API currently requires no API key. The documented request used one point
near central Astana, `51.1694, 71.4491`, with timezone `Asia/Almaty`. Keep the
same query fields and save the raw JSON response before making any reductions:

```sh
curl -fsS 'https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491&hourly=precipitation,precipitation_probability,snowfall,temperature_2m&daily=precipitation_sum,precipitation_probability_max,snowfall_sum&forecast_days=3&timezone=Asia%2FAlmaty' -o forecast-response.json
```

The archived response was fetched at `2026-09-23T10:07:33Z`; its SHA-256 is
`29624974bb4b7ab860a220cdaf3bdacc3e9be9205bfede6fd8f4547335c297e6`.
Capture the retrieval timestamp in UTC separately; the API response's
`generationtime_ms` is request processing time, not a model issue timestamp.
For a fresh product snapshot, keep only future valid times and include any
provider-returned model/run metadata when exposed. Do not infer a model issue
time when it is absent. Preserve the untouched response or its SHA-256 in the
working archive when the applicable terms permit.

Attribution for displayed or redistributed data:

> Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Forecast data are
> provided without warranty.

If the project becomes commercial, serves ads/subscriptions, or undertakes
commercial promotional activity, do not continue on the free API. Recheck the
current Open-Meteo plan and dataset/provider terms first. A production frontend
should not call this API directly; if a future integration is approved, put
refresh/cache logic in an isolated service and allow the simulator to work when
weather data are absent.

## Safe interpretation

- `precipitation_sum` is forecast precipitation depth in millimeters for the
  local calendar day; it combines rain, showers, and snow water equivalent.
- `precipitation_probability_max` is a maximum hourly precipitation
  probability for the day, not a probability that the district will flood.
- This is one snapped model grid cell, with kilometer-scale support, not a
  neighborhood measurement. Never paint it across a 500 m grid as if that grid
  resolved weather at 500 m.
- A two-day forecast is not climatology, a precipitation warning, or a
  prediction for the eight-quarter simulator horizon. Official forecaster
  alerts and station observations are separate products.
- Weather can be shown as dated city context or selected as an explicitly
  labeled scenario event in a separately designed feature. It must not alter
  existing metrics or scores.
