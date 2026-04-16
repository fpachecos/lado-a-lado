#!/usr/bin/env python3
"""
Gera imagem via Gemini API e salva no caminho especificado.

Uso:
    GEMINI_API_KEY=... python3 gemini_gen.py "<prompt em inglês>" <output.png>

Tenta modelos em ordem de preferência e faz fallback automático.
"""
import os, sys, base64, json, urllib.request, urllib.error

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
PROMPT = sys.argv[1]
OUTPUT = sys.argv[2]

MODELS = [
    ("gemini", "gemini-2.5-flash-image"),
    ("gemini", "gemini-3.1-flash-image-preview"),
    ("imagen", "imagen-4.0-fast-generate-001"),
]

def try_gemini(model_id):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GEMINI_API_KEY}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": PROMPT}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=120)
    data = json.load(resp)
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                return base64.b64decode(part["inlineData"]["data"])
    return None

def try_imagen(model_id):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:predict?key={GEMINI_API_KEY}"
    payload = json.dumps({
        "instances": [{"prompt": PROMPT}],
        "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=120)
    data = json.load(resp)
    predictions = data.get("predictions", [])
    if predictions:
        b64 = predictions[0].get("bytesBase64Encoded", "")
        if b64:
            return base64.b64decode(b64)
    return None

for kind, model_id in MODELS:
    try:
        print(f"Tentando {model_id}...", file=sys.stderr)
        img_bytes = try_gemini(model_id) if kind == "gemini" else try_imagen(model_id)
        if img_bytes:
            with open(OUTPUT, "wb") as f:
                f.write(img_bytes)
            print(f"OK: {OUTPUT} (modelo: {model_id})")
            sys.exit(0)
        else:
            print(f"{model_id}: sem imagem na resposta", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"{model_id} HTTP {e.code}: {e.read().decode()[:300]}", file=sys.stderr)
    except Exception as e:
        print(f"{model_id} erro: {e}", file=sys.stderr)

print("ERRO: nenhum modelo gerou imagem", file=sys.stderr)
sys.exit(1)
