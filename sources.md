# Astana real-world pilot: source register and readiness checklist

**Research checked:** 2026-09-23  
**Purpose:** identify the data, permissions, people, and evaluation work needed to run one small, accountable Akimat pilot. This is a source register and acquisition plan, not a claim that all data below are open or ready to ingest.

## Recommended first pilot

Test a **safe school-street / school-zone package** at one or two candidate schools, aligned with DataDoc initiative M11 (“Safe crossings and school zones”). Keep the current simulation model and its synthetic baseline separate. Pick sites only after the city confirms the participating schools, road owner, implementation authority, and a matched untreated comparison site. Do not nominate a neighbourhood from the current synthetic district scores.

This is a practical first test because the treatment can be bounded, observed in person, and measured without collecting children's identities. Use temporary, reversible measures selected with school communities and the city (for example, a timed vehicle restriction, crossing treatment, or traffic-calming element). The exact intervention and design require local engineering and legal approval. Measure speed, traffic volume, pedestrian volume, yielding/crossing behaviour, perceived safety, and access before and after. Treat crashes as a long-term secondary outcome: a short pilot is too small to establish a crash reduction. FHWA evaluation guidance recommends comparison sites for behavioral and operational outcomes and states that a simple before/after crash comparison is not sufficient. [FHWA pedestrian/bicyclist evaluation methods](https://www.fhwa.dot.gov/publications/research/safety/pedbike/11035/009.cfm)

UN-Habitat’s participatory planning toolkit describes planning as a multi-stakeholder process, with mechanisms adapted to local context and residents participating in meaningful decisions. The pilot therefore needs parent/student/staff input before selecting the design, not just a post-launch satisfaction survey. [UN-Habitat participation toolkit](https://unhabitat.org/enabling-meaningful-public-participation-in-spatial-planning-processes) · [UN-Habitat Our City Plans](https://unhabitat.org/our-city-plans-an-incremental-and-participatory-toolbox-for-urban-planning)

## Readiness at a glance

| Need | Best source / route | What is verified now | Pilot status |
| --- | --- | --- | --- |
| Pilot authority and site access | Astana Akimat; district Akim; Education Department; Transport and Road Infrastructure Department; school leadership | The city has relevant agencies and publicly describes coordination around city services; no pilot sponsor or site authorization is in hand | **Not ready:** name decision owner, implementer, school partner, and safety engineer |
| Current school locations and counts | eGov national state-schools dataset; Education Department register; BNS Astana education statistics | eGov dataset exposes school ID, geography/coordinates, learner count and type, but its passport says actuality “No” and dates to April 2024. BNS city-level time series list school and kindergarten counts/capacity; these are not geocoded | **Partial:** request a current, validated city extract and school entrance points |
| Road / sidewalk / stop context | Astana geoinformation REST service; eGov open-data catalog; OpenStreetMap (fallback/context only) | Public ArcGIS service metadata exposes road axes, sidewalks, crossings/transport-stop feature layers in a local projected CRS. Reuse, freshness and export permission are not stated. eGov's bus-route record is archived and last updated 2020 | **Partial:** ask geoportal owner for data-use terms, timestamps, stable IDs and downloadable extract |
| Current district polygons / approved planning layers | Astana geoportal FeatureServer services | A discoverable district service exposes six named district features; an older General Plan service exposes roads, public facilities and green areas. Dates, licenses and current legal status are not established | **Partial:** metadata and geometries are leads only; obtain authoritative vintage, CRS, rights and current approved layers |
| Traffic speed / volume | City Transport Department or CTS / bus operator; temporary manual/radar counts for pilot | No current public Astana street-level speed or exposure dataset verified in this pass | **Missing:** use a privacy-preserving manual counter/radar protocol or obtain city counters/aggregates |
| Crash / injury history | Astana Police / Prosecutor General Legal Statistics Committee; request aggregated geocoded records | Public legal-statistics source has regional/monthly aggregates, not street-level geocodes or exposure denominator | **Missing:** request 3–5 years of anonymized point/segment aggregates, severity, mode, timestamp and location precision |
| Crossings, signs, works and ownership | Transport/road owner; district maintenance and capital project registers | City legal open-data list names crossings, road projects and cameras, but that list is not proof of a current downloadable dataset. Public GIS has some supporting features, with no terms in service metadata | **Missing:** request current assets, planned works, road ownership and schedule; avoid exposing sensitive camera details |
| Resident feedback | School-family workshops, accessible multilingual survey, community/public council; optionally iKOMEK109 aggregated themes | Akimat reports iKOMEK109 processes requests and tracks service completion; individual case records are internal, sensitive operational data, and no open geocoded feed was verified | **Can collect locally:** recruit transparently and report who participated; ask only for privacy-safe aggregates from iKOMEK |
| Cost and delivery | Akimat project budget, procurement plan/contracts, road-owner unit costs and maintenance estimates | No intervention-specific local cost record verified | **Missing:** get capital + operating cost, procurement/works dates, responsible budget line, and maintenance owner |
| Population denominators | Bureau of National Statistics (BNS); WorldPop/GHSL only as labelled modeled context | BNS current city-level demographic tables are available. WorldPop's reviewed Kazakhstan product is a 2020 modeled 1 km grid, not current census at block scale | **Partial:** use BNS for context; request non-identifying school catchment/child-population aggregates for equity analysis |
| Weather / season covariates | Kazhydromet stations and operational records; Open-Meteo only for optional context | Kazhydromet operates national observations and states the AirKZ service covers air readings; WIS2 collections list surface meteorological observations. Need station-level completeness, use and reuse terms | **Partial:** log weather and school calendar in the evaluation; do not treat forecast/reanalysis as observed local exposure |
| Legal geography | Astana city GIS / geocadastre; Adilet legal acts; National Spatial Data Infrastructure catalogue | A public GIS service exposes six current district names, but its geometry vintage/authority and reuse rights are unverified; no approved crosswalk to the model's five synthetic district profiles exists | **Not needed for one school-site pilot:** use verified site/road geometries and avoid five-district joins. Required before district score mapping |

## Source cards

### 1. Astana geoinformation service — candidate roads, sidewalks and stops

- **Publisher/host:** Astana geoinformation portal (`gis.esaulet.kz`); exact layer owner should be confirmed with the portal operator.
- **Service:** [ArcGIS REST MapServer metadata](https://gis.esaulet.kz/server/rest/services/dop_sloi_geoportal_otkr/MapServer?f=pjson), [bus stops layer 2](https://gis.esaulet.kz/server/rest/services/dop_sloi_geoportal_otkr/MapServer/2), and [portal information page](https://www.gov.kz/memleket/entities/astana/activities/15951?lang=ru&parentId=360).
- **Verified layer metadata:** roads group; road axes (layer 12, polylines); road cover (13); stop points (2); underground crossings (3); sidewalks (6); stop/shelter polygon layers (8–10). Layer 2 exposes `NAME`, Russian/Kazakh names, city/region/KATO fields. The service has a custom local projected CRS in metres, GeoJSON/JSON/PBF query formats, and a 2,000-record service limit.
- **Limitations:** REST discoverability is not a licence. The service has no visible copyright text or per-feature update timestamp in the inspected metadata; stop records alone do not provide schedule/frequency. The extent and custom CRS need validation before joining to WGS84 assets.
- **Decision:** ask the portal operator for written permission to query, export, transform, cache, display, and redistribute the relevant layers; request source IDs, update dates, CRS definition, coverage, known quality issues, and a bulk extract. Until confirmed, use only as a discovery lead.

### 2. School register and education capacity

- **National school features:** [eGov state schools dataset](https://data.egov.kz/datasets/view?index=state_schools), [metadata endpoint](https://data.egov.kz/meta/state_schools/v1), [eGov API examples](https://data.egov.kz/pages/samples).
- **Fields observed in the portal record:** national organization ID, region/city/district codes and labels, address, coordinate text, latitude/longitude, organization type, learner count, establishment date and dataset-load date. Dataset endpoint is v4 and requires an API key.
- **Freshness caveat:** portal passport says weekly cadence but actuality status “No”; record creation/update dates shown are 2024-04-27. Do not assume the nominal cadence means it is being refreshed.
- **Current city totals:** [BNS Astana education dynamic tables](https://stat.gov.kz/ru/region/astana/dynamic-tables/1473/) show school counts, learner counts, teaching staff and early-childhood / school capacity series, with visible release dates in July 2026. These are city-level statistical time series, not point-level capacity or school catchments.
- **Request from Education Department:** authoritative school point/entrance layer with stable IDs, current enrolment and approved capacity by school/year, shift utilization, school catchments, school arrival/dismissal times, planned construction, and change history. Return only aggregate counts; no student names, addresses, IDs or individual trajectories.
- **Decision:** school feature locations can shortlist candidate sites after a current extract is checked. Do not infer school capacity or catchment from the national eGov record alone.

### 3. Transit records — catalog lead is stale

- [eGov Astana bus-route record](https://data.egov.kz/datasets/view?index=kalalyk_avtokolik_bagdarlary) is labelled archived, last updated 2020-12-15, and its description does not establish a GTFS feed or current geometry.
- [Kazakhstan legal open-data list](https://adilet.zan.kz/rus/docs/V18ABW01196) lists bus routes, crossings, road construction/repair and other city records with an annual publication expectation. This is a lead to ask about, not confirmation that current reusable data exists.
- **Request from CTS / Transport Department:** current GTFS Schedule (routes, stops, trips, stop times, calendars, timezone and feed validity); GTFS Realtime / automatic vehicle location if available; and aggregated passenger boardings/load by route and time. Request data dictionary, service period, outage/missingness flags, retention, privacy treatment and written reuse terms.
- **Pilot use:** transit data is a contextual factor around school arrival/dismissal and useful for a future bus-priority pilot. Do not use the stale catalog record for current service-frequency claims.

### 4. Traffic and road safety

- [eGov / Prosecutor General traffic crash statistics service](https://data.egov.kz/datasets/view?index=gp_od_service_dtp1) provides regional/monthly reporting; the existing audit found no street coordinates or exposure denominator in the documented output.
- **Request from Astana Police / Legal Statistics:** anonymized pedestrian/cyclist/vehicle crash records or road-segment aggregates for 3–5 years, with incident date/time, severity, mode, coordinates rounded to a safe precision, geocoding confidence, and definitions. Ask for a suppression policy for small counts.
- **Request from road owner / Transport Department:** road hierarchy, speed limits, signal phases if relevant, crossing inventory, traffic volumes, 85th percentile speed, work orders, resurfacing / signal changes, and dated asset updates for treatment and candidate comparison areas.
- **Fallback measurement:** commission a trained, independent enumerator to count vehicles, pedestrians and crossings/yielding behaviour in consistent time blocks. Use a non-imaging radar speed counter or aggregated sensor; avoid retaining identifiable video or number plates.
- **Interpretation:** crash history helps diagnose and select sites but short pilots should report leading indicators and confidence limits; do not claim reduced crashes from a small before/after count.

### 5. Air, weather and local environment

- **AirKZ / Kazhydromet:** [AirKZ service description](https://www.kazhydromet.kz/en/post/2929) says the app covers 70 localities and 170 posts; [2025 Astana station-network update](https://www.kazhydromet.kz/en/post/3021) says the capital had ten fixed posts, six automatic at 20-minute intervals, and the station network needed review because urban growth could make some sites less representative. [Kazhydromet monitoring overview](https://kazhydromet.kz/en/ecology/ob-ekologicheskom-monitoringe) and [WIS2 collections](https://wis2box.kazhydromet.kz/oapi/collections?f=html) document monitoring / meteorological API context.
- **Ask Kazhydromet:** current Astana station inventory and moves, pollutants, units, station method/type, timestamps, quality flags, missingness, historical export/API, use/redistribution terms. A monitoring map or mobile app is not an API licence. Don't interpolate a few monitors into a precise street-level AQ surface.
- **IQAir:** [API access and plan information](https://www.iqair.com/eu/support/knowledge-base/access-airvisuals-aqi-air-quality-and-pollution-api). Free API requires an API key and has plan-specific limits; verify whether Astana has station-level data and the permitted history/cache/use before relying on it. City AQI is not a school-level exposure measure.
- **Weather:** Kazhydromet observational station records are preferred for covariate control. Open-Meteo forecast/archive/reanalysis products are distinct modeled/contextual options; preserve issue time, valid time, grid support and product semantics per [existing source audit](docs/enrichment/weather/source-card.md). For this school-safety pilot, weather is a confounder to log, not an outcome or scoring input.

### 6. Boundaries, population and planned growth

- **Current administrative boundaries:** [Astana GIS information page](https://www.gov.kz/memleket/entities/astana/activities/15951?lang=ru&parentId=360), [National Spatial Data Infrastructure catalogue](https://map.gov.kz/catalogue/), and current legal instruments collected in [the boundary audit](docs/enrichment/boundaries/README.md). The audit reports six current administrative districts versus five synthetic model profiles and an unresolved split/reorganization around Almaty/Sarayshyq. Do not create a district-level real-data join until an owner supplies the authoritative boundary vintage and an approved crosswalk.
- **General Plan:** [consolidated Adilet text for Astana's General Plan to 2035](https://adilet.zan.kz/rus/docs/P2400000033) reflects Resolution No. 697 (2026), with a 2030 first stage and 2035 horizon. Ask the urban-planning authority for approved machine-readable plan layers, revision/effective date, stable layer IDs, georeferencing accuracy, implementation stage and reuse rights. Plan features are “planned”, not observed or committed delivery.
- **Population:** [BNS demographics](https://stat.gov.kz/en/industries/social-tatistics/demography/spreadsheets/) is authoritative for published aggregate population tables. [WorldPop Kazakhstan 2020 1 km surface](https://hub.worldpop.org/geodata/summary?id=31960) is a modeled estimate licensed CC BY 4.0, but is too old/coarse to represent current school catchments. GHSL products can be a separately labelled comparison; choose exact release/epoch before use. No raster changes synthetic `population_share`.
- **Decision:** a single school-site pilot can use verified site and street geometry without joining to the five legacy synthetic districts. Population layers are necessary for broader citywide equity/accessibility claims, not a gate for a tightly bounded site-level safety test.

### 7. OpenStreetMap as a fallback, not official ground truth

- [OpenStreetMap copyright and ODbL terms](https://www.openstreetmap.org/copyright); [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).
- Useful for road/path networks, mapped crossings, school POIs, parks and transit stop candidates. Coverage, completeness and edit dates vary; field-check critical site features. Attribute “© OpenStreetMap contributors” and assess ODbL for derivative databases. The public tile service is not a bulk data API or unrestricted production tile host.

### 8. Resident priorities and service requests

- [Astana iKOMEK109 service update](https://www.gov.kz/memleket/entities/astana/press/news/details/1278410?lang=ru) describes the city's internal iKOMEK 2.0 system, request lifecycle, deadlines and analysis. This verifies the existence of an operational dataset, not public access or permission to extract it.
- **Request from iKOMEK/city data steward:** monthly aggregate counts for relevant school-zone / road-safety categories, anonymized to a spatial unit approved by the privacy owner; include opened/closed dates, disposition and category taxonomy. Suppress low counts. Do not request messages, phone numbers, names, images, or exact household locations for this pilot.
- **Direct participation:** run accessible Russian/Kazakh engagement through school, parent groups and community councils. Publish recruitment method, number invited/participating, response rate, language, questions, and nonresponse limits. Do not label an opt-in survey or social-media posts as representative city opinion. Residents must be able to influence site choice and intervention design and see the response to their input.

### 9. Additional Astana GIS services — district boundaries and General Plan layers

- **Current district candidate:** [Astana geoportal `Hosted/raiony` FeatureServer](https://gis.esaulet.kz/server/rest/services/Hosted/raiony/FeatureServer) exposes a polygon layer named “Районы” and a local projected CRS in metres. The six names visible in the service are Алматы, Байкоңыр, Есіл, Нұра, Сарыарқа and Сарайшық.
- **Limitations:** the service metadata inspected does not establish the polygons' effective date, authoritative legal act, update history, stable administrative IDs, or reuse/export rights. This is a useful discovery lead, not approval to replace project geography or publish these shapes.
- **Older planning service:** [Astana geoportal `Hosted/gen_plan5` FeatureServer](https://gis.esaulet.kz/server/rest/services/Hosted/gen_plan5/FeatureServer) exposes layers for roads, parks, green areas, facilities and boundaries. Its service/layer metadata does not establish a current approved plan vintage; the “Nur-Sultan” layer names are an additional warning that this may be legacy material. Do not represent it as the currently effective General Plan without written confirmation.
- **School-zone planning lead:** [school coverage zones service](https://gis.esaulet.kz/server/rest/services/Hosted/Zony_pokrytiya_shkol/FeatureServer/1) is a separate candidate source. Confirm whether these are approved detailed-plan land-use zones or actual school catchments; do not treat them as enrolment boundaries without an owner and data dictionary.
- **Request:** authoritative current district geometry and IDs, legal effective date, all historical boundary vintages/crosswalks, CRS definition, service timestamps, layer owner, current General Plan and detailed-plan layers, and explicit terms for query/export, display, caching and redistribution. Preserve planning features as `planned`, not `observed`.

### 10. Public transport operations and real-time arrival data

- **Operational capability:** [CTS vehicle dispatching page](https://cts.gov.kz/ru/business/dispetcherizatsiya-transportnykh-sredstv/) describes monitoring schedules, vehicle dispatch/movement and service disruptions. This confirms an operational system exists, not that CTS offers an open API or grants project access.
- **Passenger-facing real-time lead:** the [Akimat's Avtobys QR announcement](https://www.gov.kz/memleket/entities/astana/press/news/details/690628?lang=ru) reported QR-based arrival predictions at 225 stops. It demonstrates a passenger-facing real-time service; it does not establish an API, historical archive or reuse licence.
- **Stale catalog lead:** [eGov's bus-location dataset](https://data.egov.kz/datasets/view?index=avtobustardyn_osy_uakyttagy_ko) describes vehicle positions/routes but is archived and dates from 2018. Do not use it as a current feed.
- **Request from CTS/Transport Department:** current GTFS Schedule and, if available, GTFS Realtime or vehicle-location feed; stop IDs/coordinates, route and trip IDs, timestamps, feed validity, outage flags, historical retention, aggregated passenger loads, API terms and permission to retain/display derived data. Include school arrival/dismissal windows only where relevant and never request passenger-level trajectories.

### 11. Budget and procurement evidence for costs and delivery

- [Open Budgets Kazakhstan](https://budget.egov.kz/) publishes budget-program materials and execution documents. Astana's published 2026 program passport is an entry point, for example [Akimat budget program 4329019](https://budget.egov.kz/arm/#/admin/budget-programs/list/published/budget-program/4329019).
- [Adilet's Astana 2026–2028 local budget act](https://old.adilet.zan.kz/kaz/docs/G25AAZ3524M) provides the approved legal budget context and program codes; check the latest amended version and language before extracting figures.
- The [national procurement plan registry](https://goszakup.gov.kz/ru/registry/plan) exposes buyer, item description, quantity, unit and total planned price, timing and status; [this Astana sidewalk-repair plan record](https://goszakup.gov.kz/ru/registry/show_plan/77944934/4132328) illustrates that a record may also include budget classification, delivery address and multi-year amounts.
- **How to use:** search by Astana road/transport/green-space owners and comparable intervention terms; follow plan items into tender, award, contract, amendments and acceptance records. Collect quantities, comparable unit prices, delivery dates, change orders, warranty and recurring operations/maintenance. A planned amount is not an award or final cost, and one record is not a reliable benchmark.
- **Decision:** require a city owner to validate scope and price comparability. Keep identifiable vendor/contract records in their public source context; do not infer a pilot's cost from general city expenditure.

### 12. Green-space registry and dendrological plans

- Astana's [green-space protection rules on Adilet](https://www.adilet.zan.kz/rus/docs/V04A000324_) (including amendments visible in the consolidated text) require inventory, a green-space registry and dendrological plans. The rules describe electronic and paper records, tree/species/condition information and periodic plan updates; the consolidated text includes a 2026 amendment. This establishes an institutional data lead, not a public download or a guaranteed complete city GIS layer.
- The [Akimat's environmental status page](https://www.gov.kz/memleket/entities/astana-upr/press/article/details/201674) offers citywide green-space context, but aggregate totals should not be mapped to neighbourhoods or treated as a current asset inventory.
- **Request from the responsible environment/green-space authority and district Akims:** latest dated GIS inventory and dendroplans; asset/tree ID, species, size/condition, planting or survey date, owner/maintainer, survival and maintenance history, planned works, and the inventory's coverage/completeness. Ask for a public-display and redistribution decision, and whether personal/private-land records must be excluded.
- **Potential value:** supports shade/heat, walking comfort and maintenance accountability. For a school-street pilot, use only verified nearby canopy/park context; do not claim tree-level condition or thermal exposure from an incomplete inventory.

## Data request pack (send through the city sponsor)

The sponsor should file written requests to the city GIS/geocadastre owner, Astana Transport Department/CTS, Education Department and school partner, Police/Legal Statistics, iKOMEK data steward, and procurement/finance owner. Each request should ask for:

1. The exact dataset/service, named data owner, purpose, stable IDs, data dictionary, units, coordinate reference system, update cadence, completeness, historic coverage, known errors and a named technical contact.
2. Written permission for project use, map display, derived aggregates, caching, retention, and redistribution (or an explicit “internal only” restriction). Ask separately for the right to export from GIS services.
3. A privacy-minimized extract for a defined geography and period. No person-level, child-identifiable, household-identifiable, or license-plate data.
4. A change log and planned road, school or transit works that could affect treatment or control sites during the evaluation.
5. For costs: approved budget line, procurement plan/contract, quantities, unit costs, operating and maintenance cost, procurement and delivery dates, responsible operator, and change-order history.
6. Data retention/deletion date, secure transfer method, access roles, incident contact, and whether the extract may be retained in a public Git repository (default: **no** for operational or sensitive data).

Do not place credentials, confidential extracts, citizen submissions, police incident records or child-linked records in `sources.md`, fixtures, Git, or frontend assets. Keep secrets only in approved server-side secret storage; keep restricted datasets in the city's governed environment.

## Site selection and study plan

Before naming a site:

1. Secure one accountable Akimat sponsor, school leadership, road/traffic engineer, data steward and community liaison; confirm which office can approve and maintain the intervention.
2. Have the school community identify access concerns in Russian and Kazakh; include children only through the institution's approved safeguarding/consent process. Make participation accessible to people with disabilities and different schedules.
3. Shortlist sites from reported concern + field inspection + current school location + road ownership, not a synthetic score. Exclude sites with concurrent road works or interventions that cannot be separated.
4. Select a physically and operationally similar comparison school/crossing not receiving the measure during the same period. Record why it is a reasonable comparison.
5. Have a qualified road-safety engineer approve temporary design, signage, emergency access, winter operations, accessibility and legal permissions before installation.

Minimum measurement protocol (final dates and duration depend on school term, weather and engineering schedule):

- **Before:** repeat counts at treated and comparison sites on matched school days/time windows, covering arrival and dismissal. Record vehicle volume and speeds, pedestrian/cyclist volume, yielding and crossing behaviour, temporary obstructions, weather, school calendar, transit disruptions and any concurrent works. Record baseline perception using a short anonymous survey/intercept designed with the community.
- **Intervention:** log exact treatment components, dates, hours, deviations, maintenance, operator and cost. Photograph only infrastructure with no identifiable people/plates, or use written consent and approved retention if images are essential.
- **After:** repeat exactly the same observation protocol at treatment and comparison sites, after a defined settling period; then follow up at roughly 3 and 6 months to test persistence and maintenance. Publish the dates and departures from plan.
- **Analysis:** pre-register primary outcomes (recommended: vehicle 85th-percentile speed and observed yielding rate), secondary outcomes (traffic volume, pedestrian volume/mode, anonymous perceived safety, accessibility/complaints), data exclusions, and comparison method. Report raw counts, denominators, missing data, effect estimate with uncertainty, comparison trend, weather/calendar context, and costs. A simple difference-in-differences can be descriptive for a small pilot; do not call it causal proof without adequate sites/data and a credible design. Crash outcomes require longer windows and an appropriate comparison/Empirical Bayes design when data support it.
- **Decision:** city sponsor and residents review results together, record whether to stop/adapt/scale, assign budget/owner, and publish response. The dashboard may prepare an evidence brief; it must not make the public investment decision autonomously.

## Data model and repository handling

For each acquired layer, create a source card and store only a cleared, minimal, reproducible extract. Include publisher/product/URL, accessed and source update dates, reference period, exact endpoint/query, API-key requirement (never key), license and redistribution decision, CRS, spatial/temporal support, field map, transformations/script version, source IDs, file hash, coverage/missingness, quality and semantic type (`observed`, `modeled`, `forecast`, `planned`, `survey`, or `administrative aggregate`).

Keep all sources additive under `backend/data/enrichment/<release>/` with a manifest. Do not edit `datadoc.md`, `backend/data/astana-v1.json`, the existing indicator values/weights or scoring behavior. Do not join real extracts to the five synthetic districts without a reviewed boundary vintage/crosswalk. Where data rights prohibit redistribution, commit retrieval instructions and provenance only, never the extract.

## Go/no-go gates

- **GO for planning/site reconnaissance:** BNS aggregate stats, public GIS service metadata, candidate school register, legal plan references, and field/community discovery, all marked with limitations.
- **GO for the actual pilot only after:** site and intervention permissions; current validated school/road data; pre/post observation resources; comparison site; community involvement; engineer and maintainer; privacy/data-use approval; costs and maintenance; pre-specified measures and publication plan.
- **NO-GO for claims of citywide impact:** current boundary crosswalk unresolved, population is not available as current small-area observed data, traffic/crash/service data are not public at suitable spatial scale, and the existing QOL score is synthetic.
- **NO-GO for scoring integration:** no new real layer feeds the current score. Any future calibration requires a separate, versioned methodology and review.

## Sources checked

Official/local sources checked on 2026-09-23:

- [Astana GIS ArcGIS REST service](https://gis.esaulet.kz/server/rest/services/dop_sloi_geoportal_otkr/MapServer?f=pjson) and [bus-stop feature-layer metadata](https://gis.esaulet.kz/server/rest/services/dop_sloi_geoportal_otkr/MapServer/2).
- [Astana geo-information portal description](https://www.gov.kz/memleket/entities/astana/activities/15951?lang=ru&parentId=360); [Kazakhstan NSDI catalogue](https://map.gov.kz/catalogue/).
- [Current six-district candidate FeatureServer](https://gis.esaulet.kz/server/rest/services/Hosted/raiony/FeatureServer); [older General Plan FeatureServer](https://gis.esaulet.kz/server/rest/services/Hosted/gen_plan5/FeatureServer); [school coverage zones service](https://gis.esaulet.kz/server/rest/services/Hosted/Zony_pokrytiya_shkol/FeatureServer/1).
- [eGov state-schools record](https://data.egov.kz/datasets/view?index=state_schools); [eGov v4 API examples](https://data.egov.kz/pages/samples); [BNS Astana education tables](https://stat.gov.kz/ru/region/astana/dynamic-tables/1473/).
- [eGov Astana bus routes archived record](https://data.egov.kz/datasets/view?index=kalalyk_avtokolik_bagdarlary); [legal open data list](https://adilet.zan.kz/rus/docs/V18ABW01196).
- [CTS vehicle dispatching](https://cts.gov.kz/ru/business/dispetcherizatsiya-transportnykh-sredstv/); [Akimat Avtobys real-time QR announcement](https://www.gov.kz/memleket/entities/astana/press/news/details/690628?lang=ru); [archived bus-location dataset](https://data.egov.kz/datasets/view?index=avtobustardyn_osy_uakyttagy_ko).
- [Open Budgets Kazakhstan](https://budget.egov.kz/); [Astana 2026–2028 local budget act](https://old.adilet.zan.kz/kaz/docs/G25AAZ3524M); [state procurement plan registry](https://goszakup.gov.kz/ru/registry/plan) and [Astana sidewalk-repair example](https://goszakup.gov.kz/ru/registry/show_plan/77944934/4132328).
- [Astana green-space rules, consolidated Adilet text](https://www.adilet.zan.kz/rus/docs/V04A000324_); [Akimat environmental status page](https://www.gov.kz/memleket/entities/astana-upr/press/article/details/201674).
- [Astana current state polyclinics record](https://data.egov.kz/datasets/view?index=317_list_of_state_polyclinics) (published/yearly, marked current, updated 2026-06-30; no API/data link surfaced in the inspected passport).
- [BNS demographic spreadsheets](https://stat.gov.kz/en/industries/social-tatistics/demography/spreadsheets/); [WorldPop Kazakhstan 2020 grid](https://hub.worldpop.org/geodata/summary?id=31960).
- [Kazhydromet AirKZ note](https://www.kazhydromet.kz/en/post/2929); [Astana monitoring-station network update](https://www.kazhydromet.kz/en/post/3021); [WIS2 API collections](https://wis2box.kazhydromet.kz/oapi/collections?f=html).
- [Astana General Plan (consolidated Adilet text)](https://adilet.zan.kz/rus/docs/P2400000033); [iKOMEK109 city system announcement](https://www.gov.kz/memleket/entities/astana/press/news/details/1278410?lang=ru).
- [FHWA pedestrian/bicyclist evaluation guide](https://www.fhwa.dot.gov/publications/research/safety/pedbike/11035/009.cfm); [UN-Habitat participation toolkit](https://unhabitat.org/enabling-meaningful-public-participation-in-spatial-planning-processes); [UN-Habitat Our City Plans](https://unhabitat.org/our-city-plans-an-incremental-and-participatory-toolbox-for-urban-planning).
- [OpenStreetMap copyright / ODbL](https://www.openstreetmap.org/copyright); [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).

Related repository work: [enrichment status](docs/enrichment/README.md), [boundary audit](docs/enrichment/boundaries/README.md), [urban-quality source audit](docs/enrichment/urban-quality/README.md), [weather audit](docs/enrichment/weather/source-card.md), [population/terrain audit](docs/enrichment/population-terrain/research.md), [civic evidence map](docs/enrichment/civic-evidence-map.md), [pilot-independent map plan](QGIS_Plan.md), [PRD](PRD.md), and [DataDoc](datadoc.md).
