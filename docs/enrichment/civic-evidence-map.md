# Civic Evidence Map concept

The product opportunity is a citizen-facing evidence explorer for city
proposals: make evidence legible, traceable, and useful for public discussion.
“Palantir for citizens” works as shorthand for joining layers, but the design
boundary is civic transparency rather than surveillance or individual
profiling.

## First map layers

| Layer | Initial treatment | Readiness |
|---|---|---|
| Proposal / project footprints | Show adopted/planned items differently from existing assets and link to source documents | Geometry and reuse rights need verification |
| Districts / neighborhoods | Show boundary source date/vintage; never attach the five synthetic score rows to today's six district boundaries without a crosswalk | Six OSM polygons bundled; same-name model candidates remain unverified and polygons stay grey. See [interactive map](../interactive-map.md). |
| Air quality | Separate Kazhydromet reference stations from AirKaz community sensors and IQAir aggregate; show pollutant, unit/AQI scale, station type, timestamp, and freshness | API rights and current Astana coverage not verified |
| Weather / precipitation | Show provider model, issue time, valid time, resolution, ensemble/statistic, and staleness | WeatherNext access/terms need review; current Open-Meteo sample is stale and city-reference only |
| Public discussion | Proposal-level aggregate topics/stance and language/coverage facts; no user points or inferred residential locations | Current API contains synthetic demo aggregates only |
| Public live views | Curated source links or owner-approved embeds; visual orientation, not a data feed or sensor | Verify owner embedding permission, location, uptime, and privacy |

## Live streams

Public leads include [Khan Shatyr's live-camera page](https://site.khanshatyr.com/ru/camera)
and a [24/7 Astana city-view stream by Atameken Business](https://www.youtube.com/watch?v=tSQAb1BuaAg).
Use a link or the owner's standard embed only while it remains public and
embeddable. YouTube's iframe documentation notes that owners can disable
embedding; follow the player/settings rather than proxying or downloading
video. Do not use video to identify people, infer residence/behavior, count
protests, track vehicles/plates, or generate opinion/safety scores. A stream
may help orient a resident to a place; it does not replace official counts,
sensor readings, or a traffic API. See the [YouTube IFrame Player docs](https://developers.google.com/youtube/iframe_api_reference).

## Citizen-facing requirements

- Every layer exposes publisher/source, observation or retrieval time, unit and
  method, license, coverage, known gaps, and stale/unavailable state.
- Distinguish observation, estimate, forecast, plan, and synthetic demo in
  labels and symbology. Explain comparisons in plain language.
- Link to the original proposal/consultation and let residents see, download,
  and challenge public aggregate evidence where source terms allow it.
- Do not collect individual location trails or infer personal characteristics.
  Hide small groups and keep raw social content out of the map.
- Keep context layers separate from the existing quality score and scenario
  math. Surface the original baseline, data limits, and scenario assumptions.

## Build order

1. Resolve boundary geometry/vintage; meanwhile stay citywide and do not render
   synthetic district values as real geography.
2. Build a generic layer manifest and legend with source/date/status metadata,
   initially using only licensed local or bundled data.
3. Add verified air monitor points/readings after authorization and quality
   review, with reference and community networks visually distinct.
4. Add official proposal and General Plan features after source geometry/terms
   are confirmed.
5. Add optional, click-to-load public streams with publisher/location labels;
   exclude video from analytics and score calculations.
6. Add public discussion aggregates after source approval and language QA;
   expose platform/language coverage and non-representative sample caveats.

Research checked 2026-09-23. Provider terms, stream availability, and embed
settings can change; recheck before enabling a layer.
