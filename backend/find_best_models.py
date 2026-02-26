from dotenv import load_dotenv
load_dotenv()
import httpx, json

r = httpx.get('https://openrouter.ai/api/v1/models')
models = r.json().get('data', [])

brands = {
    'openai': [], 'anthropic': [], 'google': [], 'deepseek': [],
    'x-ai': [], 'qwen': [], 'mistralai': [], 'minimax': [],
    'moonshotai': [], 'meta-llama': []
}

for m in models:
    prefix = m['id'].split('/')[0]
    if prefix in brands:
        # Skip free variants
        if ':free' in m['id']:
            continue
        brands[prefix].append({
            'id': m['id'],
            'name': m['name'],
            'ctx': m.get('context_length', 0),
            'price_prompt': m['pricing']['prompt'],
            'price_completion': m['pricing']['completion']
        })

for brand, ms in brands.items():
    # Sort by price descending (most expensive = most powerful usually)
    ms.sort(key=lambda x: float(x['price_prompt']), reverse=True)
    print(f"\n=== {brand} (Top 5 by price) ===")
    for m in ms[:5]:
        print(f"  {m['id']:60s} | {m['name'][:45]:45s} | ctx={m['ctx']:>8} | prompt=${m['price_prompt']}")
