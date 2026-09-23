"""Read-only contextual city data sourced from published open datasets."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/context", tags=["city-context"])
SCHOOLS_FILE = Path(__file__).resolve().parents[2] / "data" / "enrichment" / "astana-context-v1" / "osm" / "schools.geojson"


@router.get("/schools", response_class=FileResponse)
def get_mapped_schools() -> FileResponse:
    """Return a dated OSM snapshot; these features are context, not official records."""
    if not SCHOOLS_FILE.is_file():
        raise HTTPException(status_code=503, detail="The mapped-schools snapshot is unavailable")
    return FileResponse(
        SCHOOLS_FILE,
        media_type="application/geo+json",
        headers={"Cache-Control": "public, max-age=3600"},
    )
