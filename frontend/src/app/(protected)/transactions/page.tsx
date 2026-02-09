"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/types/transaction";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  perPage: number;
}

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionListResponse>({ transactions: [], total: 0, page: 1, perPage: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "50" });
      if (search) params.set("q", search);
      const res = await api.get<TransactionListResponse>(`/api/transactions?${params}`);
      setData(res);
    } catch {
      // keep current data on error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.ceil(data.total / data.perPage);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">取引一覧</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="取引を検索..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-muted-foreground">読み込み中...</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>口座</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          取引データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>{tx.category}</TableCell>
                          <TableCell className={`text-right whitespace-nowrap ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>{tx.account_id}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    全{data.total}件中 {(page - 1) * data.perPage + 1}-{Math.min(page * data.perPage, data.total)}件
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
