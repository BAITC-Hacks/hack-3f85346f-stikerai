# QGIS plan: Astana district grid

## Purpose

Add a lightweight map layer to the simulator so users can compare the five
Astana districts and see where their decisions are targeted. The existing
`astana-synthetic-v1` dataset contains five district-level profiles and no
measured values below district level. The grid is therefore a visual
subdivision of district areas, not a new source of finer-grained indicators.

The current frontend is still a connection-check placeholder. This plan defines
the map data contract for the future scenario and evaluation screens; it does
not assume that a map UI already exists.

## Recommended first version

- Use the five district polygons as the authoritative units for selection,
  statistics, and reporting.
- Generate a **500 m square grid**, clipped to Astana's city boundary and
  assigned to a district by the cell centroid. This is enough visual detail to
  give the map texture without presenting each cell as an independently
  measured neighborhood.
- Give every cell the values of its parent district. Repeated values must be
  described as district-level estimates and must never be summed across cells.
- Render district outlines above the grid. Selecting any cell selects its
  parent district; district names, scores, and indicator details remain the
  primary information shown in the UI.
- Keep the initial export small and static. Do not add PostGIS or a GIS service
  for this five-district demo.

If the grid looks too dense at the intended map size, use a 1 km cell size.
Cell size is a display choice, not the resolution of the underlying data.

## QGIS preparation

1. Obtain a district-boundary layer for Astana with a source, date, and license
   recorded in the project. Confirm that the boundary names/codes match the
   dataset codes: `esil`, `almaty`, `saryarka`, `baikonur`, and `nura`.
2. Reproject boundaries to a suitable **projected metric CRS** before creating
   the grid. Record the CRS name and EPSG code in the export metadata; do not
   create a 500 m grid in latitude/longitude coordinates.
3. Repair invalid geometries if needed, dissolve duplicate features by district
   code, and check for gaps/overlaps. Clip the five districts to the city
   boundary if the source includes areas outside the modeled city.
4. Create a 500 m square polygon grid over the city extent. Clip it to the city
   boundary and join each cell to the district containing its centroid.
5. Exclude cells whose centroid falls outside the five modeled districts. Keep
   partial edge cells; their geometry is clipped and their parent district is
   still determined by the centroid.
6. Join the grid to the district dataset using the stable district code. Add
   baseline and scenario indicator/score attributes from the simulator, not
   hand-entered copies in QGIS.
7. Export district polygons and grid cells as GeoJSON in WGS 84 (EPSG:4326) for
   direct browser rendering. Preserve a QGIS project and the original licensed
   boundary source separately for reproducibility.

## UI fit

Use the map as a shared district selector/context panel beside the five
initiative decisions. On evaluation, reuse the same geometry and switch the
displayed values from baseline to evaluated results.

- **District selection:** clicking a district outline or one of its cells sets
  the district for district-scoped initiatives. City-scoped initiatives remain
  untargeted.
- **Scenario feedback:** highlight districts receiving selected initiatives;
  distinguish city-wide measures with a city-level badge or legend entry.
- **Evaluation:** color districts by their district score or a selected metric.
  Provide a metric selector and a clear baseline/result state. Keep the score
  and exact values in a district detail panel or tooltip.
- **Accessibility:** provide a matching district list/table for keyboard use,
  and do not rely on color alone to communicate values.
- **Small screens:** collapse the map behind a “Map” tab or panel; keep the
  decision controls usable without panning the map.

The synthetic dataset's five baseline records and population shares remain the
statistical source of truth. The map must not recalculate the Astana Quality of
Life Score; it displays values returned by the existing deterministic scoring
service.

## GeoJSON contract

Ship two `FeatureCollection` files (or one collection with a `layer` field):

### District features

Properties:

| Field | Meaning |
| --- | --- |
| `district_code` | Stable key matching the dataset (`esil`, etc.) |
| `district_name` | Display name in Russian |
| `population_share` | Existing synthetic dataset share |
| `data_version` | For example, `astana-synthetic-v1` |

### Grid cell features

Properties:

| Field | Meaning |
| --- | --- |
| `cell_id` | Stable identifier generated from the grid |
| `district_code` | Parent district; foreign key to a district feature |
| `data_version` | Dataset version supplying the copied indicators |

Do not bake baseline metric values into the geometry export. Join metrics and
current scenario results by `district_code` at runtime. If static properties
are needed for a prototype, include a `resolution_note` stating that values are
district aggregates repeated over display cells.

## Data and visual safeguards

- Current values are explicitly synthetic, as noted in
  `backend/data/astana-v1.json`; show a visible “Синтетические данные” label.
- A district-level score repeated over cells does not imply block-level
  accuracy. Avoid heatmap language, cell-level rankings, or claims that an
  initiative affects only the specific cells it covers.
- For city-wide initiatives, display city-wide scope and do not imply that the
  district grid represents a spatially modeled impact.
- Keep population weighting at the district level. Never weight a district by
  the number or area of grid cells.
- Treat the grid as optional presentation geometry. The simulator must still
  work if map files fail to load.

## Deliverables and acceptance checks

1. A QGIS project with documented source, license, CRS, processing steps, and
   layer names.
2. `districts.geojson` and `grid_500m.geojson` (or equivalent versioned assets)
   with valid geometries and matching district codes.
3. A UI map that lets users select one of the five districts and see the same
   baseline/result values as the district list and API response.
4. A visible synthetic-data notice and a legend that makes the district-level
   data resolution clear.
5. A fallback district list when map assets are unavailable.

No finer indicator data should be introduced until a defensible source exists
at that resolution. At that point, replace the repeated district values with
documented spatial estimates and version the dataset separately.
