import isContentPublished from "./isContentPublished";

interface DatedEntry {
  data: {
    draft?: boolean;
    pubDatetime: string | Date;
    modDatetime?: string | Date | null;
  };
}

const getSortedCollectionEntries = <T extends DatedEntry>(entries: T[]) => {
  return [...entries]
    .filter(isContentPublished)
    .sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );
};

export default getSortedCollectionEntries;
