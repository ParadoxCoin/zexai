import zipfile

zip_path = "C:\\Users\\MSİ\\Downloads\\antigravity.zip"
print(f"Reading {zip_path}...")
try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        names = z.namelist()
        print(f"Total files in zip: {len(names)}")
        matches = [n for n in names if "datacloud" in n.lower() or "mcp_proxy" in n.lower()]
        print(f"Matches found: {len(matches)}")
        for m in matches[:10]:
            print(" -", m)
except Exception as e:
    print(e)
