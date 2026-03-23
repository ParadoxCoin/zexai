from typing import List, Dict, Any

class RarityEngine:
    """
    Rarity Engine calculates the statistical rarity of NFT traits within a collection.
    Score formula: Rarity Score = 1 / (trait_count / total_items)
    """

    @staticmethod
    def calculate_collection_rarity(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculate rarity for a full collection of items before they are published.
        Each item is expected to have an 'attributes' list inside its metadata:
        [
            {"trait_type": "Background", "value": "Neon"},
            ...
        ]
        
        Returns the items list with injected 'rarity_score' and 'rarity_tier'.
        """
        total_items = len(items)
        if total_items == 0:
            return items

        # 1. Count trait frequencies
        trait_counts = {}
        for item in items:
            attributes = item.get("attributes", [])
            for attr in attributes:
                t_type = attr.get("trait_type")
                t_val = str(attr.get("value"))
                
                if t_type not in trait_counts:
                    trait_counts[t_type] = {}
                
                if t_val not in trait_counts[t_type]:
                    trait_counts[t_type][t_val] = 0
                
                trait_counts[t_type][t_val] += 1

        # 2. Calculate scores for each item
        for item in items:
            attributes = item.get("attributes", [])
            total_score = 0.0
            
            for attr in attributes:
                t_type = attr.get("trait_type")
                t_val = str(attr.get("value"))
                
                count = trait_counts[t_type][t_val]
                # Trait Rarity Score = 1 / (count / total_items)
                trait_score = 1.0 / (count / total_items)
                
                # Inject trait frequency percentage into the attribute
                attr["frequency_percent"] = round((count / total_items) * 100, 2)
                
                total_score += trait_score
                
            item["rarity_score"] = round(total_score, 2)
            item["rarity_tier"] = RarityEngine._determine_tier(total_score)
            
        return items

    @staticmethod
    def _determine_tier(score: float) -> str:
        """
        Determine human-readable rarity tier based on total score.
        Thresholds are arbitrary and can be adjusted based on average traits per item.
        Assuming 5-7 traits per item:
        Base score is ~5-7 if everything is 100% common.
        """
        if score < 15:
            return "Common"      # Grey
        elif score < 30:
            return "Uncommon"    # Green
        elif score < 60:
            return "Rare"        # Blue
        elif score < 120:
            return "Epic"        # Purple
        else:
            return "Legendary"   # Gold
