import os

print("Starting deep C:\\ drive search...")
found = False

# We walk through C:\ but exclude directories we shouldn't search to avoid slow downs
exclude_dirs = {
    "node_modules", ".git", "Cache", "cache", "GPUCache", "Code Cache", 
    "DawnGraphiteCache", "DawnWebGPUCache", "Windows", "$Recycle.Bin", 
    "System Volume Information", "Documents and Settings", "ProgramData"
}

for root, dirs, files in os.walk("C:\\"):
    # Skip excluded dirs
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    
    for d in dirs:
        if "googlecloudtools.datacloud" in d.lower():
            print("Found Directory:", os.path.join(root, d))
            found = True
            
if not found:
    print("Could not find googlecloudtools.datacloud folder anywhere on C:\\")
