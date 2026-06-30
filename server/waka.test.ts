import { describe, it, expect } from "vitest";
import { scoreWaka } from "@shared/wakaScorer.js";
import {
  countMora,
  splitPhrases,
  detectUnknownKanji,
  convertToHiragana,
} from "@shared/moraCounter.js";

// The most famous waka from the Hyakunin Isshu (Poem #2 by Jito Tenno)
const HYAKUNIN_2 = "春すぎて\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";

// ===== mora counter tests =====

describe("countMora", () => {
  it("counts basic hiragana correctly", () => {
    expect(countMora("はるすぎて")).toBe(5);
  });

  it("counts 5-mora phrase: 春すぎて", () => {
    expect(countMora("春すぎて")).toBe(5);
  });

  it("counts 7-mora phrase: 夏来にけらし", () => {
    expect(countMora("夏来にけらし")).toBe(7);
  });

  it("counts 5-mora phrase: 白妙の", () => {
    expect(countMora("白妙の")).toBe(5);
  });

  it("counts 7-mora phrase: 衣ほすてふ", () => {
    expect(countMora("衣ほすてふ")).toBe(7);
  });

  it("counts 7-mora phrase: 天の香具山", () => {
    expect(countMora("天の香具山")).toBe(7);
  });

  it("does not count combining small kana as separate mora", () => {
    // きゃ = き + ゃ → 1 mora (ゃ is combining)
    expect(countMora("きゃ")).toBe(1);
  });
});

// ===== convertToHiragana tests =====

describe("convertToHiragana", () => {
  it("converts 白妙 to しろたへ", () => {
    expect(convertToHiragana("白妙")).toBe("しろたへ");
  });

  it("converts 天の香具山 to あめのかぐやま", () => {
    expect(convertToHiragana("天の香具山")).toBe("あめのかぐやま");
  });

  it("converts 衣 to ころも", () => {
    expect(convertToHiragana("衣")).toBe("ころも");
  });

  it("preserves hiragana as-is", () => {
    expect(convertToHiragana("はるすぎて")).toBe("はるすぎて");
  });

  it("converts katakana to hiragana", () => {
    expect(convertToHiragana("ハル")).toBe("はる");
  });

  it("uses tempDict for unknown kanji", () => {
    expect(convertToHiragana("倭", { 倭: "やまと" })).toBe("やまと");
  });
});

// ===== splitPhrases tests =====

describe("splitPhrases", () => {
  it("splits 5-phrase waka correctly", () => {
    const phrases = splitPhrases(HYAKUNIN_2);
    expect(phrases).toHaveLength(5);
  });

  it("each phrase has correct mora count", () => {
    const phrases = splitPhrases(HYAKUNIN_2);
    expect(phrases[0].mora).toBe(5);
    expect(phrases[1].mora).toBe(7);
    expect(phrases[2].mora).toBe(5);
    expect(phrases[3].mora).toBe(7);
    expect(phrases[4].mora).toBe(7);
  });

  it("marks all phrases as correct for Hyakunin Isshu poem #2", () => {
    const phrases = splitPhrases(HYAKUNIN_2);
    expect(phrases.every((p) => p.isCorrect)).toBe(true);
  });

  it("marks phrase as incorrect when mora count is wrong", () => {
    const badWaka = "春\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";
    const phrases = splitPhrases(badWaka);
    expect(phrases[0].isCorrect).toBe(false);
    expect(phrases[0].mora).not.toBe(5);
  });
});

// ===== detectUnknownKanji tests =====

describe("detectUnknownKanji", () => {
  it("returns empty array when all kanji are known", () => {
    const unknowns = detectUnknownKanji(HYAKUNIN_2);
    expect(unknowns).toHaveLength(0);
  });

  it("detects unknown kanji", () => {
    const unknowns = detectUnknownKanji("倭の国");
    expect(unknowns.length).toBeGreaterThan(0);
    expect(unknowns[0].kanji).toBe("倭");
  });

  it("does not flag kanji that are in tempDict", () => {
    const unknowns = detectUnknownKanji("倭の国", { 倭: "やまと" });
    const has = unknowns.some((u) => u.kanji === "倭");
    expect(has).toBe(false);
  });
});

// ===== scoreWaka tests =====

describe("scoreWaka", () => {
  it("scores the famous poem #2 at 60 or above", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.total).toBeGreaterThanOrEqual(60);
  });

  it("mora score is 5 for poem #2", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.moraScore).toBe(5);
  });

  it("detects rhetorical device 白妙の", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.rhetoricalDevices.some((d) => d.includes("白妙"))).toBe(true);
  });

  it("detects rhetorical device 掛詞「ほす」", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.rhetoricalDevices.some((d) => d.includes("ほす"))).toBe(true);
  });

  it("detects season word 春", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.detectedSeasonWords.some((w) => w.includes("春"))).toBe(true);
  });

  it("assigns a grade string", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(["S", "A", "B", "C+", "C", "D", "E"]).toContain(
      result.breakdown.grade
    );
  });

  it("returns exactly 5 phrases for 5-line waka", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.phrases).toHaveLength(5);
  });

  it("returns improvements array", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(Array.isArray(result.improvements)).toBe(true);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it("scores lower when mora is wrong", () => {
    const badWaka = "春\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";
    const result = scoreWaka(badWaka);
    expect(result.breakdown.moraScore).toBeLessThan(5);
  });

  it("scenery score is positive for poem with nature words", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.sceneryScore).toBeGreaterThan(0);
  });

  it("season score is positive for poem with season words", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.seasonScore).toBeGreaterThan(0);
  });

  it("rhetorical score is positive for poem with rhetorical devices", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.rhetoricalScore).toBeGreaterThan(0);
  });

  it("scores poem with no nature words lower on scenery", () => {
    const dullWaka = "人ぞ思ふ\n心の底の\nわびしさに\n夜ごと泣きつつ\nあかす悲しき";
    const result = scoreWaka(dullWaka);
    const rich = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown.sceneryScore).toBeLessThanOrEqual(
      rich.breakdown.sceneryScore
    );
  });

  it("returns breakdown with all expected fields", () => {
    const result = scoreWaka(HYAKUNIN_2);
    expect(result.breakdown).toHaveProperty("sceneryScore");
    expect(result.breakdown).toHaveProperty("seasonScore");
    expect(result.breakdown).toHaveProperty("rhetoricalScore");
    expect(result.breakdown).toHaveProperty("vocabularyScore");
    expect(result.breakdown).toHaveProperty("moraScore");
    expect(result.breakdown).toHaveProperty("total");
    expect(result.breakdown).toHaveProperty("grade");
  });

  it("total equals sum of subscores", () => {
    const result = scoreWaka(HYAKUNIN_2);
    const { sceneryScore, seasonScore, rhetoricalScore, vocabularyScore, moraScore, total } =
      result.breakdown;
    expect(total).toBe(sceneryScore + seasonScore + rhetoricalScore + vocabularyScore + moraScore);
  });
});
