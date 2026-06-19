import os
import re

def main():
    root = "c:/Users/MSİ/Desktop/ZexAi/Zex/backend"
    pattern = re.compile(r"user_connectors", re.IGNORECASE)
    
    print("Searching for 'user_connectors' in python files:")
    for dirpath, _, filenames in os.walk(root):
        # Skip virtual envs
        if ".venv" in dirpath or "node_modules" in dirpath:
            continue
        for f in filenames:
            if f.endswith(".py"):
                path = os.path.join(dirpath, f)
                try:
                    with open(path, "r", encoding="utf-8") as file:
                        for i, line in enumerate(file, 1):
                            if pattern.search(line):
                                print(f" - {os.path.relpath(path, root)}:{i} -> {line.strip()[:100]}")
                except Exception:
                    pass

if __name__ == "__main__":
    main()
