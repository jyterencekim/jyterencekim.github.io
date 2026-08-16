// heuristic, in order:
//   "ko" when hangul is present and makes up >= 15% of hangul+latin letters
//   "ja" when kana is present and makes up >= 15% of kana+latin letters
//   "en" otherwise — no cjk at all, or only stray han in an otherwise latin text
//   (han without kana can't tell japanese from a chinese quote, so it never wins)
const HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏]/g;
const KANA = /[぀-ヿ]/g;
const HAN = /[一-鿿]/g;
const LATIN = /[A-Za-z]/g;

export default function detectLang(text?: string): "ko" | "ja" | "en" {
  if (!text) return "ko";
  const hangul = text.match(HANGUL)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  if (hangul === 0) {
    const kana = text.match(KANA)?.length ?? 0;
    const han = text.match(HAN)?.length ?? 0;
    if (kana + han === 0) return "en";
    return kana / (kana + latin) >= 0.15 ? "ja" : "en";
  }
  return hangul / (hangul + latin) >= 0.15 ? "ko" : "en";
}
