# StikerAI — «Аким на 5 часов»

Учебный симулятор управления городом для городских управленцев, аналитиков и участников хакатона. Проект помогает исследовать, как распределение ограниченного бюджета между транспортом, экологией, социальной инфраструктурой, безопасностью и городскими сервисами влияет на качество жизни районов Астаны.

**Текущий статус:** интерфейс подключён к API, БД и серверному расчёту. Реализованы сохранение черновиков, восстановление сессии, фиксация результатов и AI-объяснение через настраиваемый OpenAI Responses API. Без AI-ключа работает весь численный сценарий. Текущий экран — **ASTANA // AKIM MODE**: command center для акима и отдельное citizen workspace для демонстрации обратной связи жителей. Это учебный прототип, а не инструмент прогнозирования реальных городских показателей.

## 1. Что реализовано

### Интерфейс

Главная страница `/` — командный центр с гражданскими инициативами и картой.
Русско-казахский симулятор доступен на `/simulator`; ссылки между экранами сохраняют
общую сессию, сценарий и выбранные районы. Карта также доступна в разделе Districts.

- Адаптивный command center с пятью направлениями городского развития и вариантами инициатив.
- Два режима: **Akim workspace** для городских решений и **Citizen workspace** для локальной демонстрации участия жителей.
- City Pulse, районы, петиции, голоса, инициативы и community funding используют отдельные синтетические civic-данные.
- AI не принимает решение за акима: он показывает последствия выбранного сценария, его влияние на районы, бюджет и Quality of Life Score.
- Выбор пяти инициатив с районной или городской областью действия.
- Серверная проверка бюджета, направлений, повторов и несовместимостей.
- Пять районов, десять показателей, вклад мероприятий и синергий.
- Сохранение сценариев, история текущей браузерной сессии и копирование завершённого сценария.

Интерфейс использует серверный каталог и бюджет **100 условных единиц**. Score рассчитывается только сервером; браузер округляет его для отображения.

### Серверный слой

- FastAPI-приложение с API каталога, сценариев, расчёта, AI-объяснений, health endpoint и Swagger UI.
- SQLAlchemy-модели наборов данных, районов, инициатив, правил совместимости, сценариев, решений, оценок и результатов районов.
- Начальная миграция Alembic и повторяемое заполнение синтетическими данными.
- Pydantic-схемы и генерация TypeScript-типов из этих схем.
- Python-сервисы создания сценария, атомарной замены набора решений и отправки сценария. Отправленный сценарий нельзя редактировать через этот сервис.
- Валидатор: ровно пять решений при отправке, без повторов, не более двух инициатив одного направления, соблюдение бюджета, корректный район и отсутствие запрещённых сочетаний.
- Детерминированный расчёт Score с учётом лага, городских и районных эффектов, синергий и критических показателей.
- Тесты правил, контрольного расчёта, миграций, сериализации и конкурентной отправки/редактирования в PostgreSQL.

### Инфраструктура

Docker Compose объединяет frontend, backend, PostgreSQL и одноразовые сервисы миграции и загрузки датасета. В GitHub Actions настроены тесты, проверка актуальности типов, сборка frontend и сборка Docker-образов. Development-контейнеры монтируют актуальные migrations и dataset, поэтому изменения схемы и синтетических данных видны без пересборки приложения.

## 2. Как работает решение

Пользовательский сценарий в браузере:

1. Загружается версия `astana-synthetic-v1`: общий бюджет **100 условных единиц**, пять районов, десять показателей и 14 инициатив.
2. Пользователь формирует пять решений. Для районной инициативы выбирается район; для городской район не указывается.
3. Валидатор проверяет стоимость, количество решений, направления, повторения и несовместимости. Невалидный набор отклоняется с причиной.
4. Расчёт применяет эффекты, масштабированные по лагу, добавляет фиксированные синергии и ограничивает показатели диапазоном 0–100.
5. Получаются итоговые показатели районов, их оценки, средний городской показатель, показатель самого слабого района, число критических значений и итоговый Score.

Формула версии `astana-qol-v1`:

```text
реализованный эффект = полный эффект × (8 − лаг в кварталах) / 8
оценка района = сумма(вес показателя × итоговое значение показателя)
D_avg = сумма(доля населения района × оценка района)
Score = 0.7 × D_avg + 0.3 × min(оценки районов) − N_crit
```

`N_crit` — число пар «район × показатель» со значением строго ниже 40. Итоговый городской Score может быть отрицательным; он не ограничивается снизу нулём. Остаток бюджета не даёт бонуса.

После выбора пяти мероприятий отображается серверный предварительный расчёт. Кнопка «Показать анализ сценария» фиксирует решения и сохраняет итог. Затем запускается AI-объяснение. При ошибке провайдера численные результаты остаются доступны, объяснение можно запросить повторно. Для изменения завершённого сценария создаётся копия.

## 3. Технологии

- **Frontend:** TypeScript, React 19, Vite 7, CSS, Lucide React.
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic.
- **База данных:** PostgreSQL 16, SQLAlchemy 2, драйвер psycopg 3, Alembic.
- **Проверки:** pytest, HTTPX/TestClient, TypeScript compiler, Playwright. SQLite используется для локальных тестов, PostgreSQL — для проверки поведения целевой БД в CI.
- **Окружение:** Docker, Docker Compose v2, GitHub Actions.
- **AI:** OpenAI Responses API со структурированным JSON-ответом; модель и ключ задаются на сервере. Для численного расчёта ключ не нужен.

Версии Python-зависимостей указаны в [requirements.txt](backend/requirements.txt), frontend-зависимости — в [package.json](frontend/package.json) и [package-lock.json](frontend/package-lock.json).

## 4. Архитектура

- `frontend/src/App.tsx` — экран симулятора; данные сценария сохраняются в БД через `frontend/src/api.ts`.
- `frontend/vite.config.ts` — прокси `/api` к backend.
- `backend/app/api/simulator.py` — API, владение сценариями, фиксация расчёта и запуск объяснений.
- `backend/app/services/scenarios.py` — правила выбора, транзакции и жизненный цикл сценария.
- `backend/app/services/scoring.py` — численный расчёт, независимый от AI.
- `backend/app/models.py` и `schemas.py` — модель хранения и контракты данных.
- `backend/migrations/` — версия схемы БД; `backend/app/seed.py` — загрузчик датасета.
- `backend/data/astana-v1.json` — исходные синтетические значения.
- `backend/tests/` — проверки; `backend/scripts/export_types.py` — генератор типов frontend.

При запуске Compose сначала ожидает готовности PostgreSQL, затем сервис `migrate` применяет миграции, после чего запускаются backend и frontend. Данные БД хранятся в volume `postgres_data` и сохраняются после `docker compose down`.

Сценарии привязаны к версии общего датасета. Изменения набора решений блокируют строку сценария в PostgreSQL. Ограничения БД защищают ссылки между сущностями и запрещают повторные инициативы; совокупные бизнес-правила проверяются Python-сервисом. Подробнее: [модель данных](docs/data-model.md).

## 5. Установка и запуск

### Через Docker — основной способ

Нужны Git и Docker с Compose v2. На Windows используйте Docker Desktop в режиме Linux containers. Порты по умолчанию: `5173`, `8000`, `5432`.

```sh
git clone https://github.com/BAITC-Hacks/hack-3f85346f-stikerai.git
cd hack-3f85346f-stikerai
docker compose up --build -d
docker compose ps
```

Compose автоматически запускает seed после миграций и до API. Seed создаёт датасет при первом вызове; повторный запуск сохраняет существующую версию.

Адреса:

- [Интерфейс](http://localhost:5173).
- [Swagger UI](http://localhost:8000/docs).
- [Health endpoint](http://localhost:8000/api/health).

Для настройки портов и реквизитов БД скопируйте `.env.example` в `.env` **до запуска**:

```sh
# Linux / macOS
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Compose использует переменные `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`. Публикуемые порты привязаны к `127.0.0.1`. Реквизиты по умолчанию предназначены для локальной разработки. Изменение реквизитов после создания volume само по себе не изменяет пользователей существующей БД.

Полезные команды:

```sh
docker compose logs backend migrate db
docker compose down
```

Изменения исходников frontend/backend подхватываются автоматически. После изменения зависимостей, миграций или датасета пересоберите образы командой запуска с `--build`.

### Локальные процессы frontend и backend

Нужны Python 3.12 и Node.js 22.12+ с npm. PostgreSQL можно запустить отдельно из корня проекта:

```sh
docker compose up -d db
cd backend
python -m venv .venv
```

Активируйте окружение:

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

```sh
# Linux / macOS
source .venv/bin/activate
```

Далее из `backend`:

```sh
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload
```

По умолчанию Python подключается к `postgresql+psycopg://stikerai:stikerai@localhost:5432/stikerai`. Для другого адреса задайте `DATABASE_URL` в окружении процесса. Корневой `.env` Python автоматически не загружает.

Во втором терминале из корня проекта:

```sh
cd frontend
npm ci
npm run dev
```

Прокси Vite по умолчанию направляет `/api` на `http://127.0.0.1:8000`, а в Docker — на `http://backend:8000`. Адрес можно изменить переменной `API_PROXY_TARGET`.

## 6. Как проверить решение

### Доступность API

Откройте [health endpoint](http://localhost:8000/api/health). Ожидаемый ответ:

```json
{"status":"ok","service":"stikerai-backend"}
```

Этот endpoint проверяет доступность приложения, но не соединение с БД.

### Демонстрационный интерфейс

1. Откройте [localhost:5173](http://localhost:5173).
2. В каждом направлении выберите «Ничего не менять». Расход станет нулевым, остаток — 5 000 000 ₸, демонстрационная оценка — 62.
3. Выберите «Открытые данные» в городских сервисах: расход станет 300 000 ₸, остаток — 4 700 000 ₸, оценка — 67.
4. Обновите страницу: выбор сбросится, поскольку хранится только в состоянии React.

Это проверка интерфейса, а не серверной формулы из `datadoc.md`.

### Контрольный серверный сценарий

Набор из исходной спецификации:

- M7 — школа и детсад, Нура.
- M8 — поликлиника, Нура.
- M10 — освещение и камеры, Нура.
- M12 — платформа обращений, весь город.
- M5 — чистое топливо, Сарыарка.

Стоимость: **95 из 100**. Базовый Score: **52.55768**. Итоговый Score: **56.54307**. Число критических показателей уменьшается с **2 до 0**. Учитывается синергия M10 + M12.

Повторите проверку в Docker:

```sh
docker compose exec backend python -m pytest -q tests/test_data_model.py::test_reference_scores_and_order_independence
```

Либо из `backend` с активированным Python-окружением:

```sh
python -m pytest -q tests/test_data_model.py::test_reference_scores_and_order_independence
```

Тест создаёт изолированную тестовую БД, применяет миграции, загружает исходные данные и проверяет численные результаты, стоимость и независимость от порядка решений. Этот же набор можно выбрать в интерфейсе и отправить через HTTP API.

### Остальные проверки

```sh
# Из backend с активным окружением
python -m pytest -q
python scripts/export_types.py --check

# Из frontend
npm run build
```

Каждый `npm run build` сначала запускает `prebuild`: получает свежие версии всех веток со всех Git remotes и проверяет, что их коммиты включены в текущий checkout. Проверка работает также в detached HEAD и shallow/single-branch клонах; CI получает полную историю. Если есть невключённые коммиты, сборка останавливается и перечисляет ветки с числом новых коммитов. Выполните merge или rebase обновлений и повторите сборку. При ошибке сети или авторизации сборка также останавливается, чтобы не использовать устаревшие сведения. Сам hook не выполняет merge, commit или push. Запускайте сборку через `npm run build`, а не напрямую через `vite build`, который обходит npm hooks.

Для тестов без `TEST_DATABASE_URL` используется SQLite в памяти, проверка конкурентности PostgreSQL пропускается. Чтобы проверить целевую СУБД, задайте `TEST_DATABASE_URL` на тестовую PostgreSQL: пользователь должен иметь право создавать схемы. Каждый тест создаёт и удаляет отдельную схему. Такой запуск настроен в CI; наличие конфигурации не означает, что текущий запуск CI уже прошёл.

Браузерные тесты: из `frontend` выполните `npx playwright install chromium`, затем `npm run test:e2e`. Они сами поднимают реальный API с миграциями и seed в изолированной временной SQLite, а также Vite. На Windows требуется `backend/.venv`; на Linux используется `python` текущего окружения. LLM в браузерных тестах отключена; успешные и ошибочные ответы провайдера покрыты изолированными API-тестами.

## 7. Данные и интеграции

Источники внутри проекта:

- [PRD.md](PRD.md) — задача и требования хакатона.
- [datadoc.md](datadoc.md) — показатели, стоимость мероприятий, ограничения и формула Score.
- [astana-v1.json](backend/data/astana-v1.json) — машинно-читаемый датасет: Есиль, Алматы, Сарыарка, Байконур и Нура; 10 показателей на район; 14 инициатив; 3 синергии; 3 несовместимости; горизонт 8 кварталов.

Значения синтетические и не являются официальной статистикой. Все десять показателей направлены одинаково: 100 — лучшее состояние, 0 — худшее. Интерфейс загружает их из общего серверного датасета.

Для расчёта не нужны внешние API или AI-ключи. Установка требует доступа к реестрам Python/npm и Docker-образов. GitHub используется для хранения кода и CI.

[QGIS_Plan.md](QGIS_Plan.md) описывает будущий картографический слой. Геоданные, карта, QGIS/PostGIS-интеграция и загрузка внешних городских данных в текущем приложении не реализованы.

## 8. Известные ограничения

- Сессия анонимная: HttpOnly cookie хранится 30 дней. После её удаления доступ к прежним сценариям из этого браузера теряется. Учётные записи и сравнение команд не реализованы.
- Старые сценарии, созданные напрямую Python-сервисом без владельца, не открываются через пользовательский API.
- AI требует настроенного ключа и доступной модели; реальные запросы к платному провайдеру не выполняются тестами.
- AI-задачи выполняются в процессе backend. После прерывания процесса запрос можно повторить по истечении 90 секунд; для масштабирования нужен отдельный worker.
- Генерация презентаций не реализована.
- Не реализованы неожиданные городские события и интерактивная карта.
- Неизменяемость опубликованного датасета — правило приложения; прямые SQL-изменения могут нарушить его и обойти часть бизнес-валидации.
- Docker Compose настроен для разработки: используется сервер Vite и автоматическая перезагрузка backend. Production-конфигурация, HTTPS и публичное развёртывание не представлены.

## 9. Развёрнутая версия

API-маршруты, настройка `OPENAI_API_KEY` / `OPENAI_MODEL`, поведение сессий,
повторов и AI-задач описаны в [руководстве интеграции](docs/integration.md).

Ссылка на публично развёрнутое приложение в текущем репозитории не указана. Для проверки используйте локальный запуск выше.

Репозиторий: [BAITC-Hacks/hack-3f85346f-stikerai](https://github.com/BAITC-Hacks/hack-3f85346f-stikerai).

## Общественные сигналы и городской контекст

Интерактивная карта районов доступна над портфелем решений: нажмите «Открыть карту».
Она показывает шесть границ из OpenStreetMap, позволяет сравнивать показатели
учебной модели и назначать район мероприятию. Улицы включаются отдельным слоем.
Непроверенные связи географии с датасетом показаны серым; показатели по улицам
пока отсутствуют. [Устройство, данные и настройка карты](docs/interactive-map.md).

Панель «Предложения жителей» получает синтетические демонстрационные сводки из
`GET /api/signals/proposals` и `GET /api/signals/proposals/{id}/aggregates`.
Малые группы скрываются. Эти данные не отражают мнение жителей и не влияют на Score.
Блок «Астана сейчас» загружает сторонний плеер только после нажатия.

`GET /api/datasets/current` возвращает текущий датасет и базовый Score.
`POST /api/scenarios/{id}/evaluate` запускает объяснение уже сохранённого расчёта
через тот же защищённый механизм, что и `/explanation`; ответ содержит статус
Explanation. Сохранение решений и submit требуют `expected_revision`, как описано
в [руководстве интеграции](docs/integration.md).

Опциональный [MiroFish-адаптер](docs/mirofish-adapter.md) выключен по умолчанию.
Он принимает проверенную агрегированную сводку и использует настраиваемый шлюз.
См. также [карту источников](docs/enrichment/civic-evidence-map.md),
[исследование общественных сигналов](docs/enrichment/public-signals/README.md)
и [настройку AI-адаптеров](docs/openai-evaluation.md).

## ASTANA // Command Center + Citizen Participation

The command-center refactor preserves the existing dataset, validation, deterministic Python scoring engine, persistent scenario APIs, and original browser regression tests. The frontend continues to use React, TypeScript and Vite; Lucide supplies the navigation icons. No external map service or payment provider is needed.

### Local demo

```sh
docker compose up --build -d --wait
```

Open **http://localhost:5173**. Compose runs migrations and the idempotent dataset seed before starting the backend. Development containers mount current migrations and data read-only. Optional AI credentials stay in root `.env` and are read only by the backend.

1. Choose **Enter Command Center**. The baseline is **52.56**; click **Nura** to inspect its schools and healthcare.
2. Open **Listen to the city** to compare city indicators with fictional resident priorities.
3. Select **M7 → Nura**, **M8 → Nura**, **M10 → Nura**, **M12 → Citywide**, and **M5 → Saryarka**. Cost: **95**; calculated score: **56.54307**.
4. Run **Simulate 2 years**. Review city impact, citizen alignment and community resources separately. Live AI is optional; deterministic advisory cards remain available without it.
5. Switch to **Citizen workspace**. Sign a petition, vote, allocate 10 citizen points, report/confirm an issue, propose an idea, or make a **simulated** contribution.
6. Return to the command center. Signatures, confirmations, funding and your activity feed share the same local state. The official score does not change.
7. Press **Cmd/Ctrl + K** for the command palette. **Astana Open** gives a simplified public view. **Simulation settings** contains configurable fictional petition milestones and a confirmation-protected civic reset.

### Data boundaries

- **Official city impact:** the unchanged server-side engine alone computes scores and validates government plans. Citizen actions never enter its inputs. Baseline and valid five-decision previews are labelled; results are saved by the existing scenario workflow.
- **Citizen alignment:** arithmetic mean of the fixed fictional support percentages for selected initiatives. An empty selection has no alignment value. This is advisory, not predicted satisfaction.
- **Community resources:** sum of raised amounts in related community projects, matched to the selected initiative and district (or citywide scope), counted once per project. Tenge is never added to the virtual government budget. Civic-idea pledges remain separate from funded-project totals.
- **Civic participation:** fictional fixtures in `frontend/src/data/{citizens,petitions,crowdfunding,issues,votes}.ts`, with one mock resident per browser profile. Votes, signatures and confirmations are idempotent; repeat demo contributions are allowed. State persists under `astana.civic.v1` in localStorage. An unavailable/full storage warning means the current session still works but persistence may fail.
- **Petitions:** milestones are labelled **Demo simulation thresholds** and have no legal or administrative effect. A milestone does not automatically mark a petition accepted or implemented.
- **Funding:** no real transactions, payment details or real organizer verification. Images are local optional report attachments (PNG/JPEG/WebP, up to 1 MB); project art is SVG/CSS.
- **AI explanation:** receives saved numerical results and a bounded, explicitly fictional civic snapshot. Extra score fields in civic context are rejected. The snapshot is explanatory only and cannot alter saved calculations. The existing asynchronous provider, retry and session ownership logic is retained. Live local civic summaries can change after later participation; provider output is labelled as a snapshot at simulation time.
- **Upstream civic evidence:** the original aggregated public-signal panels and opt-in city broadcast remain available beneath the command-center scenario controls. The broadcast is never loaded automatically.

```mermaid
flowchart LR
  A[Government decisions] --> V[Existing scenario validator]
  V --> E[Existing deterministic engine]
  E --> R[Saved official results]
  C[Local fictional citizen activity] --> P[Astana Pulse / district context]
  C --> X[Separate alignment and funding summaries]
  R --> AI[Optional AI explanation]
  C -->|Bounded advisory snapshot only| AI
  R --> UI[Command Center and results]
  X --> UI
  P --> UI
```

### QA

```sh
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python scripts/export_types.py --check
cd ../frontend
npm ci
npm run build
PATH="$PWD/../backend/.venv/bin:$PATH" npm run test:e2e
```

`npm run build` fetches and checks all remote branches first. Browser tests use isolated SQLite and local servers, with live AI disabled. Existing tests retain the 52.56 baseline, 56.54 reference scenario, invalid-plan rejection, persistence, copy/retry, source aggregation and mobile coverage. Civic QA covers cross-workspace updates, persistence, duplicate protection, the ten-point cap, local submissions, fictional thresholds, keyboard navigation and desktop/tablet/mobile overflow. Backend coverage verifies that civic context reaches the explanation provider without changing the official result.

### Prototype limits

Citizen records are local to one browser, not shared between actual residents. Project verification, participation counts, trends, map boundaries and funding are fictional. The timer is narrative and imposes no expiry penalty. Live AI requires optional server configuration; the core simulator and civic experience work locally with the Compose stack. Next steps are authenticated shared civic storage, moderation, audited public responses, real GIS boundaries, accessibility research and deployment hardening. Real payments require a separate, explicitly configured implementation.
