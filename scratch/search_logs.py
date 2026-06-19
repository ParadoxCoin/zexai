import os

log_dir = "C:\\Users\\MSİ\\AppData\\Roaming\\Antigravity IDE\\logs\\20260619T191506"
print(f"Searching logs in {log_dir}...")

for root, dirs, files in os.walk(log_dir):
    for f in files:
        if f.endswith(".log"):
            path = os.path.join(root, f)
            try:
                content = open(path, "r", encoding="utf-8", errors="ignore").read()
                if "googlecloudtools.datacloud" in content:
                    print(f"\n--- MATCH IN {f} ---")
                    for line in content.splitlines():
                        if "googlecloudtools.datacloud" in line:
                            print(line)
            except Exception as e:
                pass
