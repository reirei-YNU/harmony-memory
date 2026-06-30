export interface Phrase {
  text: string;
  mora: number;
  isCorrect: boolean;
  expectedMora: number;
}

export interface WakaBreakdown {
  sceneryScore: number;
  seasonScore: number;
  rhetoricalScore: number;
  vocabularyScore: number;
  moraScore: number;
  total: number;
  grade: string;
}

export interface WakaAnalysis {
  breakdown: WakaBreakdown;
  phrases: Phrase[];
  rhetoricalDevices: string[];
  detectedSeasonWords: string[];
  improvements: string[];
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
}
