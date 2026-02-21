import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prompt_enhancer import prompt_enhancer

async def test_construction_prompts():
    print("Testing Construction Prompts...")
    
    # Test template enhancement (offline/fallback mode which is deterministic)
    # We can force this by not having keys or just trusting the logic defaults to template if keys fail/aren't set in this context
    # But `prompt_enhancer` tries keys first.
    # To test specifically the template logic we modified, we can call _template_enhance directly
    
    result = prompt_enhancer._template_enhance("Modern Villa", "construction")
    
    if not result["success"]:
        print("FAILED: Result not successful")
        return
        
    prompts = result["enhanced_prompts"]
    print(f"Generated {len(prompts)} prompts")
    
    expected_phases = [
        "1. Konsept Tasarım", 
        "2. Mimari Proje", 
        "3. Yapısal Sistem", 
        "4. MEP Sistemleri", 
        "5. İç Mekan & Detaylar", 
        "6. Peyzaj & Çevre"
    ]
    
    all_found = True
    for i, p in enumerate(prompts):
        print(f"  {i+1}. {p['style']}: {p['prompt'][:50]}...")
        if p['style'] not in expected_phases:
            print(f"    WARNING: Unexpected style '{p['style']}'")
            
    if len(prompts) == 6:
        print("SUCCESS: 6 phases generated")
    else:
        print(f"FAILED: Expected 6 phases, got {len(prompts)}")

if __name__ == "__main__":
    asyncio.run(test_construction_prompts())
