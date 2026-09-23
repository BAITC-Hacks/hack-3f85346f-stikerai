from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.mirofish import router as mirofish_router
from app.api.public_signals import router as public_signals_router

app = FastAPI(title="StikerAI API", version="0.1.0")
app.include_router(health_router, prefix="/api")
app.include_router(public_signals_router, prefix="/api")
app.include_router(mirofish_router, prefix="/api")
