"""Convert six downloaded OSM relation/full.json files into a pinned map snapshot.

Usage: python scripts/import_osm_boundaries.py INPUT_DIRECTORY --retrieved-at ISO_DATE
Input filenames: astana-osm-RELATION_ID.json. No network calls are made.
This importer deliberately rejects inner rings/subrelations instead of losing them.
"""
import argparse
import hashlib
import json
from pathlib import Path

RELATIONS = {
    3479876: ('esil', 'Есиль'), 3482819: ('almaty', 'Алматы'),
    3486954: ('saryarka', 'Сарыарка'), 8593081: ('baikonur', 'Байконур'),
    19733918: ('saraishyk', 'Сарайшык'), 20593940: ('nura', 'Нура'),
}


def geometry(document, relation_id):
    elements = {(item['type'], item['id']): item for item in document['elements']}
    relation = elements['relation', relation_id]
    segments = []
    for member in relation['members']:
        if member['type'] != 'way' or member['role'] != 'outer':
            raise ValueError(f'Unsupported member in relation {relation_id}; review topology first')
        segments.append(list(elements['way', member['ref']]['nodes']))
    rings = []
    while segments:
        ring = segments.pop(0)
        while ring[-1] != ring[0]:
            matches = [(i, segment if segment[0] == ring[-1] else segment[::-1])
                       for i, segment in enumerate(segments) if ring[-1] in (segment[0], segment[-1])]
            if len(matches) != 1:
                raise ValueError(f'Open or ambiguous ring in relation {relation_id}')
            index, segment = matches[0]
            ring.extend(segment[1:])
            segments.pop(index)
        coordinates = [[elements['node', node]['lon'], elements['node', node]['lat']] for node in ring]
        if len(coordinates) < 4:
            raise ValueError('Degenerate ring')
        area = sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(coordinates, coordinates[1:]))
        if area < 0:
            coordinates.reverse()
        rings.append([coordinates])
    return {'type': 'MultiPolygon', 'coordinates': rings}, relation


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--retrieved-at', required=True)
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'data' / 'geography'
    target.mkdir(parents=True, exist_ok=True)
    features, inputs = [], []
    for relation_id, (code, name) in RELATIONS.items():
        raw = (args.directory / f'astana-osm-{relation_id}.json').read_bytes()
        shape, relation = geometry(json.loads(raw.decode('utf-8-sig')), relation_id)
        source_url = f'https://www.openstreetmap.org/relation/{relation_id}'
        features.append({'type': 'Feature', 'id': str(relation_id), 'geometry': shape,
                         'properties': {'code': code, 'name': name, 'source_url': source_url}})
        inputs.append({'relation_id': relation_id, 'version': relation['version'],
                       'relation_modified_at': relation['timestamp'],
                       'download_url': f'https://www.openstreetmap.org/api/0.6/relation/{relation_id}/full.json',
                       'sha256': hashlib.sha256(raw).hexdigest()})
    snapshot = {'type': 'FeatureCollection', 'features': features,
                'boundary_version': f'astana-osm-{args.retrieved_at}',
                'source_snapshot_at': args.retrieved_at, 'retrieved_at': args.retrieved_at,
                'attribution': '© OpenStreetMap contributors',
                'license_url': 'https://opendatacommons.org/licenses/odbl/1-0/'}
    (target / 'astana-districts.geojson').write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf-8')
    (target / 'sources.json').write_text(json.dumps(inputs, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
