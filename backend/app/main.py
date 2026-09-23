from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.map import router as map_router
from app.api.mirofish import router as mirofish_router
from app.api.public_signals import router as public_signals_router
from app.api.scenarios import router as scenarios_router
from app.api.simulator import router as simulator_router
from app.services.scenarios import ScenarioError

app = FastAPI(title="StikerAI API", version="0.1.0")
app.include_router(health_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")
app.include_router(public_signals_router, prefix="/api")
app.include_router(mirofish_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")
app.include_router(map_router, prefix="/api")

ERRORS = {
    "Budget exceeded": ("BUDGET_EXCEEDED", "Превышен бюджет сценария."),
    "Repeated initiatives are not allowed": ("DUPLICATE_INITIATIVE", "Мероприятие можно выбрать только один раз."),
    "At most two initiatives per direction are allowed": ("DIRECTION_LIMIT", "Можно выбрать не более двух мероприятий одного направления."),
    "Exactly five decisions are required for submission": ("DECISION_COUNT", "Для анализа выберите ровно пять мероприятий."),
    "Incompatible initiatives in the selected scope": ("INITIATIVE_CONFLICT", "Выбранные мероприятия несовместимы в указанных районах."),
    "District initiative requires a district from the same dataset": ("DISTRICT_REQUIRED", "Выберите район из текущего датасета."),
    "City initiatives must not specify a district": ("CITY_TARGET", "Для городского мероприятия район не указывается."),
    "Only draft scenarios can be edited or submitted": ("SCENARIO_LOCKED", "Сценарий завершён. Создайте копию для изменений."),
}


@app.exception_handler(ScenarioError)
async def scenario_error(_, error):
    code, message = ERRORS.get(str(error), ("INVALID_PLAN", str(error)))
    return JSONResponse(status_code=422, content={"detail": {"code": code, "message": message}})


@app.exception_handler(RequestValidationError)
async def invalid_request(_, error):
    return JSONResponse(status_code=422, content={"detail": {"code": "INVALID_REQUEST", "message": "Проверьте поля запроса."}})
