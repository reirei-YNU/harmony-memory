import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UnknownKanjiDialogProps {
  kanji: string;
  onConfirm: (reading: string) => void;
  onCancel: () => void;
}

export function UnknownKanjiDialog({
  kanji,
  onConfirm,
  onCancel,
}: UnknownKanjiDialogProps) {
  const [reading, setReading] = useState("");

  const isValidReading = /^[ぁ-ん]+$/.test(reading);

  const handleConfirm = () => {
    if (isValidReading) {
      onConfirm(reading);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>未登録の文字が見つかりました</DialogTitle>
          <DialogDescription>
            辞書に登録されていない漢字の読みをひらがなで入力してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <span className="text-4xl font-bold text-amber-800">{kanji}</span>
            <p className="text-sm text-amber-700 mt-2">この文字の読みは？</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reading-input">読み（ひらがなのみ）</Label>
            <Input
              id="reading-input"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="例：しろ、たへ、やまと"
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              autoFocus
            />
            {reading && !isValidReading && (
              <p className="text-xs text-destructive">
                ひらがなのみ入力してください
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={!isValidReading}>
            確認して続ける
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
