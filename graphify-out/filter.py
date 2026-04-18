import json
from pathlib import Path

d = json.load(open('graphify-out/.graphify_detect.json', encoding='utf-8-sig'))

new_files = {}
removed_count = 0
for k, v in d.get('files', {}).items():
    new_v = []
    for f in v:
        f_norm = f.replace('\\', '/')
        if not f_norm.startswith('registry/'):
            new_v.append(f)
        else:
            removed_count += 1
    if new_v:
        new_files[k] = new_v

d['files'] = new_files
d['total_files'] = sum(len(v) for v in new_files.values())

with open('graphify-out/.graphify_detect.json', 'w', encoding='utf-8') as f:
    json.dump(d, f)

print(f"Removed {removed_count} files from registry/")
print(f"New total: {d['total_files']} files")
