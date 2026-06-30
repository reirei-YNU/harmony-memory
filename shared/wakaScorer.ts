import { splitPhrases } from "./moraCounter.js";
import type { WakaAnalysis, Phrase } from "./types.js";

// ===== Rhetorical device detection =====

const MAKURA_KOTOBA: Array<[RegExp, string]> = [
  [/白妙の/, "枕詞「白妙の」"],
  [/千早ぶる/, "枕詞「千早ぶる」"],
  [/ちはやぶる/, "枕詞「ちはやぶる」"],
  [/あしびきの/, "枕詞「あしびきの」"],
  [/足引きの/, "枕詞「あしびきの」"],
  [/たらちねの/, "枕詞「たらちねの」"],
  [/垂乳根の/, "枕詞「たらちねの」"],
  [/ぬばたまの/, "枕詞「ぬばたまの」"],
  [/ひさかたの/, "枕詞「ひさかたの」"],
  [/久方の/, "枕詞「ひさかたの」"],
  [/あをによし/, "枕詞「あをによし」"],
  [/青丹よし/, "枕詞「あをによし」"],
  [/くさまくら/, "枕詞「くさまくら」"],
  [/草枕/, "枕詞「くさまくら」"],
  [/天つ風/, "枕詞「あまつかぜ」"],
  [/天津風/, "枕詞「あまつかぜ」"],
  [/あまつかぜ/, "枕詞「あまつかぜ」"],
];

const KAKEKOTOBA: Array<[RegExp, string]> = [
  [/衣ほす/, "掛詞「ほす」（干す・褒す）"],
  [/松/, "掛詞「まつ」（待つ・松）"],
  [/秋.*飽き|飽き.*秋/, "掛詞「あき」（秋・飽き）"],
  [/逢ふ|逢坂/, "掛詞「あふ」（逢ふ・逢坂）"],
  [/ながめ/, "掛詞「ながめ」（眺め・長雨）"],
  [/たつ.*立[田ち]|立[田ち].*たつ/, "掛詞「たつ」（立つ・龍田）"],
];

const ENGO_SETS: Array<[RegExp[], string]> = [
  [[/衣/, /袖/, /ほす/], "縁語（衣・袖・ほす）"],
  [[/月/, /夜/, /影/], "縁語（月・夜・影）"],
  [[/松/, /待つ/, /風/], "縁語（松・待つ・風）"],
  [[/花/, /散/, /春/], "縁語（花・散る・春）"],
  [[/雪/, /白/, /冬/], "縁語（雪・白・冬）"],
  [[/川/, /波/, /流/], "縁語（川・波・流れ）"],
];

export function detectRhetoricalDevices(text: string): string[] {
  const devices: string[] = [];

  for (const [pattern, label] of MAKURA_KOTOBA) {
    if (pattern.test(text)) devices.push(label);
  }

  for (const [pattern, label] of KAKEKOTOBA) {
    if (pattern.test(text)) devices.push(label);
  }

  for (const [patterns, label] of ENGO_SETS) {
    if (patterns.filter((p) => p.test(text)).length >= 2) {
      devices.push(label);
    }
  }

  return devices;
}

// ===== Season word detection =====

const SEASON_WORDS: Record<string, string> = {
  // 春
  "春": "春", "桜": "春", "梅": "春", "若菜": "春", "霞": "春",
  "うぐひす": "春", "鶯": "春", "卯花": "春", "藤": "春",
  "白妙": "春",
  // 夏
  "夏": "夏", "蛍": "夏", "卯": "夏", "田植": "夏",
  "あやめ": "夏", "菖蒲": "夏",
  // 秋
  "秋": "秋", "月": "秋", "紅葉": "秋", "もみぢ": "秋",
  "萩": "秋", "鹿": "秋", "露": "秋", "霧": "秋",
  "雁": "秋",
  // 冬
  "冬": "冬", "雪": "冬", "霜": "冬", "氷": "冬",
};

export function detectSeasonWords(text: string): string[] {
  const found: string[] = [];
  for (const [word, season] of Object.entries(SEASON_WORDS)) {
    if (text.includes(word)) {
      found.push(`${word}（${season}）`);
    }
  }
  return [...new Set(found)];
}

// ===== Scoring functions =====

// Visual / scenery keywords that indicate vivid imagery
const SCENERY_WORDS = [
  "山", "川", "海", "空", "雲", "月", "星", "花", "桜", "雪", "霞", "霧",
  "波", "風", "光", "影", "霜", "露", "緑", "紅", "白", "青", "色",
  "沢", "野", "原", "谷", "岩", "松", "森", "天", "地",
  "夕暮", "暁", "朝", "夜", "宵",
];

function calculateSceneryScore(text: string): number {
  let score = 0;
  let matches = 0;

  for (const word of SCENERY_WORDS) {
    if (text.includes(word)) matches++;
  }

  // Base score from scenery density
  score = Math.min(30, matches * 6);

  // Bonus for compound imagery (at least 2 nature elements = richer scene)
  if (matches >= 3) score += 5;
  if (matches >= 5) score += 5;

  return Math.min(40, score);
}

function calculateSeasonScore(detectedSeasonWords: string[]): number {
  if (detectedSeasonWords.length === 0) return 0;

  // Award points for having season words
  let score = Math.min(20, detectedSeasonWords.length * 8);

  // Bonus for clear seasonal expression
  if (detectedSeasonWords.length >= 2) score += 5;

  return Math.min(25, score);
}

function calculateRhetoricalScore(devices: string[]): number {
  if (devices.length === 0) return 0;
  return Math.min(20, devices.length * 7);
}

const CLASSICAL_VOCAB = [
  // Historical kana / classical endings
  "けり", "らし", "てふ", "にけり", "にけらし",
  "べき", "らむ", "けむ", "なむ", "こそ",
  "なり", "たり", "めり",
  // Classical pillow words (raw text)
  "ちはやぶる", "ぬばたまの", "あしびきの", "ひさかたの",
  // Classical postpositions / conjunctions
  "をとめ", "あはれ", "いかに",
];

function calculateVocabularyScore(text: string): number {
  let score = 0;
  for (const word of CLASSICAL_VOCAB) {
    if (text.includes(word)) score += 3;
  }
  return Math.min(10, score);
}

function calculateMoraScore(phrases: Phrase[]): number {
  if (phrases.length !== 5) {
    return phrases.length === 0 ? 0 : 1;
  }
  const correctCount = phrases.filter((p) => p.isCorrect).length;
  // 5 correct = 5 pts, 4 = 4, 3 = 3, 2 = 2, 1 = 1, 0 = 0
  return correctCount;
}

export function getGrade(total: number): string {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C+";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "E";
}

function generateImprovements(analysis: {
  breakdown: { sceneryScore: number; seasonScore: number; rhetoricalScore: number; vocabularyScore: number; moraScore: number };
  phrases: Phrase[];
  rhetoricalDevices: string[];
  detectedSeasonWords: string[];
}): string[] {
  const hints: string[] = [];
  const { breakdown, phrases, rhetoricalDevices, detectedSeasonWords } = analysis;

  if (breakdown.moraScore < 5) {
    const wrong = phrases.filter((p) => !p.isCorrect);
    for (const p of wrong) {
      hints.push(
        `「${p.text}」の音数は${p.mora}音です（正しくは${p.expectedMora}音）。`
      );
    }
  }

  if (detectedSeasonWords.length === 0) {
    hints.push("季語を取り入れると、季節感が深まります。");
  }

  if (rhetoricalDevices.length === 0) {
    hints.push(
      "枕詞（白妙の・ちはやぶるなど）や掛詞を使うと技法点が上がります。"
    );
  }

  if (breakdown.sceneryScore < 20) {
    hints.push("山・川・月・花など自然の言葉を増やすと情景が豊かになります。");
  }

  if (breakdown.vocabularyScore < 5) {
    hints.push(
      "「けり」「らし」「てふ」などの古典的な言い回しを使うと語法点が上がります。"
    );
  }

  if (hints.length === 0) {
    hints.push("見事な歌です。さらに独自の情景表現で磨きをかけてください。");
  }

  return hints;
}

// ===== Main scoring function =====

export function scoreWaka(
  text: string,
  tempDict: Record<string, string> = {}
): WakaAnalysis {
  const phrases = splitPhrases(text, tempDict);
  const rhetoricalDevices = detectRhetoricalDevices(text);
  const detectedSeasonWords = detectSeasonWords(text);

  const sceneryScore = calculateSceneryScore(text);
  const seasonScore = calculateSeasonScore(detectedSeasonWords);
  const rhetoricalScore = calculateRhetoricalScore(rhetoricalDevices);
  const vocabularyScore = calculateVocabularyScore(text);
  const moraScore = calculateMoraScore(phrases);

  const total = sceneryScore + seasonScore + rhetoricalScore + vocabularyScore + moraScore;
  const grade = getGrade(total);

  const breakdown = {
    sceneryScore,
    seasonScore,
    rhetoricalScore,
    vocabularyScore,
    moraScore,
    total,
    grade,
  };

  const improvements = generateImprovements({
    breakdown,
    phrases,
    rhetoricalDevices,
    detectedSeasonWords,
  });

  return {
    breakdown,
    phrases,
    rhetoricalDevices,
    detectedSeasonWords,
    improvements,
  };
}
