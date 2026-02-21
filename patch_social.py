import os
import re

filepath = os.path.join('backend', 'services', 'social_service.py')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

funcs_to_patch = [
    'get_user_interaction_status',
    'toggle_like',
    'get_like_count',
    'is_liked_by_user',
    'record_share',
    'get_share_count',
    'add_comment',
    'get_comments',
    'get_content_stats'
]

for func in funcs_to_patch:
    pattern = rf'(def {func}\([^)]*content_id: str[^)]*\).*?:\s*\"\"\"[^\"]*\"\"\"\n)(\s*)'
    def replacer(m):
        indent = m.group(2)
        return m.group(1) + indent + "content_id = content_id.split('_')[0] if isinstance(content_id, str) and '_' in content_id else content_id\n" + indent
        
    content = re.sub(pattern, replacer, content, count=1, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully')
