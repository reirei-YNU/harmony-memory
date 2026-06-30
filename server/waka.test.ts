import { describe, it, expect } from "vitest";
import { scoreWaka } from "@shared/wakaScorer.js";
import {
  countMora,
  splitPhrases,
  detectUnknownKanji,
  convertToHiragana,
} from "@shared/moraCounter.js";

const HYAKUNIN_2 = "春すぎて\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";

// ─── countMora ────────────────────────────────────────────────────────────────

describe("countMora", () => {
  it("counts plain hiragana", () => {
    expect(countMora("はるすぎて")).toBe(5);
  });
  it("counts 春すぎて → 5", () => { expect(countMora("春すぎて")).toBe(5); });
  it("counts 夏来にけらし → 7", () => { expect(countMora("夏来にけらし")).toBe(7); });
  it("counts 白妙の → 5", () => { expect(countMora("白妙の")).toBe(5); });
  it("counts 衣ほすてふ → 7", () => { expect(countMora("衣ほすてふ")).toBe(7); });
  it("counts 天の香具山 → 7", () => { expect(countMora("天の香具山")).toBe(7); });
  it("combining small kana not counted separately", () => {
    expect(countMora("きゃ")).toBe(1);
  });
});

// ─── convertToHiragana ────────────────────────────────────────────────────────

describe("convertToHiragana", () => {
  it("白妙 → しろたへ", () => { expect(convertToHiragana("白妙")).toBe("しろたへ"); });
  it("天の香具山 → あめのかぐやま", () => {
    expect(convertToHiragana("天の香具山")).toBe("あめのかぐやま");
  });
  it("衣 → ころも", () => { expect(convertToHiragana("衣")).toBe("ころも"); });
  it("plain hiragana unchanged", () => {
    expect(convertToHiragana("はるすぎて")).toBe("はるすぎて");
  });
  it("katakana → hiragana", () => {
    expect(convertToHiragana("ハル")).toBe("はる");
  });
  it("tempDict overrides", () => {
    expect(convertToHiragana("倭", { 倭: "やまと" })).toBe("やまと");
  });
});

// ─── splitPhrases ─────────────────────────────────────────────────────────────

describe("splitPhrases", () => {
  it("splits into 5 phrases", () => {
    expect(splitPhrases(HYAKUNIN_2)).toHaveLength(5);
  });
  it("each phrase has correct mora", () => {
    const p = splitPhrases(HYAKUNIN_2);
    expect(p.map((x) => x.mora)).toEqual([5, 7, 5, 7, 7]);
  });
  it("all phrases are marked correct", () => {
    expect(splitPhrases(HYAKUNIN_2).every((p) => p.isCorrect)).toBe(true);
  });
  it("marks incorrect phrase when mora is wrong", () => {
    const bad = "春\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";
    expect(splitPhrases(bad)[0].isCorrect).toBe(false);
  });
});

// ─── detectUnknownKanji ───────────────────────────────────────────────────────

describe("detectUnknownKanji", () => {
  it("returns empty for known text", () => {
    expect(detectUnknownKanji(HYAKUNIN_2)).toHaveLength(0);
  });
  it("detects unknown kanji 倭", () => {
    const u = detectUnknownKanji("倭の国");
    expect(u.length).toBeGreaterThan(0);
    expect(u[0].kanji).toBe("倭");
  });
  it("does not flag kanji in tempDict", () => {
    const u = detectUnknownKanji("倭の国", { 倭: "やまと" });
    expect(u.some((x) => x.kanji === "倭")).toBe(false);
  });
});

// ─── scoreWaka (新型 breakdown) ──────────────────────────────────────────────

describe("scoreWaka — breakdown structure", () => {
  const r = scoreWaka(HYAKUNIN_2);

  it("has all 6 ScoreDimensions", () => {
    expect(r.breakdown).toHaveProperty("scenery");
    expect(r.breakdown).toHaveProperty("season");
    expect(r.breakdown).toHaveProperty("rhetorical");
    expect(r.breakdown).toHaveProperty("vocabulary");
    expect(r.breakdown).toHaveProperty("mora");
    expect(r.breakdown).toHaveProperty("structure");
  });

  it("total ≤ 100", () => {
    expect(r.breakdown.total).toBeLessThanOrEqual(100);
    expect(r.breakdown.total).toBeGreaterThanOrEqual(0);
  });

  it("total equals sum of dimension scores", () => {
    const { scenery, season, rhetorical, vocabulary, mora, structure, total } = r.breakdown;
    const sum = scenery.score + season.score + rhetorical.score + vocabulary.score + mora.score + structure.score;
    expect(total).toBe(Math.min(sum, 100));
  });

  it("each dimension has details array", () => {
    for (const dim of Object.values(r.breakdown).filter((v) => typeof v === "object" && "details" in (v as object))) {
      const d = dim as { details: unknown[] };
      expect(Array.isArray(d.details)).toBe(true);
    }
  });

  it("grade is a valid string", () => {
    expect(["S", "A", "B", "C+", "C", "D", "E"]).toContain(r.breakdown.grade);
  });
});

describe("scoreWaka — scores for HYAKUNIN #2", () => {
  const r = scoreWaka(HYAKUNIN_2);

  it("total ≥ 60", () => { expect(r.breakdown.total).toBeGreaterThanOrEqual(60); });
  it("mora score is 5 (all correct)", () => { expect(r.breakdown.mora.score).toBe(5); });
  it("structure score is 5", () => { expect(r.breakdown.structure.score).toBe(5); });
  it("scenery score > 0", () => { expect(r.breakdown.scenery.score).toBeGreaterThan(0); });
  it("season score > 0", () => { expect(r.breakdown.season.score).toBeGreaterThan(0); });
  it("rhetorical score > 0", () => { expect(r.breakdown.rhetorical.score).toBeGreaterThan(0); });

  it("detects 白妙 rhetorical device", () => {
    expect(r.rhetoricalDevices.some((d) => d.includes("白妙"))).toBe(true);
  });
  it("detects 掛詞 ほす", () => {
    expect(r.rhetoricalDevices.some((d) => d.includes("ほす"))).toBe(true);
  });
  it("detects season word 春", () => {
    expect(r.detectedSeasonWords.some((w) => w.includes("春"))).toBe(true);
  });

  it("has landscapeDescription string", () => {
    expect(typeof r.landscapeDescription).toBe("string");
    expect(r.landscapeDescription.length).toBeGreaterThan(5);
  });
  it("has ruleReview string", () => {
    expect(typeof r.ruleReview).toBe("string");
    expect(r.ruleReview.length).toBeGreaterThan(5);
  });
});

describe("scoreWaka — dimension max scores", () => {
  const r = scoreWaka(HYAKUNIN_2);
  it("scenery maxScore is 30", () => { expect(r.breakdown.scenery.maxScore).toBe(30); });
  it("season maxScore is 20", () => { expect(r.breakdown.season.maxScore).toBe(20); });
  it("rhetorical maxScore is 25", () => { expect(r.breakdown.rhetorical.maxScore).toBe(25); });
  it("vocabulary maxScore is 15", () => { expect(r.breakdown.vocabulary.maxScore).toBe(15); });
  it("mora maxScore is 5", () => { expect(r.breakdown.mora.maxScore).toBe(5); });
  it("structure maxScore is 5", () => { expect(r.breakdown.structure.maxScore).toBe(5); });
});

describe("scoreWaka — comparative", () => {
  it("poem with no season words scores 0 on season", () => {
    const plain = "人ぞ思ふ\n心の底の\nわびしさに\n夜ごと泣きつつ\nあかす悲しき";
    const r = scoreWaka(plain);
    expect(r.breakdown.season.score).toBe(0);
  });

  it("poem with bad mora scores less on mora", () => {
    const bad = "春\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山";
    const r = scoreWaka(bad);
    expect(r.breakdown.mora.score).toBeLessThan(5);
    expect(r.breakdown.structure.score).toBeLessThan(5);
  });

  it("improvements is non-empty array", () => {
    const r = scoreWaka(HYAKUNIN_2);
    expect(r.improvements.length).toBeGreaterThan(0);
  });
});
