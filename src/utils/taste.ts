import type { CollectionEntry } from "astro:content";
import { TASTE_PATH } from "@/content.config";
import { getContentPath } from "./getContentPath";
import getSortedCollectionEntries from "./getSortedCollectionEntries";

export const TASTE_SECTIONS = {
  notes: {
    title: "notes",
    description: "",
  },
} as const;

export type TasteSection = keyof typeof TASTE_SECTIONS;

export const isTasteSection = (value: string): value is TasteSection =>
  Object.prototype.hasOwnProperty.call(TASTE_SECTIONS, value);

export const getTasteSection = (id: string): TasteSection | undefined => {
  const section = id.split("/")[0];

  if (!section || !isTasteSection(section)) {
    return undefined;
  }

  return section;
};

export const getSortedTasteEntries = (entries: CollectionEntry<"taste">[]) =>
  getSortedCollectionEntries(entries);

export const getTasteEntriesBySection = (
  entries: CollectionEntry<"taste">[],
  section: TasteSection
) => getSortedTasteEntries(entries).filter(entry => getTasteSection(entry.id) === section);

export function getTastePath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  return getContentPath({
    id,
    filePath,
    contentPath: TASTE_PATH,
    routeBase: "/taste",
    includeBase,
  });
}
