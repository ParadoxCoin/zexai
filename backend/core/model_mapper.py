"""
Model Mapper Service
Handles the translation of generic user parameters (duration, resolution, etc.)
into provider-specific API payloads or SKU switches.
"""
from typing import Dict, Any, Optional
from core.logger import app_logger as logger

class ModelMapper:
    """
    Resolves user-friendly parameters into provider-specific configurations
    based on the 'capabilities' JSON schema defined in the database.
    """
    
    @staticmethod
    def resolve_payload(model: Dict[str, Any], user_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Constructs the API payload for the provider.
        
        Args:
            model: The full model record from DB (including 'capabilities').
            user_params: The dictionary of parameters selected by the user (e.g. {'duration': 6}).
            
        Returns:
            A dictionary containing the 'model' ID to use and arguments to pass.
            Example: { "model": "veo-6s", "prompt": "..." } OR { "model": "veo", "duration": 6 }
        """
        capabilities = model.get("capabilities", {})
        parameters_config = capabilities.get("parameters", {})
        
        # Start with default provider model ID
        # If 'provider_model_id' is missing, fallback to 'name' (legacy)
        provider_model_id = model.get("provider_model_id", model.get("name"))
        
        payload = {
            "model": provider_model_id
        }
        
        # Iterate through defined capabilities/parameters
        for param_name, config in parameters_config.items():
            # Get user value or default
            user_value = user_params.get(param_name)
            
            # If user didn't provide value, use default
            if user_value is None:
                user_value = config.get("default")
                
            if user_value is None:
                continue # No value to map
                
            mapping_type = config.get("mapping_type", "argument")
            
            # Strategy 1: ARGUMENT - Pass directly to API
            if mapping_type == "argument":
                # Some APIs might need key aliasing (e.g. 'duration' -> 'len')
                api_key = config.get("api_key", param_name)
                payload[api_key] = user_value
                
            # Strategy 2: SKU_SWITCH - Change the model ID entirely
            elif mapping_type == "sku_switch":
                sku_map = config.get("sku_map", {})
                # Convert value to string for lookup if needed
                val_str = str(user_value)
                if val_str in sku_map:
                    payload["model"] = sku_map[val_str]
                else:
                    logger.warning(f"SKU mapping not found for {param_name}={val_str} in model {model.get('id')}")
            
            # Strategy 3: SUFFIX - Append to model ID
            elif mapping_type == "sku_suffix":
                suffix_map = config.get("suffix_map", {})
                val_str = str(user_value)
                suffix = suffix_map.get(val_str, "")
                payload["model"] = f"{payload['model']}{suffix}"
                
        # Merge any other explicit user params that are NOT in capabilities 
        # (Be careful not to pass unknown params to strict APIs)
        # For now, we only map what is explicitly known or standard fields like prompt.
        
        return payload

# Global instance
model_mapper = ModelMapper()
