import type { CollectionEntry } from "astro:content";
import isContentPublished from "./isContentPublished";

const postFilter = (post: CollectionEntry<"blog">) => isContentPublished(post);

export default postFilter;
