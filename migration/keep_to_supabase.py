import json
import os
import re
import uuid
import time
import logging
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional, Set, Tuple

import requests

# ===================== USER CONFIG =====================
USER_ID = "<SUPABASE_USER_ID>"  # Supabase auth.users UUID
INPUT_DIR = Path(".")
OUTPUT_SQL = Path("output.sql")
OUTPUT_METADATA = Path("metadata.json")
LOG_FILE = Path("convert_keep_notes.log")
# =======================================================

URL_RE = re.compile(r"(https?://[^\s]+)")
TAB_LINE_RE = re.compile(r"^\s*[eEGBDA]\s*\|")
BLANK_LINE_RE = re.compile(r"^\s*$")
STARTS_WITH_NUMBER_RE = re.compile(r"^\s*\d")
BRACKET_CONTENT_RE = re.compile(r"\((.*?)\)")

NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
ALL_NOTES = NOTES_SHARP + NOTES_FLAT
CHORD_SUFFIX_RE = re.compile(r'^(?:' + '|'.join(ALL_NOTES) + r')(?:m|maj|min|dim|aug|sus|\d+)?(?:/[A-G][b#]?)?$')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)


def micros_to_iso(micros: Optional[int]) -> Optional[str]:
    if micros is None:
        return None
    ts = micros / 1_000_000.0
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    return dt.isoformat()


def escape_sql_string(s: Optional[str]) -> str:
    if s is None:
        return "NULL"
    s = s.replace("–", "-").replace("—", "-")
    s = s.replace("'", "''")
    return f"'{s}'"


def extract_chords_from_title(title: str) -> Tuple[str, Optional[str]]:
    title = re.sub(r'\s+', ' ', title).strip()
    metadata_chords = None
    match = BRACKET_CONTENT_RE.search(title)
    if match:
        bracket_content = match.group(1)
        tokens = [t.strip() for t in re.split(r'[,\s]+', bracket_content) if t.strip()]
        valid_chords = [t for t in tokens if CHORD_SUFFIX_RE.match(t)]
        if valid_chords:
            metadata_chords = f"Chords used : {', '.join(valid_chords)}"
            title = title[:match.start()].strip() + title[match.end():].strip()
            title = re.sub(r'\s+', ' ', title).strip()
    return title, metadata_chords


def parse_note_json(data: Dict) -> Dict:
    # --- Extract chords from title and update metadata ---
    title_raw = (data.get("title", "") or "").strip()
    title, metadata_chords = extract_chords_from_title(title_raw)

    # --- Normalize and clean text content ---
    raw_text = (data.get("textContent", "") or "").replace("–", "-").replace("—", "-")

    # --- Extract labels/tags ---
    labels = [l.get("name", "").strip() for l in data.get("labels", []) if l.get("name")]

    # --- Split text into lines ---
    lines = raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    # --- Extract references (URLs that are on a line alone) ---
    references_lines = []
    content_lines = []
    for line in lines:
        stripped = line.strip()
        if URL_RE.fullmatch(stripped):
            references_lines.append(stripped)
        else:
            content_lines.append(line)
    references = "\n".join(references_lines)

    # --- Determine if first paragraph should be treated as metadata ---
    first_paragraph = []
    for line in content_lines:
        if BLANK_LINE_RE.match(line):
            break
        first_paragraph.append(line)

    use_metadata = True
    if first_paragraph:
        tab_lines_count = sum(1 for l in first_paragraph if TAB_LINE_RE.match(l))
        if STARTS_WITH_NUMBER_RE.match(first_paragraph[0]) or tab_lines_count > 0:
            use_metadata = False

    # --- Extract metadata lines ---
    metadata_lines = []
    i = 0
    if use_metadata:
        while i < len(content_lines) and not BLANK_LINE_RE.match(content_lines[i]):
            metadata_lines.append(content_lines[i])
            i += 1
        content_lines = content_lines[i + 1 :]

    # --- Group guitar tab lines into code blocks ---
    grouped_content = []
    j = 0
    while j < len(content_lines):
        if TAB_LINE_RE.match(content_lines[j]):
            block = []
            while j < len(content_lines) and TAB_LINE_RE.match(content_lines[j]):
                block.append(content_lines[j])
                j += 1
            grouped_content.append("```" + "\n".join(block) + "\n```")
        else:
            grouped_content.append(content_lines[j])
            j += 1

    # --- Merge metadata lines and extracted chords ---
    metadata_text = "\n".join(metadata_lines).strip()
    if metadata_chords:
        if metadata_text:
            metadata_text += "\n" + metadata_chords
        else:
            metadata_text = metadata_chords

    # --- Prepare content field ---
    content = "\n".join(grouped_content).strip()
    content = "\n".join([line for line in content.split("\n")]).strip("\n")

    # --- Convert timestamps ---
    created_iso = micros_to_iso(int(data.get("createdTimestampUsec", 0))) or datetime.now(timezone.utc).isoformat()
    updated_iso = micros_to_iso(int(data.get("userEditedTimestampUsec", 0))) or created_iso

    return {
        "title": title,
        "metadata": metadata_text,
        "content": content,
        "references": references,
        "labels": labels,
        "is_pinned": bool(data.get("isPinned", False)),
        "created_at_iso": created_iso,
        "updated_at_iso": updated_iso,
    }


# --- MusicBrainz ---
MB_ENDPOINT = "https://musicbrainz.org/ws/2/recording/"
USER_AGENT = "KeepNotesToSupabase/1.0 ( your_email@example.com )"


def fetch_artist_album(title: str) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    params = {"query": title, "fmt": "json"}
    try:
        resp = requests.get(MB_ENDPOINT, params=params, headers={"User-Agent": USER_AGENT}, timeout=8)
        if resp.status_code != 200:
            return (None, None, None)
        data = resp.json()
        recordings = data.get("recordings", [])
        if not recordings:
            return (None, None, None)
        rec = recordings[0]
        artist = rec["artist-credit"][0]["name"] if "artist-credit" in rec else None
        album = rec["releases"][0]["title"] if rec.get("releases") else None
        release_year = None
        if rec.get("releases") and rec["releases"][0].get("date"):
            try:
                release_year = int(rec["releases"][0]["date"].split("-")[0])
            except Exception:
                release_year = None
        return artist, album, release_year
    except Exception:
        return (None, None, None)
    finally:
        time.sleep(1.0)


# --- Main conversion ---
def collect_notes(input_dir: Path) -> List[Dict]:
    notes = []
    for f in input_dir.glob("*.json"):
        try:
            with f.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as e:
            logging.error(f"Skipping {f.name}: {e}")
            continue
        parsed = parse_note_json(data)
        notes.append(parsed)
    return notes


def fetch_and_save_metadata(notes: List[Dict]):
    for n in notes:
        if n["title"]:
            artist, album, release_year = fetch_artist_album(n["title"])
            n["artist"] = artist
            n["album"] = album
            n["release_year"] = release_year
            logging.info(f"Fetched for '{n['title']}': artist={artist}, album={album}, year={release_year}")
    with OUTPUT_METADATA.open("w", encoding="utf-8") as fh:
        json.dump(notes, fh, indent=2, ensure_ascii=False)
    logging.info(f"Saved metadata to {OUTPUT_METADATA}")


def generate_sql(notes: List[Dict], user_id: str):
    all_tags: Set[str] = set()
    for n in notes:
        all_tags.update(n["labels"])

    tag_map = {t: str(uuid.uuid4()) for t in sorted(all_tags)}
    note_ids = [str(uuid.uuid4()) for _ in notes]

    with OUTPUT_SQL.open("w", encoding="utf-8") as out:
        out.write("-- SQL statements generated from Keep JSON export\n")

        for name, tid in tag_map.items():
            out.write(
                f"INSERT INTO public.tags (id, user_id, name) VALUES ('{tid}', '{user_id}', {escape_sql_string(name)});\n"
            )

        for idx, n in enumerate(notes):
            nid = note_ids[idx]
            out.write(
                "INSERT INTO public.notes (id, user_id, title, content, artist, album, release_year, metadata, \"references\", isPinned, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n"
                % (
                    f"'{nid}'",
                    f"'{user_id}'",
                    escape_sql_string(n["title"]),
                    escape_sql_string(n["content"]),
                    escape_sql_string(n.get("artist")) if n.get("artist") else "NULL",
                    escape_sql_string(n.get("album")) if n.get("album") else "NULL",
                    str(n.get("release_year")) if n.get("release_year") else "NULL",
                    escape_sql_string(n["metadata"]) if n["metadata"] else "NULL",
                    escape_sql_string(n["references"]) if n["references"] else "NULL",
                    "TRUE" if n["is_pinned"] else "FALSE",
                    f"'{n['created_at_iso']}'",
                    f"'{n['updated_at_iso']}'",
                )
            )

            for label in n["labels"]:
                if label in tag_map:
                    ntid = str(uuid.uuid4())
                    out.write(
                        f"INSERT INTO public.note_tags (id, user_id, note_id, tag_id) VALUES ('{ntid}', '{user_id}', '{nid}', '{tag_map[label]}');\n"
                    )

    logging.info(f"Wrote SQL to {OUTPUT_SQL}")


if __name__ == "__main__":
    if USER_ID.startswith("<"):
        logging.error("Please set USER_ID to your Supabase user UUID!")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Usage: python script.py [fetch|sql]")
        sys.exit(0)

    mode = sys.argv[1]
    if mode == "fetch":
        notes = collect_notes(INPUT_DIR)
        fetch_and_save_metadata(notes)
    elif mode == "sql":
        if not OUTPUT_METADATA.exists():
            logging.error("metadata.json not found. Run with 'fetch' first.")
            sys.exit(1)
        with OUTPUT_METADATA.open("r", encoding="utf-8") as fh:
            notes = json.load(fh)
        generate_sql(notes, USER_ID)
    else:
        print("Usage: python script.py [fetch|sql]")
