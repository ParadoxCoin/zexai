import os

print("Starting global deep search...")
found = False

paths_to_search = [
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData"
]

exclude_dirs = {"node_modules", ".git", "Cache", "cache", "GPUCache", "Code Cache", "DawnGraphiteCache", "DawnWebGPUCache"}

for search_path in paths_to_search:
    if not os.path.exists(search_path):
        continue
    for root, dirs, files in os.walk(search_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for d in dirs:
            if "googlecloudtools" in d.lower() or "datacloud" in d.lower():
                print("Found Directory:", os.path.join(root, d))
                found = True
        for f in files:
            if "mcp_proxy_bundle" in f.lower():
                print("Found File:", os.path.join(root, f))
                found = True

if not found:
    print("No matches found in global directories.")
