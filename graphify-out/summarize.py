import json
from collections import defaultdict
from pathlib import Path

d = json.load(open('graphify-out/.graphify_detect.json', encoding='utf-8-sig'))

counts = defaultdict(int)
for f_list in d.get('files', {}).values():
    for f in f_list:
        counts[str(Path(f).parent)] += 1

sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
print("Top 5 subdirectories by file count:")
for dir_path, count in sorted_counts[:5]:
    print(f"  {dir_path}: {count} files")
