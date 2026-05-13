---
description: Convert a draft in raw/ into an Astro content file with proper frontmatter
argument-hint: "[filename or pattern]"
---

# /publish

Convert raw drafts into Astro-compliant content files.

## How raw/ is laid out

The user writes drafts into `raw/<collection>/<subcategory>/<anything>.md`. The collection/subcategory mirrors the published location:

- `raw/blog/thoughts/foo.md` → `src/data/blog/thoughts/<date>-<slug>.md`
- `raw/blog/scraps/foo.md` → `src/data/blog/scraps/<date>-<slug>.md`
- `raw/blog/dev/foo.md` → `src/data/blog/dev/<date>-<slug>.md`
- `raw/blog/garnet-crow/foo.md` → `src/data/blog/garnet-crow/<date>-<slug>.md`
- `raw/blog/misc/foo.md` → `src/data/blog/misc/<date>-<slug>.md`
- `raw/taste/notes/foo.md` → `src/data/taste/notes/<date>-<slug>.md`

If a raw file is at the wrong depth (e.g. `raw/foo.md` or `raw/blog/foo.md` without subcategory), ask the user where it should go before proceeding.

## Schemas

`blog` collection (`src/content.config.ts`):
- required: `title` (string), `pubDatetime` (date)
- optional: `modDatetime`, `featured`, `draft`, `tags` (array, default `["others"]`), `ogImage`, `description`, `canonicalURL`, `hideEditPost`, `timezone`, `author`

`taste` collection:
- required: `title` (string), `pubDatetime` (date)
- optional: `artist`, `workTitle`, `medium` (enum: `song|album|playlist|video|live|performance`, default `song`), plus all the optional blog fields, plus `sourceUrl`

## Steps

1. **Argument resolution**
   - If `$ARGUMENTS` is empty, list every `.md` file under `raw/` (excluding `raw/.published/`) and ask the user which one(s) to publish.
   - If `$ARGUMENTS` is a path or glob, resolve to one or more raw files. If no match, report and stop.

2. **For each raw file:**

   a. Read the file. Parse YAML frontmatter if present.

   b. **Infer collection/subcategory** from the path under `raw/`. If ambiguous, ask.

   c. **Title**: prefer existing frontmatter `title`. Else use the first `# heading` in the body. Else derive from the filename (drop date prefix and extension, replace `-`/`_` with spaces).

   d. **pubDatetime**: prefer existing frontmatter. Else if the filename starts with `YYYY-MM-DD`, use that date at `T00:00:00+09:00`. Else use today's date at `T00:00:00+09:00`.

   e. **Slug**: prefer existing filename's slug part (after stripping any `YYYY-MM-DD-` prefix and `.md` extension). Keep Korean characters as-is — existing posts use them (e.g. `2016-09-28-탈윤리-자라기.md`). Lowercase ASCII letters only; do not lowercase hangul.

   f. **Tags**: for `blog/<sub>` files, default `tags: ["<sub>"]` if no frontmatter tags (matches existing convention — see `src/data/blog/thoughts/2017-03-14-unblock.md`). For `taste`, leave tags out unless user provided.

   g. **Compose final frontmatter** by merging defaults with user-provided frontmatter (user wins). Keep field order consistent with existing posts: `title`, `pubDatetime`, `tags`, `description`, then collection-specific fields.

   h. **Target path**: `src/data/<collection>/<subcategory>/<YYYY-MM-DD>-<slug>.md`. If a file already exists there, ask before overwriting.

   i. **Body**: strip the source frontmatter block, keep the rest verbatim. If the body started with a `# title` heading that matched the title, drop it (Astro renders title separately).

   j. **Write** the new file.

   k. **Move the raw file** to `raw/.published/<original-relative-path>`, creating directories as needed. Don't delete — keep for recovery.

3. After all files processed, print a one-line summary per file: `published: <target-path>`.

## Constraints

- Do not modify any file outside `src/data/**`, `raw/**`, and the new content file you're creating.
- Do not invent fields outside the schema. If you see a frontmatter field that's not in the schema, warn the user and ask whether to drop it.
- Do not run the dev server, build, or git commands. This command only converts files.
- Korean filenames are fine; Astro handles them.

## Argument

`$ARGUMENTS`
