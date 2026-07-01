import { splitPhrases, convertToHiragana } from "./moraCounter.js";
import {
  hashText,
  pick,
  LANDSCAPE_OPENING,
  LANDSCAPE_SCENE,
  LANDSCAPE_CLOSING,
  LANDSCAPE_RHETORICAL,
  LANDSCAPE_MORA_PERFECT,
  REVIEW_OPENING,
  REVIEW_MORA_OK,
  REVIEW_MORA_NG,
  REVIEW_RHETORICAL_MANY,
  REVIEW_RHETORICAL_ONE,
  REVIEW_RHETORICAL_NONE,
  REVIEW_SEASON,
  REVIEW_CLOSING,
} from "./textPatterns.js";
import type {
  WakaAnalysis,
  WakaBreakdown,
  ScoreDimension,
  SubDetail,
  Phrase,
} from "./types.js";

// ─── 汎用ユーティリティ ───────────────────────────────────────────────────────

function cap(v: number, max: number): number {
  return Math.min(v, max);
}

function makeDim(details: SubDetail[], maxScore: number): ScoreDimension {
  const score = cap(
    details.filter((d) => d.achieved).reduce((s, d) => s + d.points, 0),
    maxScore
  );
  return { score, maxScore, details };
}

// Check both raw text and hiragana-converted text (handles 紅葉→もみぢ etc.)
function inText(word: string, raw: string, hira: string): boolean {
  return raw.includes(word) || hira.includes(word);
}

function detected(text: string, hira: string, words: string[]): string[] {
  return words.filter((w) => inText(w, text, hira));
}

// ─── 情景表現力 (30pt) ──────────────────────────────────────────────────────

const NATURE_GROUPS: Array<{ label: string; words: string[]; pts: number }> = [
  { label: "天空・大気",      words: ["天", "空", "雲", "霞", "霧", "煙"], pts: 5 },
  { label: "山岳・地形",      words: ["山", "峰", "嶺", "谷", "岩", "野", "原"], pts: 5 },
  { label: "天体（月・星）",  words: ["月", "星", "日", "光", "影", "日暮"], pts: 5 },
  { label: "水景",            words: ["川", "海", "波", "水", "湖", "沢", "涙"], pts: 4 },
  { label: "草花・樹木",      words: ["花", "桜", "梅", "萩", "藤", "橘", "菊", "松", "竹", "木", "草", "葉", "紅葉", "若菜"], pts: 4 },
  { label: "白色の表現",      words: ["白", "白妙", "雪", "霜"], pts: 4 },
  { label: "色彩語（白以外）",words: ["紅", "くれなゐ", "あを", "青", "黄", "緑", "黒", "金"], pts: 3 },
  { label: "動態・変化",      words: ["散", "流", "吹", "降", "照", "染", "揺", "咲", "消"], pts: 3 },
  { label: "時間帯・天候",    words: ["朝", "夕", "暁", "宵", "夜", "昼", "嵐", "霰", "露"], pts: 2 },
  { label: "空間の対比",      words: ["遠", "近", "深", "高", "上", "下"], pts: 2 },
];

function scoreScenery(text: string, hira: string): {
  dim: ScoreDimension;
  natureWords: string[];
  colors: string[];
} {
  const natureWords: string[] = [];
  const colors: string[] = [];
  const details: SubDetail[] = [];

  for (const g of NATURE_GROUPS) {
    const hits = detected(text, hira, g.words);
    const achieved = hits.length > 0;
    if (achieved) {
      natureWords.push(...hits.slice(0, 2));
      if (g.label.includes("色") || g.label.includes("白")) colors.push(...hits);
    }
    details.push({
      label: achieved
        ? `${g.label}（${hits.slice(0, 2).join("・")}）`
        : g.label,
      points: g.pts,
      achieved,
    });
  }

  return { dim: makeDim(details, 30), natureWords, colors };
}

// ─── 季語・季節感 (20pt) ────────────────────────────────────────────────────

const KIGO: Record<string, string[]> = {
  春: ["春", "桜", "梅", "若菜", "霞", "鶯", "うぐひす", "卯花", "藤", "白妙", "春霞", "春風"],
  夏: ["夏", "蛍", "卯", "田植", "あやめ", "菖蒲", "夏来", "衣ほす"],
  秋: ["秋", "月", "紅葉", "もみぢ", "萩", "鹿", "露", "霧", "雁", "秋風", "秋来"],
  冬: ["冬", "雪", "霜", "氷", "冬来", "千鳥"],
};

function scoreSeason(text: string, hira: string): {
  dim: ScoreDimension;
  seasonWords: string[];
} {
  const foundBySeason: Record<string, string[]> = {};
  for (const [season, words] of Object.entries(KIGO)) {
    const hits = words.filter((w) => inText(w, text, hira));
    if (hits.length) foundBySeason[season] = hits;
  }

  const seasons = Object.keys(foundBySeason);
  const seasonWords: string[] = [];
  for (const [s, ws] of Object.entries(foundBySeason)) {
    for (const w of ws) seasonWords.push(`${w}（${s}）`);
  }

  const hasKigo = seasons.length > 0;
  const isConsistent = seasons.length === 1;
  const hasMixedSeasons = seasons.length >= 2;
  const hasRichKigo = seasons.some((s) => (foundBySeason[s]?.length ?? 0) >= 2);

  const details: SubDetail[] = [
    {
      label: hasKigo
        ? `季語あり（${seasonWords.slice(0, 3).join("・")}）`
        : "季語なし",
      points: 10,
      achieved: hasKigo,
    },
    {
      label: isConsistent
        ? `季節の一貫性（${seasons[0]}）`
        : hasMixedSeasons
        ? `複数季節混在（減点なし・個性として評価）`
        : "季節の一貫性",
      points: 5,
      achieved: isConsistent,
    },
    {
      label: hasRichKigo
        ? "季語の重層的な使用（複数季語語）"
        : "季語の重層的な使用",
      points: 5,
      achieved: hasRichKigo,
    },
  ];

  return { dim: makeDim(details, 20), seasonWords };
}

// ─── 修辞技法 (25pt) ────────────────────────────────────────────────────────

interface RhetoricalPattern {
  name: string;
  pattern: RegExp;
  pts: number;
  desc: string;
}

const MAKURA_KOTOBA: RhetoricalPattern[] = [
  { name: "枕詞", pattern: /白妙の/, pts: 8, desc: "白妙の（衣・雪・雲を修飾）" },
  { name: "枕詞", pattern: /ちはやぶる|千早ぶる/, pts: 8, desc: "ちはやぶる（神を修飾）" },
  { name: "枕詞", pattern: /あしびきの|足引きの/, pts: 8, desc: "あしびきの（山を修飾）" },
  { name: "枕詞", pattern: /たらちねの|垂乳根の/, pts: 8, desc: "たらちねの（母を修飾）" },
  { name: "枕詞", pattern: /ぬばたまの/, pts: 8, desc: "ぬばたまの（夜・黒を修飾）" },
  { name: "枕詞", pattern: /ひさかたの|久方の/, pts: 8, desc: "ひさかたの（天・光を修飾）" },
  { name: "枕詞", pattern: /あをによし|青丹よし/, pts: 8, desc: "あをによし（奈良を修飾）" },
  { name: "枕詞", pattern: /くさまくら|草枕/, pts: 8, desc: "くさまくら（旅を修飾）" },
  { name: "枕詞", pattern: /あまつかぜ|天津風|天つ風/, pts: 8, desc: "あまつかぜ（天の風）" },
  { name: "枕詞", pattern: /をちこちの/, pts: 8, desc: "をちこちの（遠近を修飾）" },
];

const KAKEKOTOBA: RhetoricalPattern[] = [
  { name: "掛詞", pattern: /衣ほす|衣干す/, pts: 7, desc: "ほす（干す・穂す）" },
  { name: "掛詞", pattern: /まつ.*恋|待.*松|松.*待/, pts: 7, desc: "まつ（待つ・松）" },
  { name: "掛詞", pattern: /ながめ/, pts: 7, desc: "ながめ（眺め・長雨）" },
  { name: "掛詞", pattern: /立田|龍田/, pts: 7, desc: "たつ（立つ・龍田）" },
  { name: "掛詞", pattern: /逢坂|逢ふ/, pts: 7, desc: "あふ（逢ふ・逢坂）" },
  { name: "掛詞", pattern: /ふる.*古|古.*ふる/, pts: 7, desc: "ふる（降る・古る）" },
  { name: "掛詞", pattern: /飽き.*秋|秋.*飽き/, pts: 7, desc: "あき（秋・飽き）" },
  { name: "掛詞", pattern: /ねの.*根|根.*ねの/, pts: 7, desc: "ね（寝・根）" },
  { name: "掛詞", pattern: /いく.*生く|生.*いく/, pts: 7, desc: "いく（行く・生く）" },
];

const ENGO_SETS: Array<{ label: string; patterns: RegExp[]; pts: number }> = [
  { label: "縁語（衣・袖・ほす）", patterns: [/衣/, /袖/, /ほす/], pts: 4 },
  { label: "縁語（月・夜・影）",   patterns: [/月/, /夜|宵/, /影/], pts: 4 },
  { label: "縁語（松・風・待）",   patterns: [/松/, /風/, /待/], pts: 4 },
  { label: "縁語（花・散・春）",   patterns: [/花|桜/, /散/, /春/], pts: 4 },
  { label: "縁語（雪・白・冬）",   patterns: [/雪/, /白|しろ/, /冬/], pts: 4 },
  { label: "縁語（川・波・流）",   patterns: [/川|かは/, /波|なみ/, /流/], pts: 4 },
  { label: "縁語（山・霞・春）",   patterns: [/山/, /霞|かすみ/, /春/], pts: 4 },
];

const JO_KOTOBA_RE = [
  /あしびきの山鳥の尾のしだり尾/,
  /いにしへの奈良の都の/,
  /田子の浦にうちいでて見れば/,
];

// 本歌取り：有名な和歌のフレーズとの一致
const HONKADORI: Array<{ label: string; pattern: RegExp; pts: number }> = [
  { label: "本歌取り（春すぎて）", pattern: /春すぎて.{0,4}夏/, pts: 5 },
  { label: "本歌取り（ちはやぶる）", pattern: /ちはやぶる.{0,4}神/, pts: 5 },
  { label: "本歌取り（田子の浦）", pattern: /田子の浦/, pts: 5 },
  { label: "本歌取り（あしびきの）", pattern: /あしびきの.{0,4}山鳥/, pts: 5 },
];

function scoreRhetorical(text: string, hira: string): {
  dim: ScoreDimension;
  devices: string[];
} {
  const details: SubDetail[] = [];
  const devices: string[] = [];
  let ptSum = 0;

  // 枕詞（最大2つ認定）
  let makuraCount = 0;
  for (const m of MAKURA_KOTOBA) {
    if (m.pattern.test(text) || m.pattern.test(hira)) {
      const achieved = makuraCount < 2;
      const pts = achieved ? m.pts : 0;
      details.push({ label: m.desc, points: pts, achieved });
      if (achieved) {
        devices.push(m.desc);
        ptSum += pts;
        makuraCount++;
      }
      if (makuraCount >= 2) break;
    }
  }

  // 掛詞（最大1つ認定）
  let kakeCount = 0;
  for (const k of KAKEKOTOBA) {
    if ((k.pattern.test(text) || k.pattern.test(hira)) && kakeCount < 1) {
      details.push({ label: k.desc, points: k.pts, achieved: true });
      devices.push(k.desc);
      ptSum += k.pts;
      kakeCount++;
      break;
    }
  }

  // 縁語
  for (const e of ENGO_SETS) {
    const hits = e.patterns.filter((p) => p.test(text) || p.test(hira)).length;
    if (hits >= 2) {
      details.push({ label: e.label, points: e.pts, achieved: true });
      devices.push(e.label);
      ptSum += e.pts;
      break; // 縁語は1セットのみ
    }
  }

  // 序詞
  for (const jo of JO_KOTOBA_RE) {
    if (jo.test(text) || jo.test(hira)) {
      details.push({ label: "序詞（長い導入句）", points: 5, achieved: true });
      devices.push("序詞");
      ptSum += 5;
      break;
    }
  }

  // 本歌取り
  for (const h of HONKADORI) {
    if (h.pattern.test(text) || h.pattern.test(hira)) {
      details.push({ label: h.label, points: h.pts, achieved: true });
      devices.push(h.label);
      ptSum += h.pts;
      break;
    }
  }

  // 未検出項目をまとめて表示
  if (makuraCount === 0) {
    details.push({ label: "枕詞（未検出）", points: 8, achieved: false });
  }
  if (kakeCount === 0) {
    details.push({ label: "掛詞（未検出）", points: 7, achieved: false });
  }
  if (!devices.some((d) => d.includes("縁語"))) {
    details.push({ label: "縁語（未検出）", points: 4, achieved: false });
  }

  const score = cap(ptSum, 25);
  return { dim: { score, maxScore: 25, details }, devices };
}

// ─── 古典語法 (15pt) ────────────────────────────────────────────────────────

const CLASSICAL_GRAMMAR: Array<{ label: string; patterns: RegExp[]; pts: number }> = [
  { label: "詠嘆の終止「けり」",      patterns: [/けり/], pts: 3 },
  { label: "推定「らし」",            patterns: [/らし/], pts: 3 },
  { label: "伝聞「てふ・といふ」",    patterns: [/てふ|といふ/], pts: 3 },
  { label: "完了「にけり」",          patterns: [/にけり/], pts: 3 },
  { label: "詠嘆「にけらし」",        patterns: [/にけらし/], pts: 3 },
  { label: "意志・推量「べし・らむ」",patterns: [/べし|べき|らむ|けむ/], pts: 2 },
  { label: "強調「こそ・なむ」",      patterns: [/こそ|なむ/], pts: 2 },
  { label: "断定「なり・たり」",      patterns: [/なり|たり/], pts: 2 },
  { label: "過去「き・けり」",        patterns: [/\bき\b|けり/], pts: 2 },
  { label: "歴史的仮名遣い「ふ行」",  patterns: [/ほすてふ|てふ|かはづ|いふ|ゆふ|かは/, ], pts: 2 },
  { label: "歴史的仮名遣い「はひふへほ」", patterns: [/うへ|かは|にほ|かへ|おほ/], pts: 2 },
  { label: "雅語「あはれ・をかし」",  patterns: [/あはれ|をかし|ゆかし/], pts: 2 },
  { label: "雅語「いにしへ・むかし」",patterns: [/いにしへ|むかし|をとめ/], pts: 2 },
];

function scoreVocabulary(text: string, hira: string): ScoreDimension {
  const details: SubDetail[] = [];
  for (const g of CLASSICAL_GRAMMAR) {
    const achieved = g.patterns.some((p) => p.test(text) || p.test(hira));
    details.push({ label: g.label, points: g.pts, achieved });
  }
  return makeDim(details, 15);
}

// ─── 音数正確性 (5pt) ────────────────────────────────────────────────────────

function scoreMora(phrases: Phrase[]): ScoreDimension {
  const details: SubDetail[] = phrases.map((p, i) => ({
    label: `第${i + 1}句「${p.text}」: ${p.mora}音（正: ${p.expectedMora}音）`,
    points: 1,
    achieved: p.isCorrect,
  }));

  if (phrases.length !== 5) {
    details.push({
      label: `句数が${phrases.length}句（正: 5句）`,
      points: 0,
      achieved: false,
    });
  }

  return makeDim(details, 5);
}

// ─── 構成・叙情性 (5pt) ──────────────────────────────────────────────────────

function scoreStructure(phrases: Phrase[]): ScoreDimension {
  const has5 = phrases.length === 5;
  const kamiOk =
    has5 && [5, 7, 5].every((m, i) => phrases[i]?.expectedMora === m && phrases[i]?.isCorrect);
  const shimoOk =
    has5 && [7, 7].every((m, i) => phrases[i + 3]?.expectedMora === m && phrases[i + 3]?.isCorrect);

  const details: SubDetail[] = [
    { label: "五句構成", points: 2, achieved: has5 },
    { label: "上の句（5-7-5）完成", points: 2, achieved: kamiOk },
    { label: "下の句（7-7）完成", points: 1, achieved: shimoOk },
  ];

  return makeDim(details, 5);
}

// ─── 成績評定 ──────────────────────────────────────────────────────────────

export function getGrade(total: number): string {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C+";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "E";
}

// ─── 景色の描写（パターンベース・決定論的） ──────────────────────────────

function detectSceneType(text: string): string {
  if (/山|峰|嶺|丘|岳/.test(text)) return "山岳";
  if (/川|海|波|水|湖|沢/.test(text)) return "水景";
  if (/天|空|雲|霞|霧/.test(text)) return "天空";
  if (/花|桜|梅|萩|草|木|葉|紅葉/.test(text)) return "草花";
  if (/月|夜|宵|星/.test(text)) return "夜景";
  return "一般";
}

function getSeasonKey(seasonWords: string[]): string {
  if (seasonWords.length === 0) return "なし";
  const raw = seasonWords[0].replace(/（.*）/, "");
  for (const s of ["春", "夏", "秋", "冬"]) {
    if (raw.includes(s)) return s;
  }
  // 代表語から季節推定
  if (/桜|梅|霞|鶯|藤|若菜/.test(raw)) return "春";
  if (/蛍|卯|衣ほす/.test(raw)) return "夏";
  if (/紅葉|もみぢ|萩|鹿|露|雁/.test(raw)) return "秋";
  if (/雪|霜|氷|千鳥/.test(raw)) return "冬";
  return "なし";
}

function generateLandscapeDescription(
  text: string,
  natureWords: string[],
  _colors: string[],
  seasonWords: string[],
  phrases: Phrase[],
  sceneryScore: number,
  devices: string[]
): string {
  const h = hashText(text);
  const seasonKey = getSeasonKey(seasonWords);
  const sceneKey = detectSceneType(text);
  const closingKey = sceneryScore >= 20 ? "high" : sceneryScore >= 10 ? "mid" : "low";

  const opening = pick(LANDSCAPE_OPENING[seasonKey] ?? LANDSCAPE_OPENING["なし"], h);
  const scene = pick(LANDSCAPE_SCENE[sceneKey] ?? LANDSCAPE_SCENE["一般"], h + 1);
  const closing = pick(LANDSCAPE_CLOSING[closingKey], h + 2);

  const parts = [opening, scene];
  if (devices.length > 0) parts.push(pick(LANDSCAPE_RHETORICAL, h + 3));
  if (phrases.length === 5 && phrases.every((p) => p.isCorrect)) {
    parts.push(pick(LANDSCAPE_MORA_PERFECT, h + 4));
  }
  parts.push(closing);

  return parts.join("");
}

// ─── 古典調の総評（パターンベース・決定論的） ────────────────────────────

function generateRuleReview(
  total: number,
  devices: string[],
  seasonWords: string[],
  phrases: Phrase[],
  text: string
): string {
  const h = hashText(text);
  const grade = getGrade(total);
  const openingKey = grade as keyof typeof REVIEW_OPENING;
  const seasonKey = getSeasonKey(seasonWords);

  const allCorrect = phrases.length === 5 && phrases.every((p) => p.isCorrect);

  const parts = [
    pick(REVIEW_OPENING[openingKey] ?? REVIEW_OPENING["C"], h),
    allCorrect ? pick(REVIEW_MORA_OK, h + 1) : pick(REVIEW_MORA_NG, h + 1),
    devices.length >= 2
      ? pick(REVIEW_RHETORICAL_MANY, h + 2)
      : devices.length === 1
      ? pick(REVIEW_RHETORICAL_ONE, h + 2)
      : pick(REVIEW_RHETORICAL_NONE, h + 2),
    pick(REVIEW_SEASON[seasonKey] ?? REVIEW_SEASON["なし"], h + 3),
    pick(REVIEW_CLOSING, h + 4),
  ];

  return parts.join("")
}

// ─── 改善ヒント ────────────────────────────────────────────────────────────

function generateImprovements(
  breakdown: WakaBreakdown,
  phrases: Phrase[],
  devices: string[],
  seasonWords: string[]
): string[] {
  const hints: string[] = [];

  // 音数
  if (breakdown.mora.score < 5) {
    const wrong = phrases.filter((p) => !p.isCorrect);
    for (const p of wrong) {
      hints.push(
        `「${p.text}」は${p.mora}音です（正しくは${p.expectedMora}音）。音数を調整してください。`
      );
    }
  }

  // 情景
  if (breakdown.scenery.score < 15) {
    hints.push("自然景物（山・月・花・川など）を増やすと情景スコアが上がります。");
  } else if (breakdown.scenery.score < 25) {
    hints.push(
      "色彩語（白・紅・青など）や動きの表現（散る・流れるなど）を加えると情景がより豊かになります。"
    );
  }

  // 季語
  if (seasonWords.length === 0) {
    hints.push("季語（春・桜・月・雪など）を詠み込むと季語点が加算されます。");
  }

  // 修辞
  if (devices.length === 0) {
    hints.push(
      "枕詞（白妙の・ちはやぶる・あしびきのなど）や掛詞を活用すると修辞点が大きく上がります。"
    );
  } else if (!devices.some((d) => d.includes("掛詞"))) {
    hints.push("掛詞（同音異義の言葉）を取り入れると修辞点がさらに加算されます。");
  } else if (!devices.some((d) => d.includes("縁語"))) {
    hints.push("関連する言葉を複数使う縁語の技法を意識してみてください。");
  }

  // 語法
  if (breakdown.vocabulary.score < 8) {
    hints.push(
      "「けり」「らし」「てふ」など古典的な動詞語尾や歴史的仮名遣いを使うと語法点が上がります。"
    );
  }

  if (hints.length === 0) {
    hints.push("素晴らしい歌です。次は独自の情景や感情表現でさらに磨きをかけてください。");
  }

  return hints;
}

// ─── メイン採点関数 ────────────────────────────────────────────────────────

export function scoreWaka(
  text: string,
  tempDict: Record<string, string> = {}
): WakaAnalysis {
  const phrases = splitPhrases(text, tempDict);
  // Scoring checks both raw text and hiragana conversion (e.g. 紅葉 → もみぢ)
  const hira = convertToHiragana(text, tempDict);

  const { dim: scenery, natureWords, colors } = scoreScenery(text, hira);
  const { dim: season, seasonWords } = scoreSeason(text, hira);
  const { dim: rhetorical, devices } = scoreRhetorical(text, hira);
  const vocabulary = scoreVocabulary(text, hira);
  const mora = scoreMora(phrases);
  const structure = scoreStructure(phrases);

  const total = cap(
    scenery.score + season.score + rhetorical.score + vocabulary.score + mora.score + structure.score,
    100
  );
  const grade = getGrade(total);

  const breakdown: WakaBreakdown = {
    scenery,
    season,
    rhetorical,
    vocabulary,
    mora,
    structure,
    total,
    grade,
  };

  const improvements = generateImprovements(breakdown, phrases, devices, seasonWords);
  const landscapeDescription = generateLandscapeDescription(
    text, natureWords, colors, seasonWords, phrases, scenery.score, devices
  );
  const ruleReview = generateRuleReview(total, devices, seasonWords, phrases, text);

  return {
    breakdown,
    phrases,
    rhetoricalDevices: devices,
    detectedSeasonWords: seasonWords,
    detectedNatureWords: [...new Set(natureWords)],
    detectedColors: [...new Set(colors)],
    improvements,
    landscapeDescription,
    ruleReview,
  };
}
