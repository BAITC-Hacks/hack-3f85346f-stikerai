from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_session
from app.main import app
from app.models import Calculation, Explanation
from app.schemas import ExplanationText
from app.seed import seed
from app.services import llm


@pytest.fixture
def client(engine, monkeypatch):
    with Session(engine) as session, session.begin():
        seed(session)
    def session_override():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_session] = session_override
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)
    with TestClient(app, headers={"X-Requested-With": "stikerai"}) as client:
        assert client.post('/api/session').status_code == 200
        yield client
    app.dependency_overrides.clear()


def start(client, request_id=None):
    catalog = client.get('/api/catalog').json()
    response = client.post('/api/scenarios', json={"dataset_id": catalog['dataset']['id'], "team_name": "Team", "request_id": str(request_id or uuid4())})
    assert response.status_code == 200, response.text
    return catalog, response.json()


def plan(catalog):
    districts = {d['code']: d['id'] for d in catalog['districts']}
    items = {d['code']: d['id'] for d in catalog['initiatives']}
    return [{"initiative_id": items[code], "district_id": districts[district] if district else None}
            for code, district in [('M7', 'nura'), ('M8', 'nura'), ('M10', 'nura'), ('M12', None), ('M5', 'saryarka')]]


def completed(client):
    catalog, scenario = start(client)
    url = f"/api/scenarios/{scenario['id']}"
    saved = client.put(url + '/decisions', json={"expected_revision": 0, "decisions": plan(catalog)})
    assert saved.status_code == 200, saved.text
    response = client.post(url + '/submit', json={"expected_revision": 1})
    assert response.status_code == 200, response.text
    return url, response.json()


def test_catalog_save_reload_preview_submit_and_copy(client, engine):
    catalog, scenario = start(client)
    assert len(catalog['districts']) == 5 and len(catalog['initiatives']) == 14
    assert catalog['dataset']['initial_budget'] == 100
    url = f"/api/scenarios/{scenario['id']}"
    response = client.put(url + '/decisions', json={"expected_revision": 0, "decisions": plan(catalog)})
    assert response.status_code == 200, response.text
    assert response.json()['remaining_budget'] == 5
    assert client.get(url).json()['revision'] == 1
    assert client.post(url + '/preview', json={"expected_revision": 1}).json()['final_score'] == pytest.approx(56.54307)
    first = client.post(url + '/submit', json={"expected_revision": 1})
    second = client.post(url + '/submit', json={"expected_revision": 1})
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json() == client.get(url + '/result').json()
    assert client.get(url).json()['status'] == 'evaluated'
    assert client.put(url + '/decisions', json={"expected_revision": 2, "decisions": []}).status_code == 422
    copied = client.post(url + '/copy', json={"request_id": str(uuid4())}).json()
    assert copied['status'] == 'draft' and len(copied['decisions']) == 5
    assert copied['id'] != scenario['id']
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Calculation)) == 1


def test_invalid_stale_and_unauthorized_requests(client):
    catalog, scenario = start(client)
    url = f"/api/scenarios/{scenario['id']}"
    assert client.post(url + '/submit', json={"expected_revision": 0}).json()['detail']['code'] == 'DECISION_COUNT'
    assert client.put(url + '/decisions', json={"expected_revision": 0, "decisions": plan(catalog)}).status_code == 200
    assert client.put(url + '/decisions', json={"expected_revision": 0, "decisions": []}).json()['detail']['code'] == 'STALE_REVISION'
    assert len(client.get(url).json()['decisions']) == 5
    with TestClient(app, headers={"X-Requested-With": "stikerai"}) as other:
        other.post('/api/session')
        assert other.get('/api/scenarios').json() == []
        assert other.get(url).status_code == 404
        for suffix, body in [('/submit', {"expected_revision": 1}), ('/explanation', None), ('/copy', {"request_id": str(uuid4())})]:
            assert other.post(url + suffix, json=body).status_code == 404
    assert client.post('/api/session', headers={"X-Requested-With": ""}).status_code == 403


def test_creation_is_idempotent(client):
    key = uuid4()
    assert start(client, key)[1]['id'] == start(client, key)[1]['id']


def test_no_key_keeps_numeric_result(client):
    url, result = completed(client)
    assert client.post(url + '/explanation').json()['status'] == 'failed'
    assert client.get(url + '/result').json() == result


def test_ai_failure_retry_and_no_duplicate_call(client, monkeypatch):
    url, result = completed(client)
    monkeypatch.setenv('OPENAI_API_KEY', 'fake-test-key')
    monkeypatch.setenv('OPENAI_MODEL', 'test-model')
    calls = []
    def provider(payload):
        calls.append(payload)
        if len(calls) == 1:
            raise TimeoutError('provider secret detail')
        return ExplanationText(summary='Объяснение', strengths=['Рост доступности'], risks=[], consequences=[], recommendations=[])
    monkeypatch.setattr(llm, 'request_explanation', provider)
    assert client.post(url + '/explanation').json()['status'] == 'running'
    failed = client.get(url + '/explanation').json()
    assert failed['status'] == 'failed' and 'secret' not in failed['error']
    client.post(url + '/explanation')
    assert client.get(url + '/explanation').json()['payload']['summary'] == 'Объяснение'
    assert client.post(url + '/explanation').json()['status'] == 'completed'
    assert len(calls) == 2
    assert client.get(url + '/result').json() == result


def test_running_lease_can_be_recovered(client, engine):
    url, _ = completed(client)
    with Session(engine) as session, session.begin():
        row = session.scalar(select(Explanation))
        row.status = 'running'
        row.started_at = datetime.now(timezone.utc) - timedelta(seconds=100)
    assert client.get(url + '/explanation').json()['status'] == 'failed'
    assert client.post(url + '/explanation').json()['status'] == 'failed'  # Missing configuration; not stuck running.


def test_structured_provider_contract(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only')
    monkeypatch.setenv('OPENAI_MODEL', 'test-model')
    output = ExplanationText(summary='Готово', strengths=[], risks=[], consequences=[], recommendations=[])
    def handler(request):
        import json
        body = json.loads(request.content)
        assert body['text']['format']['strict'] is True
        assert body['store'] is False
        return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": output.model_dump_json()}]}]})
    assert llm.request_explanation({"score": 56.54}, transport=httpx.MockTransport(handler)) == output
