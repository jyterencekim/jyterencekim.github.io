"""
taste.md → Spotify playlist generator
"""

import os
import re
from pathlib import Path

import spotipy
from spotipy.oauth2 import SpotifyOAuth

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())

CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SPOTIFY_CLIENT_SECRET"]
REDIRECT_URI = os.environ["SPOTIFY_REDIRECT_URI"]

TASTE_MD = "src/pages/taste.md"


def parse_taste_md(path):
    """Extract artist - title pairs from taste.md on repeat section."""
    with open(path, "r") as f:
        content = f.read()

    # Get everything after "## on repeat"
    match = re.search(r"## on repeat\n.*?\n(.*)", content, re.DOTALL)
    if not match:
        return []

    lines = match.group(1).strip().split("\n")
    entries = []
    current_artist = None

    for line in lines:
        stripped = line.strip()
        if not stripped or not stripped.startswith("- "):
            # sublist item (4-space or tab indent)
            if line.startswith("    ") or line.startswith("\t"):
                stripped = stripped.lstrip("- ").strip()
                if current_artist and " - " in stripped:
                    artist, titles = stripped.split(" - ", 1)
                    for title in split_titles(titles):
                        entries.append((artist.strip(), clean_title(title)))
                elif current_artist and stripped:
                    # bare title under an artist
                    entries.append((current_artist, clean_title(stripped)))
            continue

        item = stripped[2:].strip()  # remove "- "

        if " - " in item:
            artist, titles = item.split(" - ", 1)
            current_artist = artist.strip()
            for title in split_titles(titles):
                entries.append((current_artist, clean_title(title)))
        else:
            # artist only, no specific song
            current_artist = item.strip()

    return entries


def split_titles(titles_str):
    """Split comma-separated titles, being careful with parenthetical content."""
    titles = []
    depth = 0
    current = ""
    for ch in titles_str:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            titles.append(current.strip())
            current = ""
            continue
        current += ch
    if current.strip():
        titles.append(current.strip())
    return titles


def clean_title(title):
    """Remove parenthetical notes like (Video), (cover), (ft. ...) etc."""
    # Remove trailing parenthetical that looks like a note, but keep meaningful ones
    title = re.sub(r"\s*\((?:Video|video|Feat\..*|feat\..*|ft\..*)\)\s*$", "", title)
    # Remove "cf. ..." lines
    if title.startswith("cf."):
        return ""
    return title.strip()


def search_track(sp, artist, title):
    """Search Spotify for a track. Returns track URI or None."""
    # Try exact search first
    query = f"artist:{artist} track:{title}"
    results = sp.search(q=query, type="track", limit=3)
    if results["tracks"]["items"]:
        return results["tracks"]["items"][0]["uri"]

    # Fallback: simpler search
    query = f"{artist} {title}"
    results = sp.search(q=query, type="track", limit=3)
    if results["tracks"]["items"]:
        return results["tracks"]["items"][0]["uri"]

    return None


def main():
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope="playlist-modify-public playlist-modify-private",
    ))

    user = sp.current_user()
    print(f"Logged in as: {user['display_name']}")

    entries = parse_taste_md(TASTE_MD)
    print(f"Parsed {len(entries)} tracks from taste.md\n")

    # Search for tracks
    found = []
    not_found = []
    for artist, title in entries:
        if not title:
            continue
        uri = search_track(sp, artist, title)
        if uri:
            found.append((artist, title, uri))
            print(f"  OK  {artist} - {title}")
        else:
            not_found.append((artist, title))
            print(f"  ??  {artist} - {title}")

    print(f"\nFound: {len(found)} / {len(found) + len(not_found)}")

    if not found:
        print("No tracks found.")
        return

    # Create playlist (use /me/playlists endpoint directly)
    playlist = sp._post(
        "me/playlists",
        payload={
            "name": "taste.md — on repeat",
            "public": False,
            "description": "Auto-generated from jyterencekim.github.io taste.md",
        },
    )

    # Add tracks in batches of 100
    uris = [uri for _, _, uri in found]
    for i in range(0, len(uris), 100):
        sp.playlist_add_items(playlist["id"], uris[i : i + 100])

    print(f"\nPlaylist created: {playlist['external_urls']['spotify']}")

    if not_found:
        print(f"\nNot found ({len(not_found)}):")
        for artist, title in not_found:
            print(f"  - {artist} - {title}")


if __name__ == "__main__":
    main()
