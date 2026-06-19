import os

print("Searching everywhere for mcp_proxy_bundle.js...")
found = False

# Search in typical locations where extensions might be stored
search_paths = [
    "C:\\Users",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData",
    "C:\\AppData"
]

exclude_dirs = {
    "node_modules", ".git", "Cache", "cache", "GPUCache", "Code Cache", 
    "DawnGraphiteCache", "DawnWebGPUCache", "Windows", "$Recycle.Bin", 
    "System Volume Information"
}

for base in search_paths:
    if not os.path.exists(base):
        continue
    for root, dirs, files in os.walk(base):
        # Skip excluded dirs
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.lower() == "mcp_proxy_bundle.js":
                print("FOUND FILE AT:", os.path.join(root, f))
                found = True

if not found:
    print("Could not find the file anywhere.")
