import type { CollectionEntry } from "astro:content";
import getSortedCollectionEntries from "./getSortedCollectionEntries";

const getSortedPosts = (posts: CollectionEntry<"blog">[]) =>
  getSortedCollectionEntries(posts);

export default getSortedPosts;
