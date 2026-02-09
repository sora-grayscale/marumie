"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CsvUpload from "@/components/csv/CsvUpload";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[20px] sm:text-[27px] font-bold">CSVインポート</h1>

      <Card>
        <CardHeader>
          <CardTitle>ファイルアップロード</CardTitle>
          <CardDescription>
            銀行・クレジットカードのCSVファイルをアップロードして取引データを取り込みます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvUpload />
        </CardContent>
      </Card>
    </div>
  );
}
