#!/usr/bin/env python3
"""Comprobación de privacidad del repositorio público.

Uso:  python3 scripts/check_privacy.py
Sale con código 1 si encuentra algo que no debe publicarse.

Comprueba:
1. Que no haya archivos de datos privados (xlsx, xls, csv, pdf, xml).
2. Que los JSON de data/ no tengan claves con palabras de importes o cantidades
   (se comparan palabras completas de la clave, no trozos).
3. Que ningún texto del repositorio contenga importes en euros ni números de títulos,
   salvo las frases de la lista blanca.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "dist", ".claude", "vendor"}
# Este script y las reglas del proyecto nombran lo prohibido para poder prohibirlo.
SKIP_TEXT = {"scripts/check_privacy.py", "CLAUDE.md"}
TEXT_EXT = {".html", ".js", ".mjs", ".css", ".json", ".md", ".txt", ".svg", ".yml", ".yaml"}
FORBIDDEN_FILES = {".xlsx", ".xls", ".csv", ".pdf", ".xml"}

BANNED_KEY_WORDS = {"eur", "euro", "euros", "acciones", "accion", "shares", "titulos",
                    "coste", "costes", "cost", "costs", "precio", "precios", "price", "prices",
                    "patrimonio", "aportacion", "aportaciones", "valor", "saldo", "importe",
                    "amount", "balance", "nav"}

# Frases que sí pueden aparecer con un importe en euros.
WHITELIST = ["1.000 €", "1.000€", "1000 €"]

EUR_PATTERNS = [
    re.compile(r"\d[\d.,]*\s?(?:€|eur\b|euros\b)", re.I),
    re.compile(r"(?:€|eur\b)\s?\d", re.I),
    re.compile(r"\d[\d.,]*\s+(?:acciones|títulos|titulos|shares)\b", re.I),
]

problems = []


def words(key):
    key = re.sub(r"([a-z])([A-Z])", r"\1_\2", str(key))
    return {w for w in re.split(r"[^A-Za-z]+", key.lower()) if w}


def walk(o, path, file):
    if isinstance(o, dict):
        for k, v in o.items():
            bad = words(k) & BANNED_KEY_WORDS
            if bad:
                problems.append(f"{file}: clave prohibida '{path}.{k}' ({', '.join(sorted(bad))})")
            walk(v, f"{path}.{k}", file)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, f"{path}[{i}]", file)


for p in sorted(ROOT.rglob("*")):
    if not p.is_file() or any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts):
        continue
    rel = p.relative_to(ROOT).as_posix()
    if p.suffix.lower() in FORBIDDEN_FILES:
        problems.append(f"{rel}: tipo de archivo prohibido en el repo público")
        continue
    if p.suffix.lower() not in TEXT_EXT or rel in SKIP_TEXT:
        continue
    txt = p.read_text(encoding="utf-8", errors="ignore")
    if p.suffix.lower() == ".json" and rel.startswith("data/"):
        try:
            walk(json.loads(txt), "", rel)
        except json.JSONDecodeError as e:
            problems.append(f"{rel}: JSON no válido ({e})")
    clean = txt
    for w in WHITELIST:
        clean = clean.replace(w, "")
    for pat in EUR_PATTERNS:
        for m in pat.finditer(clean):
            line = clean.count("\n", 0, m.start()) + 1
            problems.append(f"{rel}:{line}: importe o cantidad prohibida '{m.group(0).strip()}'")

if problems:
    print("PRIVACIDAD: se han encontrado %d problemas" % len(problems))
    for x in problems:
        print(" -", x)
    sys.exit(1)
print("PRIVACIDAD OK")
