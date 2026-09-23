# Urban quality and facilities source audit

**Audit date:** 2026-09-23
**Scope:** transit, schools, clinics, parks/green space, air quality, road safety,
utilities, and service requests.
**Decision:** no third-party feature data is bundled in this workstream yet.

The public catalogs expose useful leads, but the sources that are clearly
Astana-specific either have no coordinates/feature download visible, are
archived, or lack a machine-readable reuse license in the published metadata.
This audit records what can be safely concluded. It does not assert district
completeness and does not create indicator measurements. The current synthetic
indicators and their scores remain untouched.

## Source register

| Theme | Source and observed metadata | Spatial/content fitness | Status and next action |
|---|---|---|---|
| Transit stops | [Astana bus stop catalogue record](https://data.egov.kz/datasets/view?index=bus_stops): describes stops with route direction and platform type. Published 2015-02-07, last updated 2015-02-07, actuality `No`, archived; no working data or metadata link is shown. | Potential stop points, but vintage and unavailable payload make current coverage unusable. Stops alone do not describe scheduled frequency. | `stale`. Do not ingest. Ask Astana passenger transport authority/CTS for current GTFS Schedule + feed dates/license; obtain stops, routes, trips, stop_times, calendars. Treat realtime separately. |
| Transit route data | [Astana legal open-data list](https://adilet.zan.kz/rus/docs/V18ABW01196) enumerates municipal bus routes, pedestrian crossings, road construction/repair, and traffic cameras with annual publication cadence. This is a publication obligation/catalog lead, not evidence that a current downloadable file exists. | Route list may lack route shape, service calendars, trips and headways. | `needs_permission`/availability check. Query `data.egov.kz` for each named Astana dataset and ask agency for GTFS. A route map screenshot is not a data extract. |
| Schools | [State schools](https://data.egov.kz/datasets/view?index=state_schools): 7,094 national records; fields include organization ID, district/city IDs and names, address, dataset-load date, learner count, organization type, coordinate text, latitude, longitude, establishment date and region. Catalogue says weekly actualization but actuality status `No`; listed create/update dates are 2024-04-27. API v4 endpoint shown as `https://data.egov.kz/api/v4/state_schools/v1` (requires API key). | Learner count and coordinates are useful for facility context; this national state-schools set may exclude private schools and does not expose capacity in the listed fields. Need filter by Astana city/region IDs, inspect nulls/duplicates and confirm update timestamp from payload. | `stale`/`needs_permission` pending fresh payload, license terms and city extract QA. May only support mapped school locations/enrollment count; cannot claim capacity adequacy. |
| Clinics | [Astana state polyclinics #305](https://data.egov.kz/datasets/view?index=317_list_of_state_polyclinics): city health department owner; yearly cadence, actual status `Yes`, updated 2026-06-30, published. Passport says reporting period, name, region, free services, address, contact, service area; no direct data/API link appears in passport view. | Direct Astana primary-care lead, but the catalog preview does not expose coordinates or capacity, and current rows were not verifiable through the page extractor. Geocoding addresses would be a derived operation needing QA. | `needs_permission`. Request/download current rows, check whether service-area descriptions are usable polygons, confirm reuse permission; do not infer capacity from count. |
| Hospitals | [Astana state hospitals #304](https://data.egov.kz/datasets/view?index=68_nur-sultan_kalasynyn_auruh): published, yearly, actuality `Yes`, updated 2025-12-04, API v4 v11. Fields include period, bilingual organization name/address, phones, region and free-service description. Preview has 11 rows for 2025; addresses are not coordinates. | Hospital sites can provide contextual points after geocoding and manual checks, but hospitals are not interchangeable with primary-care clinics. No bed/capacity field in preview. | `needs_permission`. Useful secondary healthcare context only after address geocoding and license confirmation. |
| Parks / green space | [Astana parks catalogue lead](https://data.egov.kz/datasets/view?index=parkter_turaly_akparat): names, addresses, phones, official sites, manager names; yearly cadence; actuality `Yes`, but record is archived and last updated 2020-12-24. | Park inventory is descriptive records, not verified polygons/area. Point/address inventory cannot establish green area per resident. | `stale`. Exclude until owner republishes a current, polygon-capable inventory with reuse rights. OSM landuse/leisure features can be an independent context layer under ODbL after attribution/share-alike review. |
| Air quality | [Kazhydromet monitoring description](https://www.kazhydromet.kz/en/ecology/monitoring-sostoyaniya-okruzhayuschey-sredy) says air monitoring spans 70 settlements / 175 posts, with manual and automatic methods and many pollutants. [Kazhydromet WIS2 API collections](https://wis2box.kazhydromet.kz/oapi/collections?f=html) expose `Stations`, surface observation JSON collections (`synop`, `temp`), notifications and discovery metadata. | WIS2 collection discovery proves an API exists but not that city pollutant observations are included; SYNOP/TEMP are meteorological collections, not an AQ history feed. National monthly environmental bulletins provide city reporting but not district geometry. | `needs_permission` for station-level pollutants: obtain data dictionary, station list/coordinates, timestamps, units, QA flags, historic coverage and explicit redistribution/API terms from Kazhydromet. Do not treat citywide monthly summary as district evidence. |
| AQ alternative | [OpenAQ Astana location](https://explore.openaq.org/locations/7094) currently describes a PM2.5 government monitor, provider AirNow, station reporting since 2018 but last updated about a year ago in the inspected listing; license shown as US Public Domain. Download requires account/login. [AirData.kz](https://airdata.kz/en/data/) describes a multi-source QC/aggregation product with daily/monthly downloadable partitions and source provenance. | OpenAQ listing suggests a single-station time series, not five-district coverage. AirData's city/cluster summaries are third-party derived, and its underlying network/source terms need to be tracked independently. Neither is a district map layer as currently inspected. | OpenAQ `stale` pending current reporting/API access. AirData `context_only` pending exact release/license and station-file review; no mirrored data included. |
| AirKZ / Kazhydromet interactive map | Kazhydromet says the state monitoring results are public and updated hourly in the AirKZ mobile app and interactive air quality map ([announcement](https://www.kazhydromet.kz/ru/post/1076)); a city AQ data map is also linked from an agency post ([sensor rollout](https://www.kazhydromet.kz/ru/post/1410)). | High local relevance and closer to official reference monitoring than a commercial aggregator. Current pollutant endpoints, station coordinates, observation QA, API availability, historical export, and reuse terms were not verified; a web/app display is not permission to scrape. | `priority_discovery`: ask Kazhydromet for supported API/export and redistribution terms. Use station-level PM measurements only with method, station, timestamp and QA metadata. |
| AirKaz.org community sensors | [AirKaz.org network page](https://aqicn.org/network/kz-airkaz/) describes a real-time community sensor feed and current listed sites; a 2026 paper identifies several parallel air-monitor networks in Astana and describes AirKaz's low-cost Plantower sensors. A [World Bank review](https://documents1.worldbank.org/curated/en/099920008292227204/pdf/P1708700f4b6f30f0bf1a05fe6c088bdd2.pdf) notes their uncertainty is higher than reference-grade stations. | A potentially valuable neighborhood hotspot/context layer if current Astana sensors and station locations are confirmed. Low-cost PM sensor readings are not equivalent to a regulatory reference station or an official AQI; calibration, humidity, completeness and outages matter. | `needs_validation_and_terms`: verify current Astana station list, data owner/API rights, sensor models and calibration, per-station gaps, and correction methods. Keep separate from the state network and from official AQI. |
| IQAir / AirVisual API | IQAir offers a free Community API with an API key and capped request volume; its published plan exposes city-level overall AQI, real-time weather, and limited endpoints, while station/pollutant detail is paid-tier ([plans](https://www.iqair.com/air-quality-monitors/api), [API access guide](https://www.iqair.com/in-en/support/knowledge-base/access-airvisuals-aqi-air-quality-and-pollution-api)). | Useful for a quick city-level reference widget if Astana coverage is returned for the chosen endpoint. AQI scale, underlying monitor/source, update time, completeness, and API attribution/caching terms must be shown; not fit for district mapping without station-level entitled access. | `conditional`: an API key is needed even for free access; verify actual Astana response and terms before activation. Never merge its value directly into the baseline winter `e2` score. |
| Road injury safety | [Prosecutor General legal statistics service](https://data.egov.kz/datasets/view?index=gp_od_service_dtp1) is published, monthly statistical report, actual status yes, service API via portal proxy. The service documentation says output fields are `region`, total crashes, and number of injured persons. | Regional/monthly aggregate only; no point coordinates, street or district key in the documented response. Cannot spatially allocate to five districts or compute exposure-adjusted crash risk. | `context_only` for citywide trends only; no ingestion into district layers. The older МВД incident dataset is archived. Do not process person-level records or crime data as a proxy for road safety. |
| Street safety / city assets | The [Astana open-data list](https://adilet.zan.kz/rus/docs/V18ABW01196) names traffic cameras and pedestrian crossings, plus annual road/lighting-related infrastructure inventory leads. Current downloadable geometry, operator, and public reuse terms were not established in this audit. | Could support map context when actual maintained point/line geometries are supplied. Presence of a camera is not a street-safety outcome. | `needs_permission`. Request current asset data and accuracy/update fields from city transport/road department. Do not expose security-sensitive camera details unless public dataset is explicitly intended for publication. |
| Utilities | City open-data list names energy, gas, water supply and wastewater facilities. [Astana water-supply operators record #670](https://data.egov.kz/datasets/view?index=696_sumen_zhabdyktau_obektil) is owned by the municipal utilities department, annual and marked current, updated 2026-06-30. [Wastewater operators #671](https://data.egov.kz/datasets/view?index=697_su_buru_obektileri_tural) is similarly marked current, updated 2025-12-02. | These describe utility operators/facilities, not outage events, service reliability, affected population, duration, or district-tagged repairs. Geometry and actual data fields were not confirmed. | `context_only` for asset inventory after review; `needs_permission` for outage/event data. Request timestamped, district-tagged outage and restoration records with affected area/population and definitions. |
| Service requests | No verifiable public, machine-readable Astana dataset of anonymized requests, category, district, opened/resolved timestamps and service-level definitions was identified in this source pass. City legal list identifies citizen appeals statistics but not necessarily geocoded requests. | Citywide appeal totals cannot support district `c2`; personally identifying details must be excluded. | `needs_permission`. Ask city service operators for aggregates by district/category/month and completion duration, including suppression rules and release rights. |
| OSM facilities/green/streets | [OpenStreetMap contributors and license](https://www.openstreetmap.org/copyright): data under ODbL attribution/share-alike. [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) requires visible attribution for its tile service; tile use is distinct from bulk data extraction. | A dated Overpass snapshot now packages 171 Astana-bbox features tagged `amenity=school` (160 named), with OSM IDs and source timestamps. These are community-mapped candidates, not a current official school register; may include colleges, preschool facilities, stale or mistagged features. | `context_only`, accepted for the separately labeled map and site reconnaissance. Bundle uses ODbL attribution and preserves IDs. Verify candidate schools with Education Department and field checks. Do not use public tiles for bulk/offline use; current UI requests only visible map tiles, but production needs a chosen, operated tile provider with suitable availability. |

## Minimum acceptance gate before bundling a feature extract

1. Archive the live dataset passport/API schema, exact retrieval URL/query,
   retrieval date, source version or last-updated stamp and source-file hash.
2. Record rights for redistribution, derivative geometry, web display, cache
   duration and attribution. A portal label of “published/open” is not by
   itself a clearly specified license; mark `needs_permission` until terms are
   explicit.
3. Verify city coverage, district name/ID mapping, CRS/axis order, geometry,
   null/duplicate rate, date and a hand-checked sample. Retain source feature
   identifiers. Geocoded addresses need confidence and match method.
4. Keep evidence labels precise: facility location/count, enrollment, service
   area, incident aggregate, station observation, or operator inventory.
   Never relabel these as capacity, accessibility, safety, reliability, or
   service quality without an approved measurement method.
5. Publish OSM-derived data with `© OpenStreetMap contributors` and link to
   its copyright page; assess the ODbL share-alike requirements for the
   derived database before committing it.

## Hand-off to implementation agents

- **Transit:** locate a current Astana/CTS GTFS Schedule feed and document
  `feed_info`, `stops`, `routes`, `trips`, `stop_times`, service calendars,
  timezone, validity dates, and license. If unavailable, request from city;
  do not revive the 2015 archive.
- **Schools/health:** retrieve the current eGov extract/API response; verify
  Astana IDs, completeness against the city's register, exact license, and
  coordinates. Preserve state school counts as context, not capacity.
- **Parks/OSM:** obtain permitted current parks polygons and document
  ODbL consequences. Compare official park inventory vs OSM coverage; do not
  infer green area from points.
- **AQ:** ask Kazhydromet for historical automatic/manual station readings,
  site metadata and redistribution conditions; evaluate OpenAQ/AirData only
  as station/city context with source and QC retained.
- **Safety/utilities/services:** seek privacy-safe district/time aggregates
  with exposure/denominators and data dictionaries; citywide totals or asset
  inventories do not measure district outcomes.

## References

- [eGov API examples and query format](https://data.egov.kz/pages/samples)
- [Kazhydromet monitoring network](https://kazhydromet.kz/en/ecology/ob-ekologicheskom-monitoringe)
- [Kazhydromet WIS2 collections](https://wis2box.kazhydromet.kz/oapi/collections?f=html)
- [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright)
- [OSMF public tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [Astana legal open-data list](https://adilet.zan.kz/rus/docs/V18ABW01196)
