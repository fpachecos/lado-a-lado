#!/usr/bin/env python3
"""
Publica imagem única, carrossel ou reel no Instagram via Meta Graph API.

Uso:
    # Imagem única
    META_ACCESS_TOKEN=... python3 publish_instagram.py \
        --tipo imagem \
        --imagens https://litter.catbox.moe/abc.jpg \
        --legenda "Texto da legenda com #hashtags"

    # Carrossel
    META_ACCESS_TOKEN=... python3 publish_instagram.py \
        --tipo carrossel \
        --imagens https://url1.jpg https://url2.jpg https://url3.jpg \
        --legenda "Texto da legenda"

    # Reel por URL pública
    META_ACCESS_TOKEN=... python3 publish_instagram.py \
        --tipo reel \
        --video https://litter.catbox.moe/abc.mp4 \
        --legenda "Texto da legenda"

    # Reel por arquivo local (upload binário direto para Meta)
    META_ACCESS_TOKEN=... python3 publish_instagram.py \
        --tipo reel \
        --video-file /caminho/para/video.mp4 \
        --legenda "Texto da legenda"

    # Dry-run (só cria containers, não publica)
    ... --dry-run

Variáveis de ambiente:
    META_ACCESS_TOKEN  — obrigatório
    IG_USER_ID         — opcional, padrão: 17841434375697785

Saída:
    Imprime o Instagram media ID ao final.
"""
import os, sys, json, time, argparse, urllib.request, urllib.parse, urllib.error

IG_USER_ID = os.environ.get("IG_USER_ID", "17841434375697785")
TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
BASE = "https://graph.facebook.com/v22.0"
RUPLOAD_BASE = "https://rupload.facebook.com/ig-api-upload/v25.0"


def api_post(path, data):
    data["access_token"] = TOKEN
    payload = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=payload)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)


def api_get(path, fields="status_code"):
    params = urllib.parse.urlencode({"access_token": TOKEN, "fields": fields})
    req = urllib.request.Request(f"{BASE}{path}?{params}")
    resp = urllib.request.urlopen(req, timeout=30)
    return json.load(resp)


def wait_finished(container_id, label="container", max_attempts=40, interval=5):
    for _ in range(max_attempts):
        d = api_get(f"/{container_id}")
        status = d.get("status_code", "")
        print(f"  {label} [{container_id}]: {status}")
        if status == "FINISHED":
            return True
        if status == "ERROR":
            print(f"  ERRO no container: {d}", file=sys.stderr)
            return False
        time.sleep(interval)
    print(f"  Timeout aguardando {container_id}", file=sys.stderr)
    return False


def publicar_imagem_unica(url, legenda, dry_run=False):
    print(f"Criando container (imagem única)...")
    r = api_post(f"/{IG_USER_ID}/media", {"image_url": url, "caption": legenda})
    container_id = r.get("id")
    if not container_id:
        print(f"ERRO: {r}", file=sys.stderr); sys.exit(1)
    print(f"  Container ID: {container_id}")

    if not wait_finished(container_id, "Imagem"):
        sys.exit(1)

    if dry_run:
        print(f"[dry-run] Container pronto: {container_id}")
        return container_id

    print("Publicando...")
    r = api_post(f"/{IG_USER_ID}/media_publish", {"creation_id": container_id})
    post_id = r.get("id")
    if post_id:
        print(f"✅ Publicado! Instagram ID: {post_id}")
        return post_id
    else:
        print(f"ERRO ao publicar: {r}", file=sys.stderr); sys.exit(1)


def publicar_carrossel(urls, legenda, dry_run=False):
    # 1. Criar containers filhos
    child_ids = []
    for i, url in enumerate(urls, 1):
        print(f"Criando container filho slide {i}/{len(urls)}...")
        r = api_post(f"/{IG_USER_ID}/media", {"image_url": url, "is_carousel_item": "true"})
        cid = r.get("id")
        if not cid:
            print(f"ERRO: {r}", file=sys.stderr); sys.exit(1)
        child_ids.append(cid)
        print(f"  ID: {cid}")
        time.sleep(2)

    # 2. Aguardar todos FINISHED
    print("\nAguardando containers filhos ficarem FINISHED...")
    for i, cid in enumerate(child_ids, 1):
        if not wait_finished(cid, f"Slide {i}"):
            sys.exit(1)

    # 3. Criar container do carrossel
    print("\nCriando container do carrossel...")
    r = api_post(f"/{IG_USER_ID}/media", {
        "media_type": "CAROUSEL",
        "children": ",".join(child_ids),
        "caption": legenda,
    })
    carousel_id = r.get("id")
    if not carousel_id:
        print(f"ERRO: {r}", file=sys.stderr); sys.exit(1)
    print(f"Carousel container ID: {carousel_id}")

    if not wait_finished(carousel_id, "Carousel"):
        sys.exit(1)

    if dry_run:
        print(f"[dry-run] Carousel pronto: {carousel_id}")
        return carousel_id

    # 4. Publicar
    print("\nPublicando...")
    r = api_post(f"/{IG_USER_ID}/media_publish", {"creation_id": carousel_id})
    post_id = r.get("id")
    if post_id:
        print(f"✅ Publicado! Instagram ID: {post_id}")
        return post_id
    else:
        print(f"ERRO ao publicar: {r}", file=sys.stderr); sys.exit(1)


def publicar_reel(video_url, legenda, dry_run=False):
    print(f"Criando container (reel via URL)...")
    r = api_post(f"/{IG_USER_ID}/media", {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": legenda,
    })
    container_id = r.get("id")
    if not container_id:
        print(f"ERRO: {r}", file=sys.stderr); sys.exit(1)
    print(f"  Container ID: {container_id}")

    if not wait_finished(container_id, "Reel", max_attempts=60, interval=10):
        sys.exit(1)

    if dry_run:
        print(f"[dry-run] Container pronto: {container_id}")
        return container_id

    print("Publicando...")
    r = api_post(f"/{IG_USER_ID}/media_publish", {"creation_id": container_id})
    post_id = r.get("id")
    if post_id:
        print(f"✅ Publicado! Instagram ID: {post_id}")
        return post_id
    else:
        print(f"ERRO ao publicar: {r}", file=sys.stderr); sys.exit(1)


def publicar_reel_arquivo(video_path, legenda, dry_run=False):
    """Upload binário direto para Meta — evita dependência de hosting externo."""
    file_size = os.path.getsize(video_path)
    print(f"Criando container (reel via upload binário, {file_size} bytes)...")

    init_data = urllib.parse.urlencode({
        "access_token": TOKEN,
        "media_type": "REELS",
        "upload_type": "resumable",
        "caption": legenda,
        "video_size": str(file_size),
    }).encode()
    req = urllib.request.Request(f"{BASE}/{IG_USER_ID}/media", data=init_data)
    try:
        r = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr); sys.exit(1)

    container_id = r.get("id")
    upload_uri = r.get("uri")
    if not container_id or not upload_uri:
        print(f"ERRO ao inicializar sessão: {r}", file=sys.stderr); sys.exit(1)
    print(f"  Container ID: {container_id}")

    with open(video_path, "rb") as f:
        video_data = f.read()

    upload_req = urllib.request.Request(upload_uri, data=video_data, method="POST")
    upload_req.add_header("Authorization", f"OAuth {TOKEN}")
    upload_req.add_header("Content-Type", "application/octet-stream")
    upload_req.add_header("Content-Length", str(file_size))
    upload_req.add_header("offset", "0")
    upload_req.add_header("file_size", str(file_size))
    print("  Enviando vídeo...")
    try:
        upload_result = json.load(urllib.request.urlopen(upload_req, timeout=180))
        if not upload_result.get("success"):
            print(f"ERRO no upload: {upload_result}", file=sys.stderr); sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr); sys.exit(1)

    if not wait_finished(container_id, "Reel", max_attempts=60, interval=10):
        sys.exit(1)

    if dry_run:
        print(f"[dry-run] Container pronto: {container_id}")
        return container_id

    print("Publicando...")
    r = api_post(f"/{IG_USER_ID}/media_publish", {"creation_id": container_id})
    post_id = r.get("id")
    if post_id:
        print(f"✅ Publicado! Instagram ID: {post_id}")
        return post_id
    else:
        print(f"ERRO ao publicar: {r}", file=sys.stderr); sys.exit(1)


def main():
    if not TOKEN:
        print("ERRO: META_ACCESS_TOKEN não definido", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Publica no Instagram via Meta Graph API")
    parser.add_argument("--tipo", choices=["imagem", "carrossel", "reel"], required=True)
    parser.add_argument("--imagens", nargs="+", help="URLs públicas das imagens")
    parser.add_argument("--video", help="URL pública do vídeo (para reel via URL)")
    parser.add_argument("--video-file", help="Caminho local do vídeo (upload binário direto para Meta)")
    parser.add_argument("--legenda", required=True, help="Legenda do post")
    parser.add_argument("--dry-run", action="store_true", help="Cria containers mas não publica")
    args = parser.parse_args()

    if args.tipo == "imagem":
        if not args.imagens or len(args.imagens) != 1:
            print("ERRO: imagem única requer exatamente 1 URL via --imagens", file=sys.stderr); sys.exit(1)
        publicar_imagem_unica(args.imagens[0], args.legenda, args.dry_run)
    elif args.tipo == "carrossel":
        if not args.imagens or len(args.imagens) < 2 or len(args.imagens) > 10:
            print("ERRO: carrossel requer 2–10 URLs via --imagens", file=sys.stderr); sys.exit(1)
        publicar_carrossel(args.imagens, args.legenda, args.dry_run)
    else:  # reel
        if args.video_file:
            publicar_reel_arquivo(args.video_file, args.legenda, args.dry_run)
        elif args.video:
            publicar_reel(args.video, args.legenda, args.dry_run)
        else:
            print("ERRO: reel requer --video <url> ou --video-file <caminho>", file=sys.stderr); sys.exit(1)


if __name__ == "__main__":
    main()
