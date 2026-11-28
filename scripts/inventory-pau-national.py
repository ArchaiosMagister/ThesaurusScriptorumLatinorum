#!/usr/bin/env python3
"""Inventory a PAU ZIP with Poppler and checkpoint each unique input by SHA-256."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import unicodedata
from zipfile import ZipFile

SCHEMA = 1
EXTRACTION_VERSION = 2
YEAR = re.compile(r"^(19|20)[0-9]{2}$")
SOLUTIONS = re.compile(r"criterios (?:espec[ií]ficos )?(?:de (?:correcci[oó]n|evaluaci[oó]n))|solucionario", re.I)
EXAM = re.compile(r"traduzca|traducci[oó]n|tradu[cç][aã]o|trad[uú]ce|traducir|traduei", re.I)
SPACES = re.compile(r"[^\w]+")
SEED = "pau-national-v1"


def write_json(path, value):
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def poppler(tool, args, data=None):
    return subprocess.run([tool, *args], input=data, capture_output=True, timeout=45,
                          check=False, env={**os.environ, "LC_ALL": "C"})


def describe(data, digest, cache, tools):
    checkpoint = cache / f"{digest}.json"
    if checkpoint.exists():
        return json.loads(checkpoint.read_text(encoding="utf-8"))
    item = {"format": "pdf", "pages": None, "quality": "unreadable", "type": "unknown"}
    if b"%PDF-" not in data[:1024]:
        html = data.lstrip().lower().startswith((b"<!doctype html", b"<html"))
        item.update(format="html" if html else "unknown",
                    issue="download-quota" if html and b"cuota diaria superada" in data.lower() else "invalid-pdf")
    else:
        info = poppler(tools[0], ["-"], data)
        pages = re.search(rb"^Pages:\s+(\d+)", info.stdout, re.M)
        if info.returncode or not pages:
            item["issue"] = "pdfinfo-error"
        else:
            layer = poppler(tools[1], ["-layout", "-enc", "UTF-8", "-", "-"], data)
            item["pages"] = int(pages[1])
            if layer.returncode:
                item["issue"] = "text-extraction-error"
            else:
                raw = layer.stdout.decode("utf-8", errors="replace")
                counts = [sum(c.isalpha() for c in p) for p in raw.split("\f")[:item["pages"]]]
                printable = [[line.strip() for line in page.splitlines() if line.strip()] for page in raw.split("\f")]
                first_header = "\n".join(printable[0][:9])
                appendix = any(any(SOLUTIONS.fullmatch(line.rstrip(":.")) for line in page[:9])
                               for page in printable[1:])
                kind = ("review-answer-key" if SOLUTIONS.search(first_header) else
                        "exam-with-key" if EXAM.search(raw) and appendix else
                        "possible-exam" if EXAM.search(raw) else "unknown")
                producer = re.search(rb"^(?:Producer|Creator):\s*(.+)", info.stdout, re.M)
                # A visible text layer or a normal producer does not establish fidelity.
                ocr_hint = bool(re.search(rb"paper capture|ocr|abbyy", info.stdout, re.I))
                quality = ("no-text" if not any(counts) else "suspect-ocr" if ocr_hint or "\ufffd" in raw
                           else "sparse" if min(counts, default=0) < 50 else "text-layer")
                item.update(quality=quality, letters_per_page=counts, ocr_hint=ocr_hint,
                            producer=producer[1].decode("utf-8", "replace") if producer else "",
                            type=kind)
                text_file = cache / f"{digest}.txt"
                text_file.write_text(raw, encoding="utf-8")
                item["normalized_text_sha256"] = sha256(
                    SPACES.sub(" ", unicodedata.normalize("NFC", raw).casefold()).strip().encode()
                ).hexdigest() if any(counts) else None
    write_json(checkpoint, item)
    return item


def families(records, cache):
    """Keep exact copies, variants and possible close reproductions together."""
    parents = list(range(len(records)))

    def root(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    def link(i, j):
        parents[root(i)] = root(j)

    keys = {}
    shingles = []
    for i, row in enumerate(records):
        for key in [("binary", row["sha256"]),
                    ("exam", row["region"], row["year"], row["session"]) if row["year"] and row["session"] else None,
                    ("text", row["normalized_text_sha256"]) if row.get("normalized_text_sha256") else None]:
            if key is not None:
                link(i, keys.setdefault(key, i))
        if not row.get("normalized_text_sha256"):
            continue
        raw = (cache / (row["sha256"] + ".txt")).read_text(encoding="utf-8")
        words = re.findall(r"[^\W\d_]+", unicodedata.normalize("NFC", raw).casefold())
        grams = set(zip(words, words[1:], words[2:], words[3:], words[4:]))
        if len(grams) >= 45:
            for j, other in shingles:
                if min(len(grams), len(other)) / max(len(grams), len(other)) >= .7:
                    if len(grams & other) / len(grams | other) >= .7:
                        link(i, j)
            shingles.append((i, grams))
    result = defaultdict(list)
    for i, record in enumerate(records):
        result[root(i)].append(record)
    return result.values()


def assign_splits(records, cache):
    groups = defaultdict(list)
    for members in families(records, cache):
        key = min(row["sha256"] for row in members)
        for row in members:
            row["family"] = key
        first = members[0]
        if any(row["year"] == 2026 or
               (row["region"] == "aragon" and (row["year"], row["session"]) in
                {(2024, "extraordinaria"), (2025, "ordinaria")}) or
               (row["region"] == "castilla-y-leon" and row["year"] == 2025) or
               (row["region"] == "madrid" and row["year"] == 2025 and row["session"] == "extraordinaria")
               for row in members):
            for row in members:
                row["split"] = "prior-development"
            continue
        stratum = (first["region"], first["year"] // 5 if first["year"] else None,
                   first["session"], first["quality"])
        groups[stratum].append((key, members))

    # Distribute sparse strata by tracking the deficit for both the region and
    # the whole corpus. Fixed hashes settle ties without looking at parser results.
    splits = {"development": .6, "validation": .2, "holdout": .2}
    overall = Counter()
    regional = defaultdict(Counter)
    for stratum, group in sorted(groups.items(), key=lambda p: (-len(p[1]), str(p[0]))):
        local = Counter()
        region = regional[stratum[0]]
        for key, members in sorted(group, key=lambda p: sha256((SEED + p[0]).encode()).hexdigest()):
            split = max(splits, key=lambda s: (
                (1 + sum(local.values())) * splits[s] - local[s]
                + (1 + sum(region.values())) * splits[s] - region[s]
                + .25 * ((1 + sum(overall.values())) * splits[s] - overall[s]),
                sha256((SEED + key + s).encode()).hexdigest()))
            local[split] += 1
            region[split] += 1
            overall[split] += 1
            for row in members:
                row["split"] = split


def archive_entries(archive):
    for entry in sorted(archive.infolist(), key=lambda e: e.filename):
        path = PurePosixPath(entry.filename)
        if len(path.parts) != 4 or path.parts[0] != "PAU_Latin" or path.suffix.lower() != ".pdf":
            continue
        _, region, raw_year, name = path.parts
        session = re.search(r"-(ordinaria|extraordinaria|modelo)(?:-[^.]+)?\.pdf$", name, re.I)
        data = archive.read(entry)
        yield {"path": str(path), "region": region, "year": int(raw_year) if YEAR.fullmatch(raw_year) else None,
               "session": session[1].lower() if session else None, "bytes": len(data),
               "sha256": sha256(data).hexdigest()}, data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    parser.add_argument("output", type=Path, help="Directorio de trabajo local, fuera del control de versiones")
    parser.add_argument("--pdfinfo", default="pdfinfo")
    parser.add_argument("--pdftotext", default="pdftotext")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    tools = (args.pdfinfo, args.pdftotext)
    versions = [poppler(tool, ["-v"]).stderr.decode().splitlines()[0] for tool in tools]
    fingerprint = sha256(repr((EXTRACTION_VERSION, versions)).encode()).hexdigest()[:12]
    cache = args.output / f"extraction-{fingerprint}"
    cache.mkdir(exist_ok=True)
    with ZipFile(args.zip) as archive:
        entries = list(archive_entries(archive))
    unique = {row["sha256"]: data for row, data in entries}
    with ThreadPoolExecutor(max_workers=4) as pool:
        metrics = dict(zip(unique, pool.map(lambda key: describe(unique[key], key, cache, tools), unique)))
    counts = Counter(row["sha256"] for row, _ in entries)
    records = [{**row, **metrics[row["sha256"]], "identical_files": counts[row["sha256"]]}
               for row, _ in entries]
    valid = [row for row in records if row["format"] == "pdf" and row["pages"]]
    for row in records:
        row["split"] = "excluded"
    assign_splits(valid, cache)
    write_json(args.output / "inventory.json", {
        "schema": SCHEMA, "zip_sha256": sha256(args.zip.read_bytes()).hexdigest(),
        "poppler": versions, "extraction_cache": cache.name, "entries": records
    })
    summary = defaultdict(Counter)
    for row in records:
        counter = summary[row["region"]]
        counter[row["split"]] += 1
        counter["pages"] += row["pages"] or 0
    print(json.dumps({"files": len(records), "pdf": len(valid), "regions": summary}, indent=2))


if __name__ == "__main__":
    main()
