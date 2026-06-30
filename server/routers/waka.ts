import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { scoreWaka } from "../../shared/wakaScorer.js";
import { detectUnknownKanji } from "../../shared/moraCounter.js";
import { generateCompletion } from "../_core/llm.js";
import type { WakaAnalysis } from "../../shared/types.js";

function generateSceneryAnalysisPrompt(waka: string, analysis: WakaAnalysis): string {
  const { breakdown, rhetoricalDevices, detectedSeasonWords } = analysis;
  const devices = rhetoricalDevices.join("・") || "なし";
  const seasons = detectedSeasonWords.join("・") || "なし";

  return `あなたは平安時代の歌学者です。この和歌を古典的な視点から評価してください。

【和歌】
${waka}

【ルール採点の補足情報】
- 総合スコア: ${breakdown.total}点（${breakdown.grade}）
- 音数正確性: ${breakdown.mora.score}/5
- 検出された修辞技法: ${devices}
- 検出された季語: ${seasons}
- 情景スコア（ルール）: ${breakdown.scenery.score}/30
- 語法スコア（ルール）: ${breakdown.vocabulary.score}/15

【評価観点】
1. 【浮かぶ景色】この歌から浮かぶ景色を詳細に描写してください（2〜3文）。
2. 【情景表現力】景色の鮮烈さ・豊かさを 0〜40 の整数で評価してください。
3. 【季語・季節感】季語の適切性と季節感を 0〜25 の整数で評価してください。
4. 【修辞技法】修辞技法の使用を 0〜20 の整数で評価してください。
5. 【古典語法】古典表現の正確性を 0〜10 の整数で評価してください。
6. 【合計スコア】上記4項目の合計を totalScore に設定してください（0〜95）。
7. 【成績評定】S(90+)・A(80-89)・B(70-79)・C+(60-69)・C(50-59)・D(40-49)・E(0-39)
8. 【総評】古典的な文体で、この歌の美しさと価値について述べてください（3〜5文）。
9. 【改善の御指南】より一層の完成度を目指すための具体的なアドバイス（1〜2文）。
10. 【画像生成プロンプト】この歌の景色を AI 画像生成で表現するための英語プロンプト。

【出力形式】必ず以下の JSON のみを返してください:
{
  "sceneryDescription": "景色の描写",
  "sceneryScore": 38,
  "seasonScore": 24,
  "rhetoricalScore": 19,
  "vocabularyScore": 9,
  "totalScore": 90,
  "grade": "S",
  "review": "歌学者の総評",
  "advice": "改善アドバイス",
  "imagePrompt": "English prompt for image generation"
}`;
}

const reviewCache = new Map<string, Record<string, unknown>>();

export const wakaRouter = router({
  /** ルールベース採点（AI 不使用） */
  score: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(500),
        tempDict: z.record(z.string()).optional(),
      })
    )
    .mutation(({ input }) => {
      const { text, tempDict = {} } = input;
      const analysis = scoreWaka(text, tempDict);
      const unknownKanji = detectUnknownKanji(text, tempDict);
      return { success: true, analysis, unknownKanji };
    }),

  /** AI 歌学者の評（オプション・ユーザーが明示的に要求した場合のみ呼び出す） */
  aiReview: publicProcedure
    .input(
      z.object({
        text: z.string(),
        analysis: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const { text, analysis } = input as { text: string; analysis: WakaAnalysis };
      const cacheKey = text.trim();

      if (reviewCache.has(cacheKey)) {
        return { success: true, ...reviewCache.get(cacheKey) };
      }

      try {
        const prompt = generateSceneryAnalysisPrompt(text, analysis);
        const { content } = await generateCompletion(prompt);
        const cleaned = content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const result = JSON.parse(cleaned) as Record<string, unknown>;
        reviewCache.set(cacheKey, result);
        return { success: true, ...result };
      } catch (error) {
        console.error("[AI Review] Error:", error);
        return {
          success: false,
          sceneryDescription: "",
          sceneryScore: 0,
          seasonScore: 0,
          rhetoricalScore: 0,
          vocabularyScore: 0,
          totalScore: 0,
          grade: "E",
          review: "AI 評価の取得に失敗しました。",
          advice: "",
          imagePrompt: "",
        };
      }
    }),
});
