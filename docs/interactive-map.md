# Interactive Astana map

The first map release adds MapLibre to the existing React application. Open
«Районы Астаны» above the initiative portfolio, then «Открыть карту». The renderer
loads on demand. Six bundled OSM district polygons work without a tile service;
enable «Улицы · OpenFreeMap» to load the street basemap. No street measurements,
project footprints, geocoding or street selection are implied by those tiles.

Select a polygon or use the keyboard-accessible district dropdown. A separate
model district selector exposes synthetic metrics, before/after/change values,
and assignment of a target district to an initiative. Assigning a district to an
already selected initiative uses the same revision-checked save API as the
portfolio. Assigning a target to an unselected initiative does not add it. Draft
targets are persisted when the initiative is selected. Completed scenarios are
read-only; map navigation never modifies a calculation.

## Data and correspondence

`GET /api/map/districts?dataset_id=UUID` returns a typed GeoJSON FeatureCollection,
boundary version, retrieval date, attribution and explicit mapping status. It
does not return private scenario information. Results still come from the
existing session-owned APIs; the map uses the same calculation as the dashboard.

The bundled geometry is a snapshot retrieved on 2026-09-23 from OSM's public
relation/full.json endpoint. It is community mapping, not cadastral geometry or
an assertion of the legally effective boundaries on that date. Individual
relation modification dates, versions, download URLs and input SHA256 hashes are
recorded in `backend/data/geography/sources.json`. The snapshot has not been
checked against the official cadastral boundaries. The import assembles complete
outer rings without inventing or simplifying boundaries, retaining disconnected
parts. It refuses unsupported members or open rings.

Boundary data is © OpenStreetMap contributors, distributed under
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
[Attribution and licensing](https://www.openstreetmap.org/copyright).
This applies to the boundary dataset, not to the application code or synthetic
metrics. Attribution and a GeoJSON download are visible in the application.

`crosswalk.json` is keyed by both boundary version and simulation dataset version.
The current five synthetic districts have **unverified** same-name candidates.
Their data has no known boundary vintage, so candidate IDs may open a separate
model inspector but **never supply polygon colours**. Saraishyq has no row in
the simulation; it remains missing and receives no copied Almaty values.
Unrecognised dataset versions get no mappings. This is deliberate: a name match
does not establish that population shares or indicators describe the same area.

To activate a polygon's numerical colours, add a reviewed `verified` crosswalk
entry with a dataset district code, evidence URL and explanatory note. First
establish the dataset's geographic coverage and boundary vintage. A reference
URL or status flag alone is not a substantive geographic review. Version the
dataset if its inputs or geography change; preserve existing saved scenarios.
Restart the API after updating the snapshot/crosswalk (they are process-cached).

The colour scale is fixed: below 40 / 40–60 / 60 and above; change uses negative,
zero and positive. No matching data is always grey, distinct from zero change.
After/change controls require a current server calculation, and immediately
return to baseline if an edit invalidates the preview. Coloured model comparison
cards remain available even while the geographic crosswalk is unverified.

## Configuration and maintenance

`VITE_MAP_STYLE_URL` defaults to OpenFreeMap's Positron style. It is a public
browser configuration value, read at Vite startup/build. The street layer is
optional; the map does not request geolocation. Provider errors leave the local
boundaries and accessible controls available. Configure another public style or
self-host tiles when needed. [OpenFreeMap setup](https://openfreemap.org/quick_start/).

To rebuild the snapshot, download the six `download_url` entries in sources.json
as `astana-osm-RELATION_ID.json`, then run from `backend`:

```sh
python scripts/import_osm_boundaries.py /path/to/downloads --retrieved-at YYYY-MM-DD
```

Review geometry and metadata; add a crosswalk for the new boundary version.
Do not copy verified statuses without checking boundary changes. The first
release stores this small read-only layer in version-controlled GeoJSON and
does not require PostGIS or a database migration. The existing PostgreSQL image
and SQLite tests continue to work. Once editable streets, project footprints or
spatial observation queries are introduced, move those features into PostGIS
with GiST indexes and viewport-filtered endpoints. Location selection will then
need explicit persisted geometry and validation, beyond the current district-only
Decision model.

## Checks

API tests cover geometry/ring integrity, missing datasets, unmatched districts,
evidence requirements and version isolation. Browser tests cover real WebGL
rendering without external tiles, a failed tile provider, mobile width, district
assignment, save/reload and before/after values from the server. Existing scoring
and scenario tests remain in place. Real external tiles require a network and
are not a dependency of deterministic tests.

MapLibre's worker is explicitly bundled with Vite's `?worker&url` import for
both development and production. Browser tests use software WebGL for consistent
rendering without a GPU. After `npm run build`, set `E2E_PREVIEW=true` and run
`npx playwright test e2e/map.spec.ts` to exercise the built assets with the same
temporary API, rather than Vite's development server.
