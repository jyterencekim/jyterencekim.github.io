#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

RE_DATE_IN_FILENAME = re.compile(r"^(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})-")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Jekyll posts into AstroPaper content entries."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("_posts"),
        help="Path to the source Jekyll posts directory.",
    )
    parser.add_argument(
        "--destination",
        type=Path,
        default=Path("src/data/blog"),
        help="Destination directory for AstroPaper blog entries.",
    )
    args = parser.parse_args()

    convert_posts(args.source, args.destination)


def convert_posts(source_root: Path, destination_root: Path) -> None:
    if not source_root.exists():
        raise SystemExit(f"Source directory {source_root} does not exist.")

    if destination_root.exists():
        shutil.rmtree(destination_root)
    destination_root.mkdir(parents=True, exist_ok=True)

    for src_path in sorted(source_root.rglob("*.md")):
        relative_path = src_path.relative_to(source_root)
        dest_dir = destination_root / relative_path.parent
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / src_path.name

        raw_text = src_path.read_text(encoding="utf-8")
        front_matter, body = split_front_matter(raw_text)
        metadata = parse_front_matter(front_matter)

        title = metadata.get("title") or src_path.stem
        pub_datetime = determine_pub_datetime(metadata, src_path)
        mod_datetime = determine_mod_datetime(metadata)

        tags = collect_tags(metadata, relative_path)
        description = extract_description(body)

        front_data = OrderedDict()
        front_data["title"] = title
        front_data["pubDatetime"] = pub_datetime
        if mod_datetime:
            front_data["modDatetime"] = mod_datetime
        if tags:
            front_data["tags"] = tags
        front_data["description"] = description

        output = build_document(front_data, body)
        dest_path.write_text(output, encoding="utf-8")


def split_front_matter(text: str) -> Tuple[List[str], str]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return [], text

    front_matter_lines: List[str] = []
    end_index = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_index = idx
            break
        front_matter_lines.append(lines[idx])

    if end_index is None:
        return [], text

    body_lines = lines[end_index + 1 :]
    body = "\n".join(body_lines).lstrip("\n")
    return front_matter_lines, body


def parse_front_matter(lines: Iterable[str]) -> Dict[str, object]:
    data: Dict[str, object] = {}
    current_key: str | None = None

    for raw_line in lines:
        if not raw_line:
            continue
        stripped_line = raw_line.strip()
        if not stripped_line or stripped_line.startswith("#"):
            continue

        indent = len(raw_line) - len(raw_line.lstrip(" "))
        if indent >= 2 and stripped_line.startswith("-"):
            if current_key is None:
                continue
            value = stripped_line[1:].strip()
            data.setdefault(current_key, [])
            if isinstance(data[current_key], list):
                data[current_key].append(clean_value(value))
            continue

        if ":" in stripped_line and indent == 0:
            key, value = stripped_line.split(":", 1)
            current_key = key.strip()
            value = value.strip()
            if value == "":
                data[current_key] = []
            else:
                data[current_key] = clean_value(value)
            continue

        if current_key is not None:
            existing = data.get(current_key)
            addition = clean_value(stripped_line)
            if isinstance(existing, list):
                existing.append(addition)
            elif isinstance(existing, str):
                data[current_key] = f"{existing} {addition}".strip()
            else:
                data[current_key] = addition

    return data


def clean_value(value: str) -> object:
    value = value.strip()
    if (value.startswith("'") and value.endswith("'")) or (
        value.startswith('"') and value.endswith('"')
    ):
        value = value[1:-1]

    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False

    return value


def determine_pub_datetime(metadata: Dict[str, object], src_path: Path) -> str:
    date_value = metadata.get("date")
    if isinstance(date_value, str):
        parsed = parse_date_string(date_value)
        if parsed:
            return format_datetime(parsed)

    match = RE_DATE_IN_FILENAME.match(src_path.name)
    if match:
        year = int(match.group("year"))
        month = int(match.group("month"))
        day = int(match.group("day"))
        return format_datetime(datetime(year, month, day, tzinfo=timezone.utc))

    return format_datetime(datetime.now(tz=timezone.utc))


def determine_mod_datetime(metadata: Dict[str, object]) -> str | None:
    mod_keys = ("last_modified_at", "updated", "modified", "modDatetime")
    for key in mod_keys:
        value = metadata.get(key)
        if isinstance(value, str):
            parsed = parse_date_string(value)
            if parsed:
                return format_datetime(parsed)
    return None


def parse_date_string(raw_value: str) -> datetime | None:
    raw_value = raw_value.strip()
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            parsed = datetime.strptime(raw_value, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            continue
    return None


def format_datetime(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def collect_tags(metadata: Dict[str, object], relative_path: Path) -> List[str]:
    tags: List[str] = []

    categories = metadata.get("categories")
    if isinstance(categories, list):
        tags.extend(_stringify_sequence(categories))
    elif isinstance(categories, str):
        tags.append(categories)

    explicit_tags = metadata.get("tags")
    if isinstance(explicit_tags, list):
        tags.extend(_stringify_sequence(explicit_tags))
    elif isinstance(explicit_tags, str):
        tags.extend([tag for tag in explicit_tags.replace(",", " ").split() if tag])

    if relative_path.parts:
        tags.append(relative_path.parts[0])

    seen = set()
    unique_tags: List[str] = []
    for tag in tags:
        normalized = str(tag).strip()
        if not normalized:
            continue
        if normalized not in seen:
            unique_tags.append(normalized)
            seen.add(normalized)

    return unique_tags


def _stringify_sequence(values: Iterable[object]) -> List[str]:
    return [str(value).strip() for value in values if str(value).strip()]


def extract_description(body: str) -> str:
    paragraphs = re.split(r"\n\s*\n", body.strip())
    for paragraph in paragraphs:
        stripped = paragraph.strip()
        if not stripped:
            continue

        cleaned = re.sub(r"!\[[^\]]*\]\([^\)]*\)", "", stripped)
        cleaned = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", cleaned)
        cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
        cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
        cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
        cleaned = re.sub(r"\*([^*]+)\*", r"\1", cleaned)
        cleaned = re.sub(r"^>\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"<[^>]+>", "", cleaned)
        normalized = " ".join(cleaned.split())
        if normalized:
            return truncate_description(normalized)

    return "..."


def truncate_description(text: str, limit: int = 180) -> str:
    if len(text) <= limit:
        return text
    truncated = text[:limit]
    last_space = truncated.rfind(" ")
    if last_space > 80:
        truncated = truncated[:last_space]
    return truncated.rstrip() + "…"


def build_document(front_data: "OrderedDict[str, object]", body: str) -> str:
    lines: List[str] = ["---"]
    for key, value in front_data.items():
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {json.dumps(str(item), ensure_ascii=False)}")
        elif key in {"pubDatetime", "modDatetime"}:
            lines.append(f"{key}: {value}")
        elif isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {json.dumps(str(value), ensure_ascii=False)}")
    lines.append("---")

    body_content = body.rstrip()
    if body_content:
        return "\n".join(lines) + "\n\n" + body_content + "\n"
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
