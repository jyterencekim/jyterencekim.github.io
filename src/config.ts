export const SITE = {
  website: "https://jyterencekim.github.io/",
  author: "JY Terence Kim",
  profile: "https://jyterencekim.github.io/",
  desc: "Loose notes, translations, and occasional summaries gathered in one place.",
  title: "jyterencekim",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 8,
  postPerPage: 12,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit on GitHub",
    url: "https://github.com/jyterencekim/jyterencekim.github.io/edit/master/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Seoul", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
