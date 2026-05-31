import json, re

remove_keys = [
    'staff_hint',
    'management_metric_hint', 
    'contact_admin_hint',
    'password_hint',
    'take_retake_hint',
    'start_ended_hint',
    'correct_full_points_hint',
    'raw_score_hint',
    'mcq_revealed_hint',
    'submit_redirect_hint',
    'select_exam_hint',
    'sessions_hint',
]

for lang_file in ['en.json', 'ja.json']:
    path = rf'c:\VS-Code\GraduationProject\FrontEnd\client\src\locales\lang\common\{lang_file}'
    try:
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
    except FileNotFoundError:
        print(f'{lang_file} not found, skipping')
        continue

    lines = text.split('\n')
    cleaned = []
    for line in lines:
        skip = False
        for key in remove_keys:
            if f'"{key}"' in line:
                skip = True
                break
        if not skip:
            cleaned.append(line)

    text = '\n'.join(l for l in cleaned if l.strip())
    text = re.sub(r',(\s*[}\]])', r'\1', text)

    data = json.loads(text)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'{lang_file} cleaned successfully')
