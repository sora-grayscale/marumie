"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

const institutions = [
  { value: "mufg", label: "三菱UFJ銀行" },
  { value: "smbc", label: "三井住友銀行" },
  { value: "mizuho", label: "みずほ銀行" },
  { value: "rakuten", label: "楽天銀行" },
  { value: "sbi", label: "住信SBIネット銀行" },
  { value: "mfcloud", label: "マネーフォワード" },
  { value: "freee", label: "freee" },
  { value: "generic", label: "汎用CSV" },
];

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [institution, setInstitution] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setMessage("CSVファイルのみアップロードできます");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setMessage("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleUpload = async () => {
    if (!file || !institution) return;
    setStatus("uploading");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("institution", institution);
      await api.post("/api/import/csv", formData);
      setStatus("success");
      setMessage("CSVファイルを正常にインポートしました");
      setFile(null);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>金融機関</Label>
        <Select value={institution} onValueChange={setInstitution}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="金融機関を選択" />
          </SelectTrigger>
          <SelectContent>
            {institutions.map((inst) => (
              <SelectItem key={inst.value} value={inst.value}>
                {inst.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onClick={() => document.getElementById("csv-file-input")?.click()}
      >
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Upload className="mx-auto mb-4 text-muted-foreground" size={40} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={16} />
            <span>{file.name}</span>
            <span className="text-muted-foreground text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground">CSVファイルをドラッグ＆ドロップ</p>
            <p className="text-sm text-muted-foreground mt-1">またはクリックしてファイルを選択</p>
          </div>
        )}
      </div>

      {message && (
        <div className={cn(
          "flex items-center gap-2 rounded-md p-3 text-sm",
          status === "success" ? "bg-income/10 text-income" : "bg-destructive/10 text-destructive"
        )}>
          {status === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || !institution || status === "uploading"}
      >
        {status === "uploading" ? "アップロード中..." : "インポート実行"}
      </Button>
    </div>
  );
}
