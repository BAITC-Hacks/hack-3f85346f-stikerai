# Population, built-up, and terrain source audit

Status: **research complete for source selection; no GIS extracts integrated**

Date checked: 2026-09-23

## Purpose and boundary

This workstream looks for spatial context to render and describe population
distribution, built-up form, and terrain. It does not revise the synthetic
population shares or any of the ten indicators in `datadoc.md` and
`backend/data/astana-v1.json`. No source pixels are treated as block-level
census observations.

## Candidate comparison

| Source | Product/scale | Use in this project | Assessment |
| --- | --- | --- | --- |
| [WorldPop Kazakhstan population](https://hub.worldpop.org/geodata/summary?id=31960) | Kazakhstan 2020 modeled population surface, 100 m pixels | Optional side-by-side population context for map/profiles; zonal sums may be reported only as a distinct modeled estimate | Best resolution among the reviewed open candidates. The specific catalogue record is for 2020 and is modeled, so it is not current 2026 census truth. CC BY 4.0 is reported for WorldPop datasets; retain product citation, exact filename, method, period, and attribution. Download and checksum a clipped city sample only after license and data coverage are checked. |
| [GHSL population grids](https://human-settlement.emergency.copernicus.eu/datasets.php) | GHSL R2023 includes multi-epoch population products down to 100 m; the later R2025 WUP long-range population projection is available at 1 km / 30 arcsec for 1975–2100 | Independent model comparison and growth-context alternative; keep observed/reconstructed years distinct from projections | Useful independent method, but product releases/resolutions are not interchangeable. Select exact product/epoch before extraction. R2025 WUP is long-range projection output, not an Astana General Plan implementation forecast. EU reuse requires acknowledgment. |
| [Copernicus DEM GLO-30 / GLO-90](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | Global elevation grids, nominal 30 m and 90 m | Broad terrain visualization, slope context, preliminary drainage-flow screening only | Data is not a current surface survey and is not an urban drainage model. CDSE access documentation changed in 2026: public users may need registration/acceptance, while GLO-30 service access is restricted by user category. Check actual download rights and redistribution terms at acquisition; prefer GLO-90 if its free/open terms fit and 90 m is adequate. |
| [Astana General Plan through 2035](https://adilet.zan.kz/rus/docs/P2400000033) | Legally approved plan, with a 2030 first construction stage and 2035 design horizon | A separately styled planned-development layer or explanatory project facts after spatial source becomes available | Legal text is not feature geometry. The Adilet text records an amendment dated 2026-08-04; resolve the current effective revision before extracting any figures or boundaries. Do not digitize a PDF map and present it as survey-grade infrastructure. |
| [Google Satellite Embedding V1 / AlphaEarth Foundations](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL) | Global annual 10 m pixels, each a 64-dimensional embedding; catalog currently spans 2017–2024 | Research candidate for classifying land cover / built-up changes or identifying places for local map review, if training/validation labels are available | Embedding channels are learned, dimensionless features, not interpretable measures like trees, population, park access, or construction. Requires Earth Engine access and task-specific labels/classifiers. CC BY 4.0 attribution is specified for the catalog, but verify platform/export/computation terms and local performance before packaging. Do not infer indicator scores from embedding similarity alone. |

## Findings and limits

1. WorldPop offers an appropriately fine **modeled** surface for 2020. Its 100 m cells are suitable for a map overlay or carefully labeled comparison, not a replacement for the five synthetic district population shares. The WorldPop catalogue identifies the product as population estimates, gives the year, and states CC BY 4.0.
2. GHSL offers a second independent population/built-up family. Use a matching epoch and product if comparing with WorldPop; avoid combining products until differences in reference year, input census, and modeling method are understood. GHSL's 2023 and 2025 products differ in projection and resolution.
3. A 30/90 m DEM is useful for broad landform context. It cannot represent storm sewers, curb elevations, culverts, snow clearing, or engineered flood pathways. Any rainfall/runoff layer needs drainage-network inputs and local validation, which are not yet identified.
4. The General Plan's legal text supports a planned layer's provenance and horizon, but this audit did not establish an openly downloadable, machine-readable spatial layer for proposed roads, parks, or development parcels. Obtain written/open reuse terms and source geometry before implementing that overlay.
5. AlphaEarth Foundations' Satellite Embedding product is an interesting 10 m land-surface representation for a future labeled mapping experiment, not a ready-to-use land-cover map. The catalog says the 64 dimensions should be treated together and provides annual versions from 2017 through 2024. Classification requires local ground-truth or authoritative labels, spatially held-out validation, and an explicit license/access review. It cannot solve the missing district boundary vintage/crosswalk.
6. The current synthetic grid is only a display subdivision of five district rows. Repeating district profiles over cells is not population disaggregation; do not multiply district metrics by the number of cells.

## Safe output proposal

Keep eventual files in the companion package, separately from the baseline:

```text
backend/data/enrichment/astana-context-v1/population-terrain/
  manifest.json
  population_worldpop_2020_100m.tif  # if redistribution permits
  population_ghsl_<product>_<epoch>.tif  # optional independent comparison
  elevation_<product>_<resolution>.tif  # only after access/license check
  district_context.csv
```

The sidecar manifest should record source/product ID, original and clipped-file
hashes, retrieval date, epoch, CRS, pixel resolution, unit, nodata handling,
license/attribution, zonal-statistic method, boundary version, and a `modeled`
or `projection` flag. Keep raw source extract location/checksum only if
redistribution is not allowed. Keep each source as its own layer; no pixel
values are added to the main JSON.

## Processing recipe after permission and extraction

1. Freeze hashes of the current baseline files (owned by the integration lead).
2. Retain the provider raster unmodified and record product release/filename.
3. Obtain an independently licensed city/district boundary and exact district
   crosswalk from the boundaries workstream. Never use the synthetic district
   shares to spatially allocate a raster.
4. Clip a working copy in QGIS/GDAL in a metric CRS; preserve the provider CRS
   and resampling/warping parameters. Use appropriate population-preserving
   `sum`/area-weighted aggregation when changing raster resolution; do not use
   bilinear interpolation on population counts.
5. Produce descriptive district totals/densities with explicit reference year,
   boundary version, pixel inclusion rule, and coverage. Compare to published
   city/district aggregate totals only where those official totals share the
   same year and definition.
6. If the result is partial or hard to validate, keep it as a visible
   contextual raster and omit derived district numbers.
7. Review every layer's license and user-facing attribution before packaging.

## Agent handoff / go-no-go

- **Go** for a clipped 2020 WorldPop layer only after downloading the exact
  catalogue product, confirming the Kazakhstani coverage and CC BY attribution,
  and matching it to the approved district geometry.
- **Go** for a GHSL comparison only with its own product name, epoch, modeled
  status, and distinct symbology.
- **Conditional** for Copernicus DEM: verify current user eligibility and terms
  first; use only for general terrain context.
- **No-go pending source geometry/rights** for digitized 2030/2035 planned
  infrastructure; retain legal plan facts as citations/text context meanwhile.
- **No-go** for replacing `population_share`, creating census-like cell counts,
  or treating terrain/precipitation as a validated flood prediction.
