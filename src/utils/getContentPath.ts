import { slugifyStr } from "./slugify";

interface GetContentPathOptions {
  id: string;
  filePath: string | undefined;
  contentPath: string;
  routeBase: string;
  includeBase?: boolean;
}

export function getContentPath({
  id,
  filePath,
  contentPath,
  routeBase,
  includeBase = true,
}: GetContentPathOptions) {
  const pathSegments = filePath
    ?.replace(contentPath, "")
    .split("/")
    .filter(path => path !== "")
    .filter(path => !path.startsWith("_"))
    .slice(0, -1)
    .map(segment => slugifyStr(segment));

  const normalizedBasePath = includeBase
    ? routeBase.replace(/\/$/, "")
    : "";
  const contentId = id.split("/");
  const slug = contentId.length > 0 ? contentId.slice(-1) : contentId;

  if (!pathSegments || pathSegments.length < 1) {
    return [normalizedBasePath, slug].join("/");
  }

  return [normalizedBasePath, ...pathSegments, slug].join("/");
}
