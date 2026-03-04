"""
Ethereum / Polygon Web3 Integration Service for Staking Verification
Handles signature verification and on-chain checks.
"""
import os
from datetime import datetime
from typing import Dict, Any, Tuple
from web3 import Web3
from eth_account.messages import encode_defunct

from core.logger import app_logger as logger
from core.database import get_database
from core.credits import CreditManager
from core.config import settings

# ZexStaking V2 ABI (Minimal needed to get Staker Info)
STAKING_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "getStakerInfo",
        "outputs": [
            {"internalType": "uint256", "name": "balance", "type": "uint256"},
            {"internalType": "uint256", "name": "currentEarned", "type": "uint256"},
            {"internalType": "uint256", "name": "lockupEnd", "type": "uint256"},
            {"internalType": "bool", "name": "isLocked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

ZEX_STAKING_ADDRESS = os.environ.get("ZEX_STAKING_ADDRESS", "0x6cBF98411AFd652E6AC01E18F6158B519Fb59410")
POLYGON_RPC_URL = os.environ.get("POLYGON_RPC_URL", "https://polygon-mainnet.g.alchemy.com/v2/4OECI-BgprApuDWzNqcNL")

# Connect to Polygon RPC
try:
    w3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))
    if not w3.is_connected():
        logger.warning(f"Could not connect to {POLYGON_RPC_URL}. Web3 integration might fail.")
    staking_contract = w3.eth.contract(address=w3.to_checksum_address(ZEX_STAKING_ADDRESS), abi=STAKING_ABI)
except Exception as e:
    logger.error(f"Failed to initialize Web3: {e}")
    w3 = None
    staking_contract = None


class StakingService:
    
    @staticmethod
    def verify_metamask_signature(wallet_address: str, message: str, signature: str) -> bool:
        """Verifies if the signature was actually signed by wallet_address"""
        try:
            message_hash = encode_defunct(text=message)
            signer_address = w3.eth.account.recover_message(message_hash, signature=signature)
            return signer_address.lower() == wallet_address.lower()
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False

    @staticmethod
    def get_staked_balance(wallet_address: str) -> float:
        """Calls the Polygon contract to fetch user's staked ZEX amount. Returns human-readable format."""
        if not staking_contract:
            logger.error("Web3 Provider is not initialized.")
            return 0.0
            
        try:
            checksum_addr = w3.to_checksum_address(wallet_address)
            # Returns: (balance, currentEarned, lockupEnd, isLocked)
            info = staking_contract.functions.getStakerInfo(checksum_addr).call()
            # Convert Wei to ZEX
            return float(w3.from_wei(info[0], 'ether'))
        except Exception as e:
            logger.error(f"Failed to fetch staked balance from contract for {wallet_address}: {e}")
            return 0.0

    @staticmethod
    def get_tier_for_balance(staked_balance: float) -> Tuple[str, int]:
        """Returns the tier name and the monthly credit reward for the given balance."""
        if staked_balance >= 50000:
            return "Diamond", 15000
        elif staked_balance >= 10000:
            return "Gold", 3000
        elif staked_balance >= 2000:
            return "Silver", 500
        elif staked_balance >= 500:
            return "Bronze", 100
        return "None", 0

    @staticmethod
    async def process_monthly_claim(db, user_id: str, wallet_address: str, message: str, signature: str) -> Dict[str, Any]:
        """Validates the claim request and rewards platform credits if eligible."""
        
        # 1. Verify cryptographic signature to prove ownership of the wallet
        if not StakingService.verify_metamask_signature(wallet_address, message, signature):
            return {"success": False, "message": "Geçersiz MetaMask imzası. Cüzdan doğrulaması başarısız oldu."}

        # 2. Check if the user already claimed this month
        current_month = datetime.utcnow().strftime('%Y-%m')
        
        try:
            # Check Supabase records for a claim this month by this specific user
            claim_check = db.table("staking_claims").select("*").eq("user_id", user_id).eq("claim_month", current_month).execute()
            if claim_check.data and len(claim_check.data) > 0:
                return {"success": False, "message": "Bu ay için hak ettiğiniz AI Kredilerini zaten talep ettiniz. Gelecek ay tekrar deneyin."}
        except Exception as e:
            # Table might not exist yet, we will create it / handle gracefully.
            logger.warning(f"Error checking staking claims table, it might not exist: {e}")

        # 3. Read Staked Balance directly from Polygon Mainnet Blockchain
        staked_balance = StakingService.get_staked_balance(wallet_address)
        if staked_balance < 500:
            return {
                "success": False, 
                "message": f"Kredi kazanabilmek için ZexStaking kontratında en az 500 ZEX kilitli tutmalısınız. Sizin miktarınız: {staked_balance} ZEX"
            }

        # 4. Calculate Tier and Credits
        tier_name, credits_to_reward = StakingService.get_tier_for_balance(staked_balance)

        # 5. Add Credits to User via CreditManager
        try:
            await CreditManager.add_credits(db, user_id, credits_to_reward, reason=f"Staking Reward ({tier_name} Tier) - {current_month}")
            
            # Record the claim so they can't do it again this month
            try:
                db.table("staking_claims").insert({
                    "user_id": user_id,
                    "wallet_address": wallet_address,
                    "claimed_amount": credits_to_reward,
                    "tier": tier_name,
                    "claim_month": current_month,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                logger.error(f"Failed to record staking claim row: {e}")
                
            return {
                "success": True,
                "message": f"Tebrikler! Staking miktarınıza göre {tier_name} seviyesinden {credits_to_reward} AI Kredisi hesabınıza tanımlandı.",
                "tier": tier_name,
                "rewarded_credits": credits_to_reward
            }
        except Exception as e:
            logger.error(f"Failed to add staking credits for {user_id}: {e}")
            return {"success": False, "message": "Sistemsel bir hata oluştu. Krediler eklenemedi."}
