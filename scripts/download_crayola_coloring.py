#!/usr/bin/env python3
"""
Descarga todas las imágenes de dibujos para colorear de colorearm.com.

Categorías:
  - animales-para-colorear
  - cartoons-para-colorear
  - ninos-para-colorear

Estructura de salida:
  descargas/
    animales-para-colorear/
      Mariposas/
        Mariposas4.webp
        ...
      Capibara/
        ...
    cartoons-para-colorear/
      Sonic-3/
        ...
    ninos-para-colorear/
      ...

Uso:
  pip install requests beautifulsoup4
  python descargar_colorearm.py

Opciones:
  --quiet          Menos output por pantalla
  --solo KEYWORD   Solo procesar la categoría que contenga esa palabra
                   Ej: --solo animales  |  --solo cartoons  |  --solo ninos
  --sin-delay      Sin pausas entre peticiones (más rápido, menos amable)
"""

import json
import os
import re
import sys
import time
import argparse
import requests
from urllib.parse import urlparse
from bs4 import BeautifulSoup

# ══════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════════

CATEGORIAS = [
    {
        "nombre":    "animales-para-colorear",
        "base_url":  "https://colorearm.com/animales-para-colorear/",
        "max_pages": 30,
    },
    {
        "nombre":    "cartoons-para-colorear",
        "base_url":  "https://colorearm.com/cartoons-para-colorear/",
        "max_pages": 30,
    },
    {
        "nombre":    "ninos-para-colorear",
        "base_url":  "https://colorearm.com/ninos-para-colorear/",
        "max_pages": 30,
    },
]

# Guardar directamente en frontend/public para que Vite sirva las imágenes
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.normpath(os.path.join(_SCRIPT_DIR, "..", "frontend", "public", "descargas"))
DELAY_PAGINAS     = 1.5    # segundos entre peticiones de páginas índice
DELAY_POSTS       = 1.2    # segundos entre peticiones de posts
DELAY_IMGS        = 0.3    # segundos entre descargas de imágenes
IMAGE_CDN         = "cdn.colorearm.com"

# Patrones en la URL de imagen que indican que NO es un dibujo
IMGS_EXCLUIR = [
    "chplay", "app-store", "in-app", "logo", "cropped-logo",
    "Mateo-Ramirez", "Erika", ".svg", "flag",
]

# Headers que imitan un navegador Firefox real para evitar bloqueos 403
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) "
        "Gecko/20100101 Firefox/126.0"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language":          "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
    # Accept-Encoding omitido: si se pone manualmente, requests no descomprime
    # la respuesta brotli y BeautifulSoup recibe bytes basura.
    "DNT":                      "1",
    "Connection":               "keep-alive",
    "Upgrade-Insecure-Requests":"1",
    "Sec-Fetch-Dest":           "document",
    "Sec-Fetch-Mode":           "navigate",
    "Sec-Fetch-Site":           "none",
    "Sec-Fetch-User":           "?1",
    "Cache-Control":            "max-age=0",
}

HEADERS_IMG = {
    **HEADERS,
    "Accept":         "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
    "Referer":        "https://colorearm.com/",
}

# ══════════════════════════════════════════════════════════════════
#  UTILIDADES
# ══════════════════════════════════════════════════════════════════

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def get_soup(url: str) -> BeautifulSoup:
    resp = SESSION.get(url, timeout=20)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def safe_filename(text: str) -> str:
    """Nombre de archivo/carpeta seguro, conserva acentos y ñ."""
    text = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", text).strip()
    text = re.sub(r"\s+", " ", text)
    return text or "sin_nombre"


def nombre_desde_alt(alt: str) -> str:
    """
    Extrae el nombre limpio de la imagen desde el atributo alt.

    Patrones habituales en colorearm.com:
      "Mariposas4 para colorear y dibujos"        → Mariposas4
      "imprimir Mariposas10 para colorear gratis" → Mariposas10
      "Sonic3-3 para colorear para imprimir pdf"  → Sonic3-3

    Estrategia:
      1. Buscar el primer token que contenga dígitos (ej: Mariposas4).
      2. Si no hay, devolver el primer token que no sea stopword.
    """
    alt = alt.strip()
    tokens = alt.split()
    stopwords = {
        "para", "colorear", "imprimir", "gratis", "en", "línea", "linea",
        "y", "de", "dibujos", "descargar", "pdf", "dibujar", "con",
        "a", "el", "la", "los", "las", "niño", "niña", "niños", "niñas",
        "online", "recortar", "pintar", "imprime", "páginas",
    }
    # Primer token con dígito
    for tok in tokens:
        if re.search(r"\d", tok):
            return safe_filename(tok)
    # Primer token no-stopword de longitud razonable
    for tok in tokens:
        if tok.lower() not in stopwords and len(tok) > 2:
            return safe_filename(tok)
    return safe_filename(alt[:50]) if alt else "imagen"


# ══════════════════════════════════════════════════════════════════
#  SCRAPING DE PÁGINAS ÍNDICE
# ══════════════════════════════════════════════════════════════════

def get_subcategory_links_from_page(soup: BeautifulSoup) -> list[dict]:
    """
    Extrae los enlaces a posts/subcategorías de una página índice.
    Los posts están marcados con <a><img alt="... thumbnail">Nombre</a>.
    Devuelve lista de {'nombre': str, 'url': str}.
    """
    results = []
    seen = set()

    for a in soup.select("a[href]"):
        img = a.find("img")
        if not img:
            continue
        alt = img.get("alt", "")
        if not alt.lower().endswith("thumbnail"):
            continue
        href = a["href"]
        if "para-colorear" not in href:
            continue
        if href in seen:
            continue
        seen.add(href)

        # Nombre del post: texto del <a> sin la palabra "thumbnail"
        nombre = a.get_text(separator=" ", strip=True)
        nombre = re.sub(r"\bthumbnail\b", "", nombre, flags=re.IGNORECASE).strip()
        nombre = safe_filename(nombre) or href.rstrip("/").split("/")[-1]

        results.append({"nombre": nombre, "url": href})

    return results


def hay_pagina_siguiente(soup: BeautifulSoup) -> bool:
    """Devuelve True si hay un enlace 'Next/Siguiente' en la paginación."""
    for a in soup.select("a[href]"):
        txt = a.get_text(strip=True).lower()
        if txt in ("next", "siguiente", "›", "»"):
            return True
        rel = a.get("rel", [])
        if isinstance(rel, list) and "next" in rel:
            return True
    return False


def get_all_posts(base_url: str, max_pages: int, quiet: bool) -> list[dict]:
    """
    Itera todas las páginas de una categoría y devuelve la lista
    completa de posts (subcategorías).
    """
    all_posts = []
    seen_urls = set()

    for page_num in range(1, max_pages + 1):
        url = base_url if page_num == 1 else f"{base_url.rstrip('/')}/page/{page_num}/"

        if not quiet:
            print(f"    [página {page_num}] {url}")

        try:
            soup = get_soup(url)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                if not quiet:
                    print(f"    → 404, no hay más páginas.")
                break
            raise

        posts = get_subcategory_links_from_page(soup)
        nuevos = 0
        for p in posts:
            if p["url"] not in seen_urls:
                seen_urls.add(p["url"])
                all_posts.append(p)
                nuevos += 1

        if not quiet:
            print(f"       +{nuevos} posts (total acumulado: {len(all_posts)})")

        if not hay_pagina_siguiente(soup):
            if not quiet:
                print(f"    → Última página alcanzada.")
            break

        time.sleep(DELAY_PAGINAS)

    return all_posts


# ══════════════════════════════════════════════════════════════════
#  SCRAPING DE POSTS INDIVIDUALES
# ══════════════════════════════════════════════════════════════════

def get_images_from_post(post_url: str) -> list[dict]:
    """
    Extrae todas las imágenes de dibujos de un post individual.
    Devuelve lista de {'url': str, 'nombre': str}.
    """
    soup = get_soup(post_url)
    images = []
    seen_urls = set()
    seen_nombres = {}   # para resolver colisiones de nombre

    for img in soup.find_all("img"):
        src = (img.get("src") or img.get("data-src") or "").strip()
        if not src or IMAGE_CDN not in src:
            continue
        if src.startswith("//"):
            src = "https:" + src

        # Descartar no-dibujos
        if any(ex in src for ex in IMGS_EXCLUIR):
            continue
        if "-300x300" in src:
            continue

        if src in seen_urls:
            continue
        seen_urls.add(src)

        # Extensión
        path_sin_query = urlparse(src).path
        ext = os.path.splitext(path_sin_query)[1] or ".webp"

        # Nombre base desde alt o desde la URL
        alt = img.get("alt", "").strip()
        if alt:
            nombre_base = nombre_desde_alt(alt)
        else:
            nombre_base = safe_filename(
                os.path.splitext(os.path.basename(path_sin_query))[0]
            )

        # Resolver colisiones: si el mismo nombre_base ya existe con otra URL,
        # añadir sufijo numérico
        if nombre_base in seen_nombres and seen_nombres[nombre_base] != src:
            contador = 2
            while f"{nombre_base}_{contador}" in seen_nombres:
                contador += 1
            nombre_base = f"{nombre_base}_{contador}"

        seen_nombres[nombre_base] = src
        images.append({"url": src, "nombre": nombre_base + ext})

    return images


# ══════════════════════════════════════════════════════════════════
#  DESCARGA
# ══════════════════════════════════════════════════════════════════

def download_file(url: str, dest_path: str) -> str:
    """
    Descarga un archivo.
    Devuelve 'ok', 'skip' (ya existía) o 'error'.
    """
    if os.path.exists(dest_path):
        return "skip"
    try:
        resp = SESSION.get(url, headers=HEADERS_IMG, timeout=30, stream=True)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=16384):
                f.write(chunk)
        return "ok"
    except Exception as e:
        print(f"      [✗] {os.path.basename(dest_path)}: {e}")
        return "error"


# ══════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Descargador de colorearm.com")
    parser.add_argument("--quiet",    action="store_true", help="Menos output")
    parser.add_argument("--sin-delay",action="store_true", help="Sin pausas (más rápido)")
    parser.add_argument(
        "--solo", metavar="KEYWORD",
        help="Solo procesar la categoría que contenga esta palabra"
    )
    args = parser.parse_args()

    if args.sin_delay:
        global DELAY_PAGINAS, DELAY_POSTS, DELAY_IMGS
        DELAY_PAGINAS = DELAY_POSTS = DELAY_IMGS = 0

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    categorias = CATEGORIAS
    if args.solo:
        categorias = [c for c in CATEGORIAS if args.solo.lower() in c["nombre"].lower()]
        if not categorias:
            print(f"[!] No se encontró ninguna categoría con la palabra '{args.solo}'.")
            print(f"    Disponibles: {[c['nombre'] for c in CATEGORIAS]}")
            sys.exit(1)

    grand_ok = grand_skip = grand_err = 0

    SEP = "═" * 62

    for cat in categorias:
        print(f"\n{SEP}")
        print(f"  CATEGORÍA : {cat['nombre']}")
        print(f"  URL base  : {cat['base_url']}")
        print(SEP)

        cat_dir = os.path.join(OUTPUT_DIR, cat["nombre"])
        os.makedirs(cat_dir, exist_ok=True)

        # ── 1. Recorrer todas las páginas índice ──────────────────
        print(f"\n  Recopilando posts de todas las páginas...\n")
        posts = get_all_posts(cat["base_url"], cat["max_pages"], args.quiet)
        print(f"\n  Total posts encontrados: {len(posts)}\n")

        # ── 2. Procesar cada post ─────────────────────────────────
        cat_ok = cat_skip = cat_err = 0

        for i, post in enumerate(posts, 1):
            post_dir = os.path.join(cat_dir, safe_filename(post["nombre"]))
            os.makedirs(post_dir, exist_ok=True)

            prefix = f"  [{i:3}/{len(posts)}] {post['nombre']}"
            if not args.quiet:
                print(f"{prefix}")

            time.sleep(DELAY_POSTS)

            try:
                images = get_images_from_post(post["url"])
            except Exception as e:
                print(f"         [!] Error al obtener post: {e}")
                continue

            if not images:
                if not args.quiet:
                    print(f"         (sin imágenes)")
                continue

            if not args.quiet:
                print(f"         {len(images)} imagen(es) → {post_dir}")

            for img in images:
                dest = os.path.join(post_dir, img["nombre"])
                time.sleep(DELAY_IMGS)
                result = download_file(img["url"], dest)

                if result == "ok":
                    cat_ok += 1
                    if not args.quiet:
                        print(f"         ✓ {img['nombre']}")
                elif result == "skip":
                    cat_skip += 1
                    if not args.quiet:
                        print(f"         = {img['nombre']}  (ya existe)")
                else:
                    cat_err += 1

        print(f"\n  Categoría '{cat['nombre']}': "
              f"✓{cat_ok} descargadas, ={cat_skip} ya existían, ✗{cat_err} errores")

        grand_ok   += cat_ok
        grand_skip += cat_skip
        grand_err  += cat_err

    print(f"\n{SEP}")
    print(f"  RESUMEN TOTAL")
    print(f"  ✓ Descargadas : {grand_ok}")
    print(f"  = Ya existían : {grand_skip}")
    print(f"  ✗ Fallidas    : {grand_err}")
    print(f"  Carpeta       : {os.path.abspath(OUTPUT_DIR)}")
    print(SEP + "\n")

    # ── Generar manifest.json para el frontend ────────────────────
    manifest = []
    exts_img = {".webp", ".png", ".jpg", ".jpeg"}
    for cat in CATEGORIAS:
        cat_dir = os.path.join(OUTPUT_DIR, cat["nombre"])
        if not os.path.isdir(cat_dir):
            continue
        for post_name in sorted(os.listdir(cat_dir)):
            post_dir = os.path.join(cat_dir, post_name)
            if not os.path.isdir(post_dir):
                continue
            images = sorted(
                f"/descargas/{cat['nombre']}/{post_name}/{fname}"
                for fname in os.listdir(post_dir)
                if os.path.splitext(fname)[1].lower() in exts_img
            )
            if images:
                manifest.append({
                    "categoria": cat["nombre"],
                    "nombre":    post_name,
                    "images":    images,
                })

    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, ensure_ascii=False, indent=2)
    print(f"  Manifest generado: {manifest_path} ({len(manifest)} posts)\n")


if __name__ == "__main__":
    main()