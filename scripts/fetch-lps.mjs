#!/usr/bin/env node
// Parses src/pages/taste.md and queries iTunes Search API for album artwork.
// Writes results to src/data/taste-lps.json. Re-run to refresh.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TASTE_PATH = path.join(ROOT, "src/pages/taste.md");
const OUT_PATH = path.join(ROOT, "src/data/taste-lps.json");

const DASH_SPLIT = / [-–—] /;

function parseTaste(content) {
  const lines = content.split("\n");
  const startIdx = lines.findIndex(l => l.startsWith("## on repeat"));
  if (startIdx === -1) return [];

  const entries = [];
  let currentParent = null;
  let pendingHeader = null;

  const flushHeader = () => {
    if (pendingHeader) {
      entries.push({
        artist: pendingHeader,
        song: null,
        query: pendingHeader,
        label: pendingHeader,
      });
      pendingHeader = null;
    }
  };

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    if (!line.trim()) continue;

    const match = line.match(/^(\s*)-\s+(.+)$/);
    if (!match) continue;
    const indent = match[1].length;
    const text = match[2].trim();

    if (indent === 0) {
      flushHeader();
      if (DASH_SPLIT.test(text)) {
        const dashMatch = text.match(DASH_SPLIT);
        const dashIdx = text.indexOf(dashMatch[0]);
        const artist = text.slice(0, dashIdx).trim();
        const songsRaw = text.slice(dashIdx + dashMatch[0].length).trim();
        const songs = splitSongs(songsRaw);
        for (const song of songs) {
          entries.push(buildEntry(artist, song));
        }
        currentParent = artist;
      } else {
        currentParent = text;
        pendingHeader = text;
      }
    } else {
      pendingHeader = null;
      const cleaned = text.replace(/^cf\.\s*/i, "");
      const songs = splitSongs(cleaned);
      for (const song of songs) {
        if (currentParent) {
          entries.push(buildEntry(currentParent, song));
        } else {
          entries.push(buildEntry(song, null));
        }
      }
    }
  }
  flushHeader();
  return entries;
}

function splitSongs(text) {
  return text
    .split(/,\s+(?![^()]*\))/)
    .map(s => s.trim())
    .filter(Boolean);
}

function stripParens(s) {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

function buildEntry(artist, song) {
  const label = song ? `${artist} - ${song}` : artist;
  const queryArtist = stripParens(artist);
  const querySong = song ? stripParens(song) : null;
  const query = querySong ? `${queryArtist} ${querySong}` : queryArtist;
  return { artist, song, label, query };
}

async function fetchArt(entry) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    entry.query
  )}&entity=song&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "jyterencekim.github.io/lp-wall (build script)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.results?.[0];
    if (!r) return null;
    const artworkUrl = (r.artworkUrl100 || "").replace(
      /\d+x\d+bb/,
      "600x600bb"
    );
    return {
      artworkUrl: artworkUrl || null,
      previewUrl: r.previewUrl || null,
      foundArtist: r.artistName || null,
      foundTrack: r.trackName || null,
      foundAlbum: r.collectionName || null,
      trackViewUrl: r.trackViewUrl || null,
    };
  } catch (err) {
    return null;
  }
}

async function fetchArtFallback(entry) {
  if (!entry.song) return null;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    stripParens(entry.song)
  )}&entity=song&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.results?.[0];
    if (!r) return null;
    const artworkUrl = (r.artworkUrl100 || "").replace(
      /\d+x\d+bb/,
      "600x600bb"
    );
    return {
      artworkUrl: artworkUrl || null,
      previewUrl: r.previewUrl || null,
      foundArtist: r.artistName || null,
      foundTrack: r.trackName || null,
      foundAlbum: r.collectionName || null,
      trackViewUrl: r.trackViewUrl || null,
      fuzzy: true,
    };
  } catch {
    return null;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("Reading", TASTE_PATH);
  const content = await fs.readFile(TASTE_PATH, "utf-8");
  const entries = parseTaste(content);
  console.log("Parsed entries:", entries.length);

  // Load existing cache to avoid re-fetching
  let cache = {};
  try {
    const existing = JSON.parse(await fs.readFile(OUT_PATH, "utf-8"));
    for (const e of existing.entries || []) {
      cache[e.label] = e;
    }
    console.log("Loaded cache entries:", Object.keys(cache).length);
  } catch {
    /* no cache yet */
  }

  const force = process.argv.includes("--force");
  const results = [];
  let fetched = 0;
  let hits = 0;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const cached = cache[e.label];
    if (!force && cached && cached.artworkUrl !== undefined) {
      results.push({ ...e, ...cached });
      if (cached.artworkUrl) hits++;
      continue;
    }
    let art = await fetchArt(e);
    if (!art && e.song) {
      await sleep(150);
      art = await fetchArtFallback(e);
    }
    fetched++;
    if (art?.artworkUrl) hits++;
    results.push({
      ...e,
      artworkUrl: art?.artworkUrl || null,
      previewUrl: art?.previewUrl || null,
      foundArtist: art?.foundArtist || null,
      foundTrack: art?.foundTrack || null,
      foundAlbum: art?.foundAlbum || null,
      trackViewUrl: art?.trackViewUrl || null,
      fuzzy: art?.fuzzy || false,
    });
    if (fetched % 20 === 0) {
      console.log(`  fetched ${fetched} (hits ${hits})`);
    }
    await sleep(200);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    withArt: results.filter(r => r.artworkUrl).length,
    entries: results,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Total ${out.total}, with art ${out.withArt}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
