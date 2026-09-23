from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

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


def test_school_context_is_geojson_without_changing_simulation(client):
    baseline = client.get('/api/catalog').json()['baseline']
    response = client.get('/api/context/schools')
    assert response.status_code == 200
    assert response.headers['content-type'].startswith('application/geo+json')
    snapshot = response.json()
    assert snapshot['type'] == 'FeatureCollection'
    assert snapshot['features'] and snapshot['source_snapshot']
    assert all(row['geometry']['type'] == 'Point' for row in snapshot['features'])
    assert client.get('/api/catalog').json()['baseline'] == baseline


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


def test_merged_routes_preserve_catalog_and_scenario_ownership(client):
    catalog = client.get('/api/catalog').json()
    current = client.get('/api/datasets/current').json()
    assert current['dataset'] == catalog['dataset']
    assert current['baseline_score'] == catalog['baseline']['baseline_score']
    url, result = completed(client)
    response = client.post(url + '/evaluate')
    assert response.status_code == 200
    assert response.json()['status'] == 'failed'  # no AI key, saved numbers remain
    assert client.get(url + '/result').json() == result
    client.cookies.clear()
    assert client.post(url + '/evaluate').status_code == 401
    assert client.post('/api/session').status_code == 200
    assert client.post(url + '/evaluate').status_code == 404
    routes = [(method, route.path) for route in app.routes
              for method in getattr(route, 'methods', [])]
    assert len(routes) == len(set(routes))


def test_public_signals_and_disabled_gateway(client, monkeypatch):
    monkeypatch.setenv('MIROFISH_ENABLED', 'false')
    proposals = client.get('/api/signals/proposals').json()
    assert len(proposals) == 2 and all(row['is_demo'] for row in proposals)
    for proposal in proposals:
        response = client.get(f"/api/signals/proposals/{proposal['id']}/aggregates")
        assert response.status_code == 200
        cells = response.json()['aggregates']
        assert any(cell['suppressed'] for cell in cells)
        assert all(cell['count'] is None if cell['suppressed'] else cell['count'] >= 5 for cell in cells)
    assert client.get('/api/signals/proposals/unknown/aggregates').status_code == 404
    assert client.get('/api/mirofish/capability').json()['state'] == 'disabled'
    assert client.post('/api/mirofish/scenario', json={}).status_code == 422
    brief = {"proposal_text": "Park renewal", "evidence_brief": {
        "review_status": "approved", "reviewer_role": "researcher",
        "reviewed_at": "2026-09-23T00:00:00Z", "aggregates": [{
            "source_id": "demo", "metric": "support", "value": 10, "unit": "count",
            "period": "demo", "geography": "city", "sample_size": 10,
            "suppression_applied": False}]}}
    assert client.post('/api/mirofish/scenario', json=brief).status_code == 503
    client.cookies.clear()
    assert client.post('/api/mirofish/scenario', json={}).status_code == 401


def test_map_snapshot_does_not_guess_geographic_correspondence(client):
    catalog = client.get('/api/catalog').json()
    response = client.get('/api/map/districts', params={'dataset_id': catalog['dataset']['id']})
    assert response.status_code == 200
    data = response.json()
    assert data['dataset_id'] == catalog['dataset']['id']
    assert len(data['features']) == 6
    assert len({row['id'] for row in data['features']}) == 6
    assert all(row['properties']['district_id'] is None for row in data['features'])
    assert sum(row['properties']['mapping_status'] == 'unverified' for row in data['features']) == 5
    saraishyk = next(row for row in data['features'] if row['properties']['code'] == 'saraishyk')
    assert saraishyk['properties']['mapping_status'] == 'missing'
    assert saraishyk['properties']['candidate_district_id'] is None
    for feature in data['features']:
        assert feature['geometry']['type'] == 'MultiPolygon'
        for polygon in feature['geometry']['coordinates']:
            for ring in polygon:
                assert len(ring) >= 4 and ring[0] == ring[-1]
                assert all(70.5 < lng < 72.2 and 50.5 < lat < 51.8 for lng, lat in ring)
    assert client.get('/api/map/districts', params={'dataset_id': str(uuid4())}).status_code == 404
    assert client.get('/api/map/districts', params={'dataset_id': '../anything'}).status_code == 422


def test_map_crosswalk_is_versioned_and_requires_evidence(client, monkeypatch, engine):
    from copy import deepcopy
    from app.api import map as map_api
    from app.models import Dataset
    catalog = client.get('/api/catalog').json()
    data = deepcopy(map_api.boundary_crosswalk())
    version = map_api.boundary_snapshot()['boundary_version']
    link = data[version][catalog['dataset']['version']]['nura']
    link['status'] = 'verified'
    monkeypatch.setattr(map_api, 'boundary_crosswalk', lambda: data)
    def nura():
        features = client.get('/api/map/districts', params={'dataset_id': catalog['dataset']['id']}).json()['features']
        return next(row['properties'] for row in features if row['properties']['code'] == 'nura')
    assert nura()['district_id'] is None  # a status flag alone is insufficient
    link['evidence_url'] = 'https://example.org/test-only-boundary-review'
    assert nura()['district_id'] == next(row['id'] for row in catalog['districts'] if row['code'] == 'nura')
    with Session(engine) as session, session.begin():
        session.get(Dataset, UUID(catalog['dataset']['id'])).version = 'unmapped-version'
    assert nura()['mapping_status'] == 'missing'


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
    monkeypatch.setenv('OPENAI_BASE_URL', 'https://gateway.example/v1/')
    monkeypatch.setenv('OPENAI_TIMEOUT_SECONDS', '20')
    output = ExplanationText(summary='Готово', strengths=[], risks=[], consequences=[], recommendations=[])
    def handler(request):
        import json
        assert str(request.url) == 'https://gateway.example/v1/responses'
        body = json.loads(request.content)
        assert body['text']['format']['strict'] is True
        assert body['store'] is False
        return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": output.model_dump_json()}]}]})
    assert llm.request_explanation({"score": 56.54}, transport=httpx.MockTransport(handler)) == output


def test_civic_context_only_reaches_explanation_never_score(client, monkeypatch):
    url, original = completed(client)
    monkeypatch.setenv('OPENAI_API_KEY', 'fake-test-key')
    monkeypatch.setenv('OPENAI_MODEL', 'test-model')
    captured = []
    def provider(payload):
        captured.append(payload)
        return ExplanationText(summary='Civic context explained', strengths=[], risks=[], consequences=[], recommendations=[])
    monkeypatch.setattr(llm, 'request_explanation', provider)
    civic = {
        'source': 'fictional_local_demo', 'alignment': 85.8, 'community_funding': 36440000,
        'selected_support': [{'code': 'M7', 'support': 91}],
        'districts': [{'district': 'nura', 'priority': 'social', 'signals': 3481, 'satisfaction': 63, 'petition_signatures': 2640}],
    }
    assert client.post(url + '/explanation', json={**civic, 'final_score': 99}).status_code == 422
    assert client.post(url + '/explanation', json={**civic, 'alignment': 101}).status_code == 422
    assert client.post(url + '/explanation', json=civic).status_code == 200
    assert captured[0]['citizen_context'] == civic
    assert captured[0]['final_score'] == original['final_score']
    assert client.get(url + '/result').json() == original
