
import asyncio
from core.database import get_db

async def check():
    db = await get_db()
    try:
        res = db.table('video_models').select('*').limit(1).execute()
        if res.data:
            print("Columns:", res.data[0].keys())
        else:
            print("Table empty, cannot check columns easily via select. Trying to get one row metadata.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
