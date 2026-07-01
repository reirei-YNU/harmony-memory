import { kanjiDict } from "./kanjiDict.js";
import type { Phrase } from "./types.js";

// 辞書にない漢字への推測読み（よく使われる和歌・詩歌用語）
const KANJI_HINTS: Record<string, string> = {
  "竜": "たつ", "龍": "りゅう", "河": "かは", "池": "いけ", "江": "え",
  "滝": "たき", "丘": "をか", "坂": "さか", "土": "つち",
  "珠": "たま", "玉": "たま", "宝": "たから", "鏡": "かがみ",
  "舟": "ふね", "船": "ふね", "橋": "はし", "琴": "こと",
  "笛": "ふえ", "舞": "まひ", "御": "み", "大": "おほ", "小": "ちひさ",
  "美": "うつくし", "清": "きよ", "静": "しづ", "暗": "くら", "明": "あき",
  "枝": "えだ", "根": "ね", "実": "み", "種": "たね",
  "霰": "あられ", "雷": "かみなり", "燕": "つばめ", "鷹": "たか",
  "鷺": "さぎ", "烏": "からす", "虫": "むし",
  "和": "やはら", "路": "みち", "浦": "うら", "磯": "いそ",
  "紫": "むらさき", "緑": "みどり", "橙": "だいだい",
  "焔": "ほのほ", "炎": "ほのほ", "灯": "ともしび", "燈": "ともしび",
  "氷": "こほり", "凍": "こほ",
  "籬": "まがき", "垣": "かき", "庭": "には", "苑": "その",
  "汀": "みぎは", "渚": "なぎさ", "湊": "みなと", "港": "みなと",
  "峯": "みね", "尾": "を", "翼": "つばさ",
  "薫": "かをる", "菫": "すみれ", "蓬": "よもぎ",
  "蒲": "がま", "苔": "こけ", "蔦": "つた",
  "峰": "みね", "嶺": "みね", "谷": "たに",
  "恋": "こひ", "愁": "うれひ", "憂": "うれひ",
  "春": "はる", "暮": "くれ", "暁": "あかつき",
  "柳": "やなぎ", "苗": "なへ", "田": "た", "畑": "はたけ",
  "礒": "いそ", "浜": "はま", "潮": "しほ", "岸": "きし",
  "雀": "すずめ", "鶴": "つる", "鷗": "かもめ", "蝶": "てふ",
  "絹": "きぬ", "布": "ぬの", "糸": "いと", "紐": "ひも",
};

// Small kana that combine with the previous character (not counted as separate mora)
const COMBINING_SMALL_KANA = new Set(
  "ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ".split("")
);

// Hiragana range: U+3041–U+309F
// Katakana range: U+30A0–U+30FF
const HIRAGANA_RE = /[ぁ-ゟ]/;
const KATAKANA_RE = /[゠-ヿ]/;

function katakanaToHiragana(ch: string): string {
  return String.fromCharCode(ch.charCodeAt(0) - 0x60);
}

// Convert text (may contain kanji, hiragana, katakana) to hiragana.
// tempDict overrides are used when the user supplies a reading for an unknown kanji.
export function convertToHiragana(
  text: string,
  tempDict: Record<string, string> = {}
): string {
  const dict = { ...kanjiDict, ...tempDict };
  let result = "";
  let i = 0;

  while (i < text.length) {
    let matched = false;

    // Try longest match first (up to 8 chars)
    const maxLen = Math.min(8, text.length - i);
    for (let len = maxLen; len >= 1; len--) {
      const substr = text.slice(i, i + len);
      if (dict[substr] !== undefined) {
        result += dict[substr];
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const ch = text[i];
      if (HIRAGANA_RE.test(ch)) {
        result += ch;
      } else if (KATAKANA_RE.test(ch)) {
        result += katakanaToHiragana(ch);
      } else {
        // Unknown character (unregistered kanji, punctuation, space, etc.)
        // Keep as-is; unknown kanji detection handles it separately.
        result += ch;
      }
      i++;
    }
  }

  return result;
}

export function isSmallKana(ch: string): boolean {
  return COMBINING_SMALL_KANA.has(ch);
}

// Count mora in a text string (may include kanji).
export function countMora(
  text: string,
  tempDict: Record<string, string> = {}
): number {
  const hiragana = convertToHiragana(text, tempDict);
  let count = 0;
  for (const ch of hiragana) {
    if (isSmallKana(ch)) continue;
    if (HIRAGANA_RE.test(ch) || KATAKANA_RE.test(ch)) {
      count++;
    }
    // ん(U+3093) and っ(U+3063) are hiragana so already counted
  }
  return count;
}

const EXPECTED_MORA = [5, 7, 5, 7, 7];

// Split waka text (newline-delimited) into Phrase objects.
export function splitPhrases(
  text: string,
  tempDict: Record<string, string> = {}
): Phrase[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return lines.map((line, i) => {
    const mora = countMora(line, tempDict);
    const expected = EXPECTED_MORA[i] ?? 7;
    return {
      text: line,
      mora,
      expectedMora: expected,
      isCorrect: mora === expected,
    };
  });
}

// Detect kanji characters that are NOT in the dictionary.
export function detectUnknownKanji(
  text: string,
  tempDict: Record<string, string> = {}
): Array<{ kanji: string; position: number }> {
  const dict = { ...kanjiDict, ...tempDict };
  const unknowns: Array<{ kanji: string; position: number }> = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    // CJK Unified Ideographs block
    if (ch >= "一" && ch <= "鿿") {
      // Try to match a compound word starting here
      let matchedLen = 0;
      const maxLen = Math.min(8, text.length - i);
      for (let len = maxLen; len >= 1; len--) {
        if (dict[text.slice(i, i + len)] !== undefined) {
          matchedLen = len;
          break;
        }
      }
      if (matchedLen === 0) {
        // Not in any dictionary → unknown
        const suggested = KANJI_HINTS[ch] ?? "";
        unknowns.push({ kanji: ch, position: i, suggested });
        i++;
      } else {
        i += matchedLen;
      }
    } else {
      i++;
    }
  }

  return unknowns;
}
