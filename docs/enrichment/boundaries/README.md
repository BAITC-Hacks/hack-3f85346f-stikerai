# Boundaries and General Plan source audit

**Audit date:** 2026-09-23
**Status:** research complete; geometry export/reuse and baseline crosswalk are blocked pending owner confirmation.
**Baseline codes:** `esil`, `almaty`, `saryarka`, `baikonur`, `nura` (synthetic, immutable).

## Decision

Do not ship district polygons or a joined district context layer yet. Official
Astana material identifies six current administrative districts, adding
Sarayshyq (Сарайшык) to the five districts represented by the baseline. The
city's February 2025 passport reports 69.6 km² for Sarayshyq and 85.2 km² for
Almaty; this indicates a split/reorganization of Almaty, not an alias that can
be safely mapped back to the old synthetic `almaty` row. No defensible
one-to-one current-boundary crosswalk to the five synthetic rows can be made
from names alone.

The city government describes a geo-information portal that displays city and
district boundaries and planning documents. Its public information page does
not document a downloadable boundary dataset, feature service, source IDs,
coordinate system, or open redistribution license. The GIS viewer itself is
not a reuse grant. The Kazakhstan NSDI portal describes its catalogue as open
geospatial data, but the accessible catalogue landing page did not identify a
specific Astana district-boundary resource or its terms. Therefore this packet
contains no geometry and no screenshot-derived/digitized shape.

The current legal General Plan remains Government Resolution No. 33 of 25
January 2024, but Government Resolution No. 697 of 4 August 2026 amended it,
effective 8 August 2026, by replacing the plan text with a new edition. Use the
amended/consolidated legal edition for current analysis; the original 2024 text
is not the current plan. The horizon remains 2035, with 2030 as the first
stage. The plan's legal status is distinct from the status of any map sheet:
obtain the approved annex/source GIS layers and written reuse terms before
publishing a planned infrastructure overlay.

## Crosswalk proposal (not approved)

| Synthetic code | Synthetic name | Current administrative name candidate | Match | Confidence / action |
| --- | --- | --- | --- | --- |
| `esil` | Есиль | Есиль | name candidate | Low for geometry identity until source IDs and boundary vintage are supplied |
| `almaty` | Алматы | Алматы + Сарайшык? | split/reorganization suspected | **Blocked.** Do not merge or assign Sarayshyq without knowing the synthetic baseline's boundary vintage and intended aggregation rule |
| `saryarka` | Сарыарка | Сарыарка | name candidate | Low for geometry identity pending official IDs/vintage |
| `baikonur` | Байконур | Байқоңыр / Байконыр | transliteration/name candidate | Low for geometry identity pending official IDs/vintage |
| `nura` | Нура | Нұра / Нура | transliteration/name candidate | Low for geometry identity pending official IDs/vintage |
| — | — | Сарайшык | no baseline row | Unmatched current unit; requires explicit policy (new dataset version, parent aggregation, or exclude current district boundaries) |

Do not derive historical five-district polygons by dissolving current
Almaty+Sarayshyq: without the precise legal boundary history and synthetic
baseline vintage, that operation may not reconstruct the modeled geography.
Do not allocate the old Almaty indicators/population share to the new units.

## Evidence and next actions

1. Ask Astana's architecture/urban-planning/geocadastre authority for (a) the
   authoritative current district boundary export, (b) historical boundary
   version matching the synthetic baseline if one exists, (c) stable district
   IDs and Kazakh/Russian names, (d) CRS and effective dates, and (e) explicit
   terms covering transformation, redistribution, and web display.
2. Ask for approved machine-readable General Plan map layers or vector annexes,
   layer metadata and revision/effective date, and reuse terms. If only PDF/map
   sheets can be supplied, use them as non-georeferenced planning context with
   attribution only if permitted; do not digitize as authoritative geometry.
3. Once data and terms arrive, make a reviewed crosswalk with source IDs,
   boundary vintage, match method, geometry validity, city-boundary coverage,
   overlap/gap checks, and explicit treatment for Sarayshyq.
4. Only then create a separately versioned geometry package. Keep the source
   extract and transformations traceable; do not change the baseline JSON,
   `datadoc.md`, population shares, or score inputs.

## General Plan use

Use the approved plan to describe **planned** city context, separate from
existing assets and observations. The legal plan includes a first-stage 2030
column and a 2035 design horizon. Do not turn a colored proposal on a PDF into
a precise route, facility point, or implementation probability. Every future
plan layer needs its own source sheet/layer identifier, plan revision,
georeferencing method/accuracy, implementation stage, and license/reuse
decision. Keep planned transport, housing, utilities, and green-space layers
off the QoL score unless separately reviewed in a future dataset version.

## Sources (checked 2026-09-23)

- [Astana geo-information portal page](https://www.gov.kz/memleket/entities/astana/activities/15951?lang=ru&parentId=360): states the portal displays city, district, and rural district boundaries and publishes city master plans/detail plans; page does not expose a boundary download or reuse terms.
- [Astana GIS viewer](https://gis.esaulet.kz/portal/apps/experiencebuilder/experience/?id=b9f6d12fcdc644f6944a96d5c42b915f): viewer only in this audit; no inspectable export metadata/terms found. Not used as a data source.
- [Kazakhstan NSDI Geoportal](https://map.gov.kz/catalogue/): official catalogue landing page describes open geospatial data, but no specific Astana district feature resource and license record were found in the accessible catalogue view.
- [Astana city passport, 1 February 2025](https://www.gov.kz/memleket/entities/astana/documents/details/801996?lang=ru): reports six districts and their areas, including Almaty 85.2 km² and Sarayshyq 69.6 km².
- [Astana district boundary amendment, 13 May 2025](https://www.adilet.zan.kz/rus/docs/V25AAZ14100): legal record amending the 2022 joint act that formed a new district and set/revised district boundaries; retrieve the official annex and its map/effective-date detail before geometry work.
- [Government Resolution No. 33, 25 January 2024 (Adilet)](https://adilet.zan.kz/rus/docs/P2400000033): original approval of Astana's General Plan through 2035; superseded as the current plan text by the 2026 amendment below.
- [Government Resolution No. 697, 4 August 2026 (Adilet)](https://adilet.zan.kz/rus/docs/P2600000697): current amendment, effective 8 August 2026, replaces the plan text with a new edition. The plan horizon remains 2035, with 2030 as the first stage. Adilet's web viewer requires JavaScript, so retain the official signed amendment, replacement plan, and annexes for final legal-version verification.
- [Astana official General Plan summary](https://www.gov.kz/memleket/entities/astana-saulet/press/news/details/687546?lang=ru): city-level summary of the approved plan.
- [Astana General Plan public document set (government ecology hearings)](https://hearings.ndbecology.gov.kz/Disscusion/DisHearings/LoadFile/168432): project documentation/album surfaced in official public-hearing search; not treated as a reusable authoritative GIS export.

This is an audit of publicly reachable source pages, not a legal opinion or
owner confirmation. No geometry files are included because neither an
authoritative, machine-readable boundary export nor redistributable terms were
verified, and the five-to-six-unit crosswalk is unresolved.
