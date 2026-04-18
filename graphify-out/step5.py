import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8-sig'))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

LABELS_DICT = {
    0: 'Electron Registry Manager',
    1: 'Auto Injector Execution',
    2: 'Knowledge MCP Server',
    3: 'App Planning & Rationale',
    4: 'UI Select Components',
    5: 'Logs Management',
    6: 'MCP Manager',
    7: 'Knowledge Dropzone',
    8: 'Page Formatting & Drops',
    9: 'Settings Modal Config',
    10: 'UI Breadcrumb Components',
    11: 'UI Table Components',
    12: 'Registry Fetch Skills',
    13: 'CLI Discovery',
    14: 'Layout Titlebar',
    15: 'UI Badge Components',
    16: 'UI Popover Components',
    17: 'UI Sidebar Components',
    18: 'Agent Detail Components',
    19: 'Agent Provider Context'
}

labels = {}
for cid in communities:
    labels[cid] = LABELS_DICT.get(cid, f"Community {cid}")

questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}), encoding='utf-8')
print('Report updated with community labels')
