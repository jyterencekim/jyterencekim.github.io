import type { CollectionEntry } from "astro:content";
import { TASTE_PATH } from "@/content.config";
import { getContentPath } from "./getContentPath";
import getSortedCollectionEntries from "./getSortedCollectionEntries";

export const TASTE_SECTIONS = {
  listens: {
    title: "listens",
    description:
      "귀에 남은 곡, 앨범, 플레이리스트를 따로 적어두는 쪽.",
  },
  watches: {
    title: "watches",
    description:
      "뮤직비디오, 라이브, 무대처럼 화면과 장면이 같이 남는 쪽.",
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
