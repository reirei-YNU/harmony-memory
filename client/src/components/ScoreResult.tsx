import { useState } from "react";
import type { WakaAnalysis, AiReviewData, ScoreDimension } from "@shared/types.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ScoreResultProps {
  wakaText: string;
  analysis: WakaAnalysis;
  aiReview: AiReviewData | null;
  aiLoading: boolean;
  onReset: () => void;
  onRequestAiReview: () => void;
}

// ─── 小コンポーネント ───────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
  const key = grade.startsWith("C") ? "C" : grade;
  return <span className={cn("grade-badge", `grade-${key}`)}>{grade}</span>;
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${Math.round((value / max) * 100)}%` }} />
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

// 各観点の詳細アコーディオン
function DimensionCard({
  title,
  dim,
  accentColor = "text-primary",
}: {
  title: string;
  dim: ScoreDimension;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((dim.score / dim.maxScore) * 100);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* ヘッダー行 */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium tracking-wider">{title}</span>
            <div className="flex items-center gap-2">
              <StarRow value={dim.score} max={dim.maxScore} />
              <span className={cn("text-xs font-semibold", accentColor)}>
                {dim.score}
                <span className="text-muted-foreground font-normal">/{dim.maxScore}</span>
              </span>
            </div>
          </div>
          <ScoreBar value={dim.score} max={dim.maxScore} />
        </div>
        <span className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* 詳細リスト */}
      {open && (
        <ul className="divide-y divide-border bg-muted/20">
          {dim.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2.5 px-4 py-2 text-xs">
              <span
                className={cn(
                  "mt-0.5 shrink-0 font-bold",
                  d.achieved ? "text-secondary" : "text-muted-foreground"
                )}
              >
                {d.achieved ? "✓" : "△"}
              </span>
              <span className={cn("flex-1", !d.achieved && "text-muted-foreground")}>
                {d.label}
              </span>
              <span
                className={cn(
                  "shrink-0 font-semibold",
                  d.achieved ? accentColor : "text-muted-foreground"
                )}
              >
                {d.achieved ? `+${d.points}pt` : `(${d.points}pt)`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────────────────

export function ScoreResult({
  wakaText,
  analysis,
  aiReview,
  aiLoading,
  onReset,
  onRequestAiReview,
}: ScoreResultProps) {
  const { breakdown, phrases, improvements, landscapeDescription, ruleReview } = analysis;

  const dimensions: Array<{ title: string; dim: ScoreDimension; accent: string }> = [
    { title: "情景表現力（30点）",   dim: breakdown.scenery,    accent: "text-primary" },
    { title: "季語・季節感（20点）", dim: breakdown.season,     accent: "text-secondary" },
    { title: "修辞技法（25点）",     dim: breakdown.rhetorical, accent: "text-primary" },
    { title: "古典語法（15点）",     dim: breakdown.vocabulary, accent: "text-secondary" },
    { title: "音数正確性（5点）",    dim: breakdown.mora,       accent: "text-accent" },
    { title: "構成・叙情性（5点）",  dim: breakdown.structure,  accent: "text-accent" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 waka-fade-in">

      {/* ── 詠まれた歌 ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-3">
          詠まれた歌
        </h2>
        <div className="text-base leading-loose text-center space-y-0.5">
          {phrases.map((p, i) => (
            <p key={i} className={cn(!p.isCorrect && "text-destructive")}>
              {p.text}
              {!p.isCorrect && (
                <span className="ml-2 text-xs">
                  （{p.mora}音・正: {p.expectedMora}音）
                </span>
              )}
            </p>
          ))}
        </div>
      </section>

      {/* ── 総合スコア ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-4">
          採点結果
        </h2>
        <div className="flex items-center gap-4 mb-2">
          <GradeBadge grade={breakdown.grade} />
          <div>
            <span className="text-4xl font-bold text-foreground">{breakdown.total}</span>
            <span className="text-muted-foreground ml-1 text-sm">/ 100点</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          ▼ 各観点をクリックすると採点根拠の詳細を確認できます
        </p>
      </section>

      {/* ── 観点別詳細 ── */}
      <section className="space-y-2">
        {dimensions.map(({ title, dim, accent }) => (
          <DimensionCard key={title} title={title} dim={dim} accentColor={accent} />
        ))}
      </section>

      {/* ── 景色の描写（ルールベース） ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
          浮かぶ景色
        </h2>
        <p className="text-sm leading-relaxed">{landscapeDescription}</p>
      </section>

      {/* ── 歌学者の評（ルールベース） ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
          歌学者の評（ルールベース）
        </h2>
        <p className="text-sm leading-relaxed">{ruleReview}</p>
      </section>

      {/* ── 改善のヒント ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-2">
          改善のヒント
        </h2>
        <ul className="space-y-1.5 text-sm">
          {improvements.map((hint, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent shrink-0 mt-0.5">•</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── AI 歌学者の評（オプション） ── */}
      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground mb-3">
          ✦ AI 歌学者の評（オプション）
        </h2>

        {!aiReview && !aiLoading && (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-3">
              LLM による詳細な古典的評価を追加で取得できます。<br />
              <span className="text-xs opacity-70">（API クレジットを消費します）</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestAiReview}
              className="gap-2"
            >
              <Sparkles size={14} />
              AI 評価を取得
            </Button>
          </div>
        )}

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

        {aiReview && !aiLoading && (
          <div className="space-y-4 text-sm">
            {aiReview.success ? (
              <>
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <GradeBadge grade={aiReview.grade} />
                  <span className="text-2xl font-bold">{aiReview.totalScore}</span>
                  <span className="text-muted-foreground text-xs">/ 100点（AI採点）</span>
                </div>
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
      </section>

      {/* ── アクション ── */}
      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={onReset} size="lg">
          別の歌を詠む
        </Button>
      </div>
    </div>
  );
}
