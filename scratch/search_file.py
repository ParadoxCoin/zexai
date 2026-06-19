import os

def search_file(filename, search_path):
    print(f"Searching for {filename} in {search_path}...")
    matches = []
    for root, dirs, files in os.walk(search_path):
        if filename in files:
            path = os.path.join(root, filename)
            print(f"Found: {path}")
            matches.append(path)
    return matches

search_paths = [
    "C:\\Users\\MSİ\\.antigravity-ide",
    "C:\\Users\\MSİ\\AppData\\Local\\Programs\\antigravity",
    "C:\\Users\\MSİ\\.gemini",
]

for p in search_paths:
    if os.path.exists(p):
        search_file("mcp_proxy_bundle.js", p)
