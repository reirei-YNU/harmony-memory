import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ScoreResult } from "@/components/ScoreResult";
import { UnknownKanjiDialog } from "@/components/UnknownKanjiDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WakaAnalysis, AiReviewData, UnknownKanjiData } from "@shared/types.js";

const SAMPLE_WAKA = [
  {
    title: "持統天皇",
    text: "春すぎて\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山",
  },
  {
    title: "在原業平",
    text: "ちはやぶる\n神代も聞かず\n竜田川\nから紅に\n水くくるとは",
  },
  {
    title: "小野小町",
    text: "花の色は\nうつりにけりな\nいたづらに\nわが身世にふる\nながめせしまに",
  },
  {
    title: "柿本人麻呂",
    text: "あしびきの\n山鳥の尾の\nしだり尾の\nながながし夜を\nひとりかも寝む",
  },
];

export default function Home() {
  const [wakaText, setWakaText] = useState("");
  const [isScoring, setIsScoring] = useState(false);
  const [analysis, setAnalysis] = useState<WakaAnalysis | null>(null);
  const [aiReview, setAiReview] = useState<AiReviewData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [unknownKanji, setUnknownKanji] = useState<UnknownKanjiData | null>(null);
  const [tempDict, setTempDict] = useState<Record<string, string>>({});

  // ルールベース採点（AI 呼び出しなし）
  const { mutate: scoreWaka } = trpc.waka.score.useMutation({
    onSuccess: (data) => {
      setIsScoring(false);
      setAnalysis(data.analysis as WakaAnalysis);
      if (data.unknownKanji.length > 0) {
        setUnknownKanji(data.unknownKanji[0]);
      }
    },
    onError: () => {
      setIsScoring(false);
    },
  });

  // AI 評価（ユーザーが明示的にボタンを押したときのみ）
  const { mutate: fetchAiReview } = trpc.waka.aiReview.useMutation({
    onSuccess: (data) => {
      setAiReview(data as AiReviewData);
      setAiLoading(false);
    },
    onError: () => {
      setAiLoading(false);
    },
  });

  const handleScore = () => {
    if (!wakaText.trim()) return;
    setIsScoring(true);
    setAnalysis(null);
    setAiReview(null);
    scoreWaka({ text: wakaText, tempDict });
  };

  const handleKanjiConfirm = (reading: string) => {
    if (!unknownKanji) return;
    const newDict = { ...tempDict, [unknownKanji.kanji]: reading };
    setTempDict(newDict);
    setUnknownKanji(null);
    setIsScoring(true);
    scoreWaka({ text: wakaText, tempDict: newDict });
  };

  const handleReset = () => {
    setAnalysis(null);
    setAiReview(null);
    setWakaText("");
    setTempDict({});
    setUnknownKanji(null);
  };

  const handleRequestAiReview = () => {
    if (!analysis) return;
    setAiLoading(true);
    fetchAiReview({ text: wakaText, analysis });
  };

  const loadSample = (text: string) => {
    setWakaText(text);
    setAnalysis(null);
    setAiReview(null);
    setTempDict({});
  };

  if (analysis) {
    return (
      <main className="min-h-screen px-4 py-8">
        {unknownKanji && (
          <UnknownKanjiDialog
            kanji={unknownKanji.kanji}
            onConfirm={handleKanjiConfirm}
            onCancel={() => setUnknownKanji(null)}
          />
        )}
        <ScoreResult
          wakaText={wakaText}
          analysis={analysis}
          aiReview={aiReview}
          aiLoading={aiLoading}
          onReset={handleReset}
          onRequestAiReview={handleRequestAiReview}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {unknownKanji && (
        <UnknownKanjiDialog
          kanji={unknownKanji.kanji}
          onConfirm={handleKanjiConfirm}
          onCancel={() => setUnknownKanji(null)}
        />
      )}

      {/* Header */}
      <header className="text-center mb-10 waka-fade-in">
        <h1 className="text-3xl font-bold tracking-wider text-foreground mb-2">
          和歌採点
        </h1>
        <p className="text-muted-foreground text-sm tracking-widest">
          言葉の重さを、測る。
        </p>
      </header>

      {/* Form */}
      <div className="w-full max-w-xl space-y-4 waka-fade-in">
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <p className="text-xs text-muted-foreground tracking-wider">
            和歌を入力してください（句ごとに改行・5句）
          </p>
          <Textarea
            value={wakaText}
            onChange={(e) => setWakaText(e.target.value)}
            placeholder={"春すぎて\n夏来にけらし\n白妙の\n衣ほすてふ\n天の香具山"}
            rows={5}
            className="font-serif text-base leading-loose"
          />
          <Button
            onClick={handleScore}
            disabled={isScoring || !wakaText.trim()}
            size="lg"
            className="w-full tracking-wider"
          >
            {isScoring ? "採点中…" : "この歌を詠む"}
          </Button>
        </div>

        {/* Sample poems */}
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground tracking-wider mb-3">
            百人一首から選ぶ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_WAKA.map((s) => (
              <button
                key={s.title}
                onClick={() => loadSample(s.text)}
                className="text-left text-xs bg-muted hover:bg-muted/70 border border-border rounded px-3 py-2 transition-colors"
              >
                <span className="block text-muted-foreground mb-0.5">{s.title}</span>
                <span className="text-foreground leading-relaxed">
                  {s.text.split("\n").slice(0, 2).join(" ")}…
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
