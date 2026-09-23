"""Authenticated gateway boundary for optional exploratory MiroFish runs.

The endpoint is disabled unless explicitly enabled in deployment settings.
It accepts only a reviewed aggregate brief; it has no connector to social
platforms or the Public Signals fixtures.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.api.simulator import owner, write_guard

from app.services.mirofish import (
    ExploratoryResult,
    MiroFishAdapter,
    MiroFishConfigurationError,
    MiroFishDisabledError,
    MiroFishError,
    MiroFishGatewayError,
)

router = APIRouter(prefix="/mirofish", tags=["mirofish"])


@router.get("/capability")
def get_capability() -> dict[str, object]:
    """Report local integration configuration without probing a remote host."""
    return MiroFishAdapter().capability()


@router.post("/scenario", response_model=ExploratoryResult,
             dependencies=[Depends(owner), Depends(write_guard)])
def run_scenario(payload: dict[str, object]) -> ExploratoryResult:
    """Submit reviewed aggregate evidence to the configured gateway, if enabled."""
    try:
        return MiroFishAdapter().submit(payload)
    except MiroFishDisabledError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    except MiroFishConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    except MiroFishGatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None
    except MiroFishError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
