import os
import json
import csv
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Lütfen .env dosyasında SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY değişkenlerini tanımlayın.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def export_airdrops():
    print("🔍 Supabase'den dağıtılmamış airdrop kayıtları çekiliyor...")
    
    # Sadece henüz dağıtılmamış olanları getir
    response = supabase.table("presale_referrals").select("*").eq("distributed", False).execute()
    
    records = response.data
    if not records:
        print("✅ Dağıtılacak yeni bir airdrop kaydı bulunamadı.")
        return

    # Cüzdan adreslerine göre ZEX miktarlarını topla
    airdrop_map = {}
    for row in records:
        wallet = row["referrer_wallet"]
        amount = float(row["zex_amount"])
        
        if wallet in airdrop_map:
            airdrop_map[wallet] += amount
        else:
            airdrop_map[wallet] = amount

    # Dosya adını oluştur
    date_str = datetime.now().strftime("%Y-%m-%d")
    csv_filename = f"airdrops_{date_str}.csv"
    json_filename = f"airdrops_{date_str}.json"

    # CSV olarak kaydet
    with open(csv_filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Address", "Amount"])
        for wallet, total_amount in airdrop_map.items():
            writer.writerow([wallet, f"{total_amount:.2f}"])

    # JSON olarak kaydet
    with open(json_filename, mode='w') as file:
        json_data = [{"address": wallet, "amount": f"{amount:.2f}"} for wallet, amount in airdrop_map.items()]
        json.dump(json_data, file, indent=4)

    print(f"🎉 Başarılı! Toplam {len(airdrop_map)} cüzdan için airdrop dosyaları oluşturuldu.")
    print(f"📄 CSV Dosyası: {csv_filename}")
    print(f"📄 JSON Dosyası: {json_filename}")

    # Kullanıcıdan onay al
    confirm = input("\n⚠️ Bu kayıtları veritabanında 'Dağıtıldı' (distributed=true) olarak işaretlemek istiyor musunuz? (Y/N): ")
    
    if confirm.strip().lower() == 'y':
        # Kayıtları güncelle
        record_ids = [row["id"] for row in records]
        
        # Supabase in sorgusu ile toplu güncelleme
        update_response = supabase.table("presale_referrals").update({"distributed": True}).in_("id", record_ids).execute()
        
        print(f"✅ {len(update_response.data)} kayıt başarıyla güncellendi!")
    else:
        print("ℹ️ Hiçbir kayıt güncellenmedi. Bir sonraki dışa aktarmada bu kayıtlar tekrar görünecektir.")

if __name__ == "__main__":
    export_airdrops()
