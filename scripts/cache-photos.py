"""Cache reviewed catalogue assets. Failed sources remain explicit UI fallbacks."""
import concurrent.futures, json, urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'assets/photo-sources.json').read_text(encoding='utf-8'))
def fetch(entry):
    key,photo=entry
    try:
        req=urllib.request.Request(photo['remote'],headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=20) as response:
            raw=response.read(15_000_000)
        ext='jpg' if raw.startswith(b'\xff\xd8\xff') else 'png' if raw.startswith(b'\x89PNG') else 'webp' if raw[:4]==b'RIFF' and raw[8:12]==b'WEBP' else None
        if not ext: raise ValueError('Not an image')
        target=root/'assets/photos'/f'{key}.{ext}';target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(raw)
        photo['local']=f'assets/photos/{key}.{ext}'
        return key,photo
    except Exception as e:
        print(key,'unavailable:',type(e).__name__)
        return key,photo
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    result=dict(pool.map(fetch,manifest.items()))
(root/'assets/photo-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'photos.js').write_text("'use strict';\nwindow.GymPhotos="+json.dumps(result,ensure_ascii=False,indent=2)+";\n",encoding='utf-8')
print('Cached',sum('local' in x for x in result.values()),'of',len(result))
