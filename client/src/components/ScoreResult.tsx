import type { WakaAnalysis, AiReviewData } from "@shared/types.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScoreResultProps {
  wakaText: string;
  analysis: WakaAnalysis;
  aiReview: AiReviewData | null;
  aiLoading: boolean;
  onReset: () => void;
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StarRow({ value, max }: { value: number; max: number }) {
  const stars = Math.round((value / max) * 5);
  return (
    <span className="text-accent tracking-widest text-sm">
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const key = grade.startsWith("C") ? "C" : grade;
  return (
    <span className={cn("grade-badge", `grade-${key}`)}>
      {grade}
    </span>
  );
}

export function ScoreResult({
  wakaText,
  analysis,
  aiReview,
  aiLoading,
  onReset,
}: ScoreResultProps) {
  const { breakdown, phrases, rhetoricalDevices, detectedSeasonWords, improvements } = analysis;
  const displayScore = aiReview?.success ? aiReview.totalScore : breakdown.total;
  const displayGrade = aiReview?.success ? aiReview.grade : breakdown.grade;

  const scores = [
    { label: "情景表現力", value: aiReview?.success ? aiReview.sceneryScore : breakdown.sceneryScore, max: 40 },
    { label: "季語・季節感", value: aiReview?.success ? aiReview.seasonScore : breakdown.seasonScore, max: 25 },
    { label: "修辞技法", value: aiReview?.success ? aiReview.rhetoricalScore : breakdown.rhetoricalScore, max: 20 },
    { label: "古典語法", value: aiReview?.success ? aiReview.vocabularyScore : breakdown.vocabularyScore, max: 10 },
    { label: "音数正確性", value: breakdown.moraScore, max: 5 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 waka-fade-in">

      {/* 詠まれた歌 */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-3">
          詠まれた歌
        </h2>
        <div className="text-base leading-loose text-center space-y-0.5">
          {phrases.map((p, i) => (
            <p key={i} className={cn(!p.isCorrect && "text-destructive")}>
              {p.text}
              {!p.isCorrect && (
                <span className="ml-2 text-xs">（{p.mora}音・本来{p.expectedMora}音）</span>
              )}
            </p>
          ))}
        </div>
      </section>

      {/* 採点結果 */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-4">
          採点結果
        </h2>
        <div className="flex items-center gap-4 mb-5">
          <GradeBadge grade={displayGrade} />
          <div>
            <span className="text-3xl font-bold text-foreground">{displayScore}</span>
            <span className="text-muted-foreground ml-1 text-sm">/ 100点</span>
          </div>
        </div>
        <div className="space-y-3">
          {scores.map(({ label, value, max }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <StarRow value={value} max={max} />
                  <span className="text-xs text-foreground">{value}/{max}</span>
                </div>
              </div>
              <ScoreBar value={value} max={max} />
            </div>
          ))}
        </div>
      </section>

      {/* 修辞技法 */}
      {rhetoricalDevices.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
            検出された修辞技法
          </h2>
          <div className="flex flex-wrap gap-2">
            {rhetoricalDevices.map((d) => (
              <span
                key={d}
                className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full"
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 季語 */}
      {detectedSeasonWords.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
            検出された季語
          </h2>
          <div className="flex flex-wrap gap-2">
            {detectedSeasonWords.map((w) => (
              <span
                key={w}
                className="text-xs bg-green-50 text-green-800 border border-green-200 px-2.5 py-1 rounded-full"
              >
                {w}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 改善のヒント */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
          改善のヒント
        </h2>
        <ul className="space-y-1.5 text-sm list-none">
          {improvements.map((hint, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent shrink-0 mt-0.5">•</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 歌学者の評 */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-3">
          ✦ 歌学者の評（AI による古典的評価）
        </h2>

        {aiLoading && (
          <div className="space-y-3">
            <div className="waka-skeleton h-4 rounded w-full" />
            <div className="waka-skeleton h-4 rounded w-5/6" />
            <div className="waka-skeleton h-4 rounded w-4/5" />
            <div className="waka-skeleton h-4 rounded w-full mt-3" />
            <div className="waka-skeleton h-4 rounded w-3/4" />
            <p className="text-xs text-muted-foreground text-center mt-3">
              歌学者が評を認めております…
            </p>
          </div>
        )}

        {!aiLoading && aiReview && (
          <div className="space-y-4 text-sm">
            {aiReview.success ? (
              <>
                <div>
                  <h3 className="text-xs text-muted-foreground mb-1">【景色の描写】</h3>
                  <p className="leading-relaxed">{aiReview.sceneryDescription}</p>
                </div>
                <div>
                  <h3 className="text-xs text-muted-foreground mb-1">【総評】</h3>
                  <p className="leading-relaxed">{aiReview.review}</p>
                </div>
                <div>
                  <h3 className="text-xs text-muted-foreground mb-1">【改善の御指南】</h3>
                  <p className="leading-relaxed">{aiReview.advice}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                AI 評価の取得に失敗しました。
              </p>
            )}
          </div>
        )}

        {!aiLoading && !aiReview && (
          <p className="text-muted-foreground text-sm text-center py-4">
            AI 評価を読み込んでいます…
          </p>
        )}
      </section>

      {/* Actions */}
      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={onReset} size="lg">
          別の歌を詠む
        </Button>
      </div>
    </div>
  );
}
