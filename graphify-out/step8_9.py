import sys, json
from pathlib import Path
from datetime import datetime, timezone

try:
    from graphify.benchmark import run_benchmark, print_benchmark
    detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8-sig'))
    if detection['total_words'] > 5000:
        result = run_benchmark('graphify-out/graph.json', corpus_words=detection['total_words'])
        print_benchmark(result)
except Exception as e:
    print(f"Benchmark skipped: {e}")

from graphify.detect import save_manifest
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8-sig'))
save_manifest(detect.get('files', {}))

extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
if cost_path.exists():
    cost = json.loads(cost_path.read_text(encoding='utf-8'))
else:
    cost = {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}

cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2), encoding='utf-8')

print(f'This run: {input_tok:,} input tokens, {output_tok:,} output tokens')
print(f'All time: {cost["total_input_tokens"]:,} input, {cost["total_output_tokens"]:,} output ({len(cost["runs"])} runs)')
