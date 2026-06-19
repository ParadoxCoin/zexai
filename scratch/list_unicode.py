import os

path = "C:\\Users\\MSİ\\.antigravity-ide\\extensions"
print(f"Listing {path}:")
if os.path.exists(path):
    for item in os.listdir(path):
        print(f"Name: {item} | Unicode: {item.encode('unicode_escape').decode('utf-8')}")
else:
    print("Path does not exist")
