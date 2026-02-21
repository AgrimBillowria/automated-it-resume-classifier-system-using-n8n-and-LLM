import os
import json

def get_dir_size(path):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                total_size += os.path.getsize(fp)
    return total_size

def count_lines(filepath):
    try:
        with open(filepath, 'r', errors='ignore') as f:
            return sum(1 for _ in f)
    except:
        return 0

stats = {
    'structure': {},
    'languages': {},
    'total_size': 0,
    'total_lines': 0
}

root_dir = '.'
ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', '.agent', '.conda', 'build', 'dist', 'coverage'}
ignore_exts = {'.log', '.pid', '.pyc', '.DS_Store', '.map', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pkl'}

# Analyze root directories sizes
for item in os.listdir(root_dir):
    if item in ignore_dirs: continue
    path = os.path.join(root_dir, item)
    if os.path.isdir(path):
        size = get_dir_size(path)
        stats['structure'][item] = {'type': 'dir', 'size': size}
    else:
        stats['structure'][item] = {'type': 'file', 'size': os.path.getsize(path)}

# Count lines
for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in ignore_exts: continue
        
        filepath = os.path.join(root, file)
        lines = count_lines(filepath)
        size = os.path.getsize(filepath)
        
        lang = 'Other'
        if ext == '.py': lang = 'Python'
        elif ext in ['.js', '.jsx', '.ts', '.tsx']: lang = 'JavaScript/TypeScript'
        elif ext == '.html': lang = 'HTML'
        elif ext == '.css': lang = 'CSS'
        elif ext == '.md': lang = 'Markdown'
        elif ext == '.json': lang = 'JSON'
        
        if lang not in stats['languages']:
            stats['languages'][lang] = {'lines': 0, 'files': 0, 'size': 0}
        
        stats['languages'][lang]['lines'] += lines
        stats['languages'][lang]['files'] += 1
        stats['languages'][lang]['size'] += size
        stats['total_lines'] += lines
        stats['total_size'] += size

print(json.dumps(stats, indent=2))
