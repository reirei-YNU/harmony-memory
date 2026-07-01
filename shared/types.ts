export interface Phrase {
  text: string;
  mora: number;
  isCorrect: boolean;
  expectedMora: number;
}

/** 採点1項目の詳細 */
export interface SubDetail {
  label: string;   // 表示名 e.g.「枕詞「白妙の」」
  points: number;  // 付与点数
  achieved: boolean;
}

/** 採点1次元（観点ごと） */
export interface ScoreDimension {
  score: number;
  maxScore: number;
  details: SubDetail[];
}

/** 採点結果の内訳 */
export interface WakaBreakdown {
  scenery: ScoreDimension;    // 情景表現力   30pt
  season: ScoreDimension;     // 季語・季節感  20pt
  rhetorical: ScoreDimension; // 修辞技法     25pt
  vocabulary: ScoreDimension; // 古典語法     15pt
  mora: ScoreDimension;       // 音数正確性    5pt
  structure: ScoreDimension;  // 構成・叙情性  5pt
  total: number;
  grade: string;
}

/** 和歌解析全体の結果 */
export interface WakaAnalysis {
  breakdown: WakaBreakdown;
  phrases: Phrase[];
  rhetoricalDevices: string[];
  detectedSeasonWords: string[];
  detectedNatureWords: string[];
  detectedColors: string[];
  improvements: string[];
  /** ルールベースで生成した景色の描写文 */
  landscapeDescription: string;
  /** ルールベースで生成した古典調の総評 */
  ruleReview: string;
}

export interface AiReviewData {
  success: boolean;
  sceneryDescription: string;
  sceneryScore: number;
  seasonScore: number;
  rhetoricalScore: number;
  vocabularyScore: number;
  totalScore: number;
  grade: string;
  review: string;
  advice: string;
  imagePrompt: string;
}

export interface UnknownKanjiData {
  kanji: string;
  position: number;
  suggested: string;
}
