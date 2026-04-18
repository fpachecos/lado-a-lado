#!/usr/bin/env python3
"""
Gera imagem via Gemini API usando imagem de referência + prompt.

Uso:
    GEMINI_API_KEY=... python3 gemini_gen_with_image.py "<prompt>" <input_image.png> <output.png>
"""
import os, sys, base64, json, urllib.request, urllib.error

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
PROMPT = sys.argv[1]
INPUT_IMAGE = sys.argv[2]
OUTPUT = sys.argv[3]

MODELS = [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
]

with open(INPUT_IMAGE, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

mime = "image/png" if INPUT_IMAGE.endswith(".png") else "image/jpeg"

for model_id in MODELS:
    try:
        print(f"Tentando {model_id}...", file=sys.stderr)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GEMINI_API_KEY}"
        payload = json.dumps({
            "contents": [{
                "parts": [
                    {"text": PROMPT},
                    {"inlineData": {"mimeType": mime, "data": img_b64}}
                ]
            }],
            "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
        }).encode()
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=120)
        data = json.load(resp)
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_bytes = base64.b64decode(part["inlineData"]["data"])
                    with open(OUTPUT, "wb") as f:
                        f.write(img_bytes)
                    print(f"OK: {OUTPUT} (modelo: {model_id})")
                    sys.exit(0)
        print(f"{model_id}: sem imagem na resposta", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"{model_id} HTTP {e.code}: {e.read().decode()[:300]}", file=sys.stderr)
    except Exception as e:
        print(f"{model_id} erro: {e}", file=sys.stderr)

print("ERRO: nenhum modelo gerou imagem com input", file=sys.stderr)
sys.exit(1)
