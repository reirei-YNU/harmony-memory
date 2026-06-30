import { kanjiDict } from "./kanjiDict.js";
import type { Phrase } from "./types.js";

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
        unknowns.push({ kanji: ch, position: i });
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
