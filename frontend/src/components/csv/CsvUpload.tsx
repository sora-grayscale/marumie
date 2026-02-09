"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface AccountResponse {
  id: string;
  name: string;
  account_type: string;
  institution: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface PreviewTransaction {
  date: string;
  description: string;
  amount: number;
  transaction_type: string;
  category?: string;
}

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

type UploadStatus = "idle" | "uploading" | "previewing" | "importing" | "success" | "error";

export default function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [institution, setInstitution] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<PreviewTransaction[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get<AccountResponse[]>("/api/accounts");
        setAccounts(res);
      } catch {
        // ignore
      }
    };
    fetchAccounts();
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setMessage("CSVファイルのみアップロードできます");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setMessage("");
    setPreview([]);
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

  const handlePreview = async () => {
    if (!file || !institution) return;
    setStatus("previewing");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("institution", institution);
      const res = await api.upload<PreviewTransaction[]>("/api/csv/preview", formData);
      setPreview(res);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "プレビューの取得に失敗しました");
    }
  };

  const handleUpload = async () => {
    if (!file || !institution || !accountId) return;
    setStatus("importing");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("institution", institution);
      formData.append("account_id", accountId);
      await api.upload("/api/csv/import", formData);
      setStatus("success");
      setMessage("CSVファイルを正常にインポートしました");
      setFile(null);
      setPreview([]);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "アップロードに失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>金融機関</Label>
          <Select value={institution} onValueChange={setInstitution}>
            <SelectTrigger className="w-full">
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

        <div className="space-y-2">
          <Label>インポート先口座</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="口座を選択" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">プレビュー（{preview.length}件）</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>カテゴリ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{tx.transaction_type === "income" ? "収入" : "支出"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {Number(tx.amount).toLocaleString("ja-JP")}円
                    </TableCell>
                    <TableCell>{tx.category ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {preview.length === 0 ? (
          <Button
            onClick={handlePreview}
            variant="outline"
            disabled={!file || !institution || status === "previewing"}
          >
            {status === "previewing" ? "プレビュー中..." : "プレビュー"}
          </Button>
        ) : null}
        <Button
          onClick={handleUpload}
          disabled={!file || !institution || !accountId || status === "importing"}
        >
          {status === "importing" ? "インポート中..." : "インポート実行"}
        </Button>
      </div>
    </div>
  );
}
