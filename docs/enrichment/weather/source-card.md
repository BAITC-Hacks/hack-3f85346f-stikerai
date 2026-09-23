# Weather source card and research findings

Checked: 2026-09-23 (official documentation and source pages linked below).

## Recommended free snapshot source: Open-Meteo

**Decision:** accepted for a small, attributed, non-commercial demo snapshot;
not approved for commercial app usage without a paid plan and a fresh terms
review.

- **Owner/service:** Open-Meteo API; its API combines open-data model products
  from national weather services and reanalysis sources. Source list and data
  license are documented on [Open-Meteo's licence page](https://open-meteo.com/en/licence).
- **Endpoint used:** `https://api.open-meteo.com/v1/forecast`.
- **Access:** current API request works without a key. Free access is only for
  non-commercial use; current limits are <10,000 requests/day, 5,000/hour,
  600/minute, and 300,000/month. The API data are CC BY 4.0, which permits reuse with attribution
  and change indication. See [terms](https://open-meteo.com/en/terms) and
  [licence/attribution](https://open-meteo.com/en/licence).
- **Variables in sample:** hourly precipitation, precipitation probability,
  snowfall and 2 m temperature; daily precipitation sum, maximum hourly
  precipitation probability, snowfall sum.
- **Time class:** numerical weather forecast, not station observations. Forecast
  page says forecasts up to 16 days; default best-match products update on
  model-specific schedules. See [forecast API docs](https://open-meteo.com/en/docs).
- **Spatial support:** response returns a resolved grid coordinate distinct
  from query coordinate. Model support is kilometer scale and varies with the
  selected/best-match model and forecast range; it is not a 500 m product. The
  API's interpolation/snapping does not create finer observational accuracy.
- **History distinction:** forecast API past-days output is archived forecast
  model data, not station observations. For modeled historical context,
  historical weather API offers ECMWF IFS at 9 km from 2017, ERA5 at ~25 km
  from 1940, ERA5-Land at ~11 km from 1950; those are reanalysis/model products.
  Historical forecast API preserves archived forecast runs from around 2022.
  See [historical weather](https://open-meteo.com/en/docs/historical-weather-api)
  and [historical forecasts](https://open-meteo.com/en/docs/historical-forecast-api).
- **Quality limit:** no guarantee of accuracy, completeness, or uninterrupted
  availability. The sample is one point and has no district representativeness
  check or comparison against a Kazhydromet station.
- **Retrieval:** one query is in `README.md`; there are no credentials or app
  runtime requests in this package.

## Official local-source candidate: Kazhydromet

**Decision:** preferred authority for local verification and warning context;
not ingested as a redistributable data sidecar because a machine-readable
reuse license/redistribution grant was not established in this research pass.

- Kazhydromet's current public [Astana three-day forecast](https://www.kazhydromet.kz/ru/weather/in_city/14/921)
  provides city-level day/night text forecasts and wind values. Its station
  observations are separately listed on the page. The page is a human-facing
  product. During this check its rendered page paired “Astana” with a
  “North Kazakhstan Region” heading, so the page's selected locality/region
  needs to be checked before treating it as Astana-specific evidence. This work
  did not verify a stable documented API, export schema, station ID/coordinates,
  or redistribution rights for its forecast text.
- Kazhydromet's [numerical WRF forecast page](https://www.kazhydromet.kz/vc/wrf/maps-x.html?lang=kk)
  says its WRF maps have 2 km spatial resolution, hourly steps up to 36 hours,
  are issued daily at 06:00 Astana time, and are advisory pending synoptician
  updates. The same page offers 10-day 6 km/240 h maps. These are much more
  locally relevant than the selected global forecast, but a published map is
  not proof that the raw grid may be redistributed. No raw download format,
  data license, archive guarantee, or permission to republish was verified.
- A public government announcement says the Kazhydromet meteorological
  database contains station data from 2000 and described user access to
  historical records through 2021. The currently reachable catalog/fields,
  update through present, bulk export, and reuse terms need confirmation.
  Source: [Ministry announcement](https://www.gov.kz/memleket/entities/ecogeo/press/news/details/481395?lang=ru).
- **Next verification:** request written terms and the current export/schema for
  Astana station observations and raw WRF precipitation/temperature grids;
  identify station IDs, coordinates, quality flags, valid/issue times, and
  spatial/temporal resolution; test dates and availability before replacing or
  comparing any Open-Meteo sample. Do not scrape a website or republish map
  imagery as data without confirmation.

## Paid/keyed alternatives

| Candidate | Useful capabilities | Access, limits, and resolution | Decision |
| --- | --- | --- | --- |
| [Google Maps Platform Weather API](https://developers.google.com/maps/documentation/weather/overview) | Current conditions, hourly forecast up to 240 h, daily forecast up to 10 days, hourly history only up to 24 h. Contains precip amount/type, thunderstorm probability, etc. | Billing must be enabled and every request must use API key or OAuth. Pay-as-you-go SKU. Official docs call it hyperlocal but the overview does not declare a gridded spatial resolution. Weather API output must carry `Source: Includes weather data from Google`; Google Maps content has attribution and caching/service restrictions. See [billing](https://developers.google.com/maps/documentation/weather/usage-and-billing), [policies](https://developers.google.com/maps/documentation/weather/policies), [reference](https://developers.google.com/maps/documentation/weather/reference/rest). | Candidate only if product needs live keyed weather and an owner funds/operates it. Poor fit for a public static, redistributable research snapshot: billing, secret management, content restrictions, and only 24h history. |
| [Yandex Weather API](https://yandex.com/dev/weather/doc/en/concepts/api) | Current conditions and 10-day forecast on business plans; historical facts via separately priced platform/export. | API requires a key in `X-Yandex-Weather-Key`. Current docs list a no-charge “Weather on your site” tier at 50 requests/day with current weather and the next two periods, a test tier with 7 days for 30 days (5,000/day), and paid prepaid business tiers. Page also includes clearly archived tariff tables. Separately offered historical archive is manager-priced, 25 km since 1950 / 2 km since 2022, export after payment. Publicly displayed data need branding. No free/open redistributable data terms were established here. See [current plans and historical limits](https://yandex.com/dev/weather/doc/en/concepts/pricing) and [key instructions](https://yandex.com/dev/weather/doc/en/concepts/api). | Do not select absent a product/terms review and server-side key handling. Historical model archive is potentially useful for research but not a no-key workflow. |

## Decision for downstream agents

1. Use only the Open-Meteo sample for an offline, non-commercial contextual
   demonstration, with visible attribution/date/staleness treatment.
2. Do not integrate Google/Yandex calls or credentials into this repository.
3. Seek Kazhydromet reuse permission and raw gridded/station data details before
   building a local-authority sidecar. Compare products only for the same valid
   times and at clearly labeled point/grid support.
4. Keep forecast, observed station data, reanalysis, archived forecast runs, and
   climate scenarios as distinct records and UI states. None automatically
   changes `e2` or any other existing indicator.
