import { BLOG_PATH } from "@/content.config";
import { getContentPath } from "./getContentPath";

/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  return getContentPath({
    id,
    filePath,
    contentPath: BLOG_PATH,
    routeBase: "/posts",
    includeBase,
  });
}
