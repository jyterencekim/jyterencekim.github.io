import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import sanitizeHtml from "sanitize-html";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import toExcerpt from "@/utils/toExcerpt";
import { SITE } from "@/config";

const parser = new MarkdownIt().use(footnote);

// xml 1.0 has no escape for c0 controls - one stray byte invalidates the whole feed
// eslint-disable-next-line no-control-regex
const stripCtrl = (s: string) => s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

// feed readers render the html without a base url - resolve links against the site
const toAbsolute = (url: string) => {
  if (url.startsWith("#")) return url;
  try {
    return new URL(url, SITE.website).href;
  } catch {
    return url;
  }
};

const absolutize =
  (attr: "href" | "src"): sanitizeHtml.Transformer =>
  (tagName, attribs) => ({
    tagName,
    attribs: attribs[attr]
      ? { ...attribs, [attr]: toAbsolute(attribs[attr]) }
      : attribs,
  });

export async function GET() {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(post => {
      const { data, id, filePath } = post;
      const html = parser.render(post.body ?? "");
      return {
        link: getPath(id, filePath),
        title: data.title,
        // `||` not `??` - one post carries an explicit empty description
        description: stripCtrl(data.description || toExcerpt(post.body ?? "")),
        pubDate: new Date(data.modDatetime ?? data.pubDatetime),
        content: stripCtrl(
          sanitizeHtml(html, {
            // footnotes emit <sup>/<section>/<ol>/<li> carrying class, id and role
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              a: ["href", "name", "target", "id", "class", "role"],
              sup: ["class", "role"],
              section: ["class", "role"],
              ol: ["class"],
              li: ["id", "class", "role"],
              hr: ["class"],
            },
            transformTags: {
              a: absolutize("href"),
              img: absolutize("src"),
            },
          })
        ),
      };
    }),
    customData: `<language>${SITE.lang}</language>`,
  });
}
