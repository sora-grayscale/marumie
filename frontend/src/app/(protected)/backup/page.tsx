"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Shield } from "lucide-react";

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    setStatus("");
    try {
      const blob = await api.get<Blob>("/api/backup/export", {
        headers: { Accept: "application/octet-stream" },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mirai-backup-${new Date().toISOString().split("T")[0]}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("バックアップをダウンロードしました");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("backup", file);
      await api.upload("/api/backup/import", formData);
      setStatus("バックアップを復元しました");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "インポートに失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] sm:text-[27px] font-bold">バックアップ</h1>

      {status && (
        <div className="rounded-md bg-muted p-3 text-sm">{status}</div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={20} />
              エクスポート
            </CardTitle>
            <CardDescription>暗号化されたバックアップファイルをダウンロードします</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "エクスポート中..." : "バックアップをダウンロード"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} />
              インポート
            </CardTitle>
            <CardDescription>バックアップファイルからデータを復元します</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="inline-flex cursor-pointer">
              <input type="file" accept=".enc" onChange={handleImport} className="hidden" />
              <Button variant="outline" asChild>
                <span>ファイルを選択</span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            暗号化について
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            バックアップデータはAES-256-GCMで暗号化されています。復元にはアカウントの認証が必要です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
