# StikerAI

FastAPI + React/TypeScript + Vite + PostgreSQL + Docker Compose.

Модель данных по `PRD.md`: [описание сущностей и правил](docs/data-model.md).
Python-модели: `backend/app/models.py`, API-схемы: `backend/app/schemas.py`,
типы frontend: `frontend/src/types/domain.ts`.

## Запуск

Нужен Docker с Compose v2 (Windows: Docker Desktop, Linux containers).

```sh
docker compose up --build
```

Compose автоматически поднимает PostgreSQL, применяет миграции, загружает
демонстрационный набор `astana-v1` и только затем запускает backend. Для AI
объяснения скопируйте `.env.example` в `.env` и задайте `OPENAI_API_KEY`;
ключ передаётся только backend и не требуется для детерминированного preview.
Без ключа AI-анализ вернёт понятную ошибку конфигурации, а результат preview
останется доступен.

Данные PostgreSQL сохраняются в Docker volume `postgres_data`.

- Frontend: http://localhost:5173
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/health
- Public Signals demo: http://localhost:8000/api/signals/proposals
- MiroFish capability: http://localhost:8000/api/mirofish/capability (disabled by default)

Изменения исходников подхватываются автоматически. Остановка: `docker compose down`.
После изменения зависимостей повторите запуск с `--build`.
Для настройки портов скопируйте `.env.example` в `.env`.
Compose предназначен для локальной разработки.

## Сценарий симуляции

Выберите пять разных инициатив каталога DataDoc и назначьте район для каждой
районной инициативы. Общий бюджет и ограничения проверяет backend. Кнопка
«Рассчитать сценарий» возвращает детерминированный preview без вызова AI;
«Получить AI-анализ» отправляет рассчитанный результат в OpenAI Responses API
для объяснения сильных сторон, рисков, последствий и рекомендаций. Модель
объяснения не выставляет и не меняет балл.

API для интеграции агента/тестовой среды: `GET /api/datasets/current`,
`POST /api/scenarios`, `PUT /api/scenarios/{id}/decisions`,
`POST /api/scenarios/{id}/preview`, `POST /api/scenarios/{id}/submit` и
`POST /api/scenarios/{id}/evaluate`. Полный контракт доступен в Swagger.
Параметры OpenAI и безопасная проверка наличия ключа описаны в
[`docs/openai-evaluation.md`](docs/openai-evaluation.md).

Карта показывает отдельный снимок OSM-объектов, помеченных как школы; это
реальные community-mapped данные для поиска кандидатов, не официальный реестр
и не вход модели. Снимок и атрибуция описаны в `backend/data/enrichment/`.
Блок «Предложения жителей» использует вымышленные агрегаты для демонстрации
интерфейса и подавления малых групп. Это не реальные сообщения и не опрос.
Источники социальных сетей не подключены; внешний MiroFish gateway выключен
по умолчанию. Публичный видеоплеер загружается только после нажатия и не
анализируется приложением. Подробнее: [план Public Signals и MiroFish](MiroFish_Local_Opinion_Plan.md)
и [карта гражданских данных](docs/enrichment/civic-evidence-map.md).

## Структура

- `backend/app/api/` — маршруты API, `backend/app/main.py` — приложение.
- `backend/tests/` — тесты backend.
- `frontend/src/` — React-приложение.
- `.github/workflows/` — CI: тесты, сборка frontend и Docker-образов.
- `compose.yaml` — совместный запуск сервисов.

## Без Docker

Нужны Python 3.12 и Node.js 22.12+ с npm.

Из `backend`:

```sh
python -m venv .venv
# PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

Для локального backend сначала запустите БД: `docker compose up -d db`.
По умолчанию используется `postgresql+psycopg://stikerai:stikerai@localhost:5432/stikerai`.
Для другого подключения экспортируйте `DATABASE_URL` в окружении терминала;
Python автоматически не загружает корневой `.env`.

В другом терминале из `frontend`:

```sh
npm ci
npm run dev
```

Frontend использует `/api`; Vite проксирует запросы на `http://127.0.0.1:8000`
локально и `http://backend:8000` в Docker. Адрес меняется через переменную
окружения `API_PROXY_TARGET` процесса Vite.

## Проверки

- Из `backend` с активным venv: `python -m pytest`.
- Из `frontend`: `npm run build` (TypeScript + сборка).
- В Docker: `docker compose run --rm backend python -m pytest`.
- В Docker: `docker compose run --rm frontend npm run build`.
