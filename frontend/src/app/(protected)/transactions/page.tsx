"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { decodeBase64 } from "@/lib/crypto";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@/types/transaction";

import { Search, Plus, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface ApiTransactionResponse {
  id: string;
  account_id: string;
  date: string;
  transaction_type: string;
  amount: string;
  description: string;
  category: string;
  subcategory?: string;
  memo?: string;
  payment_method?: string;
  created_at: string;
}

interface AccountResponse {
  id: string;
  name: string;
  account_type: string;
  institution: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

function mapApiTransaction(raw: ApiTransactionResponse): Transaction {
  return {
    id: raw.id,
    user_id: "",
    account_id: raw.account_id,
    date: raw.date,
    type: raw.transaction_type as Transaction["type"],
    amount: parseFloat(decodeBase64(raw.amount)) || 0,
    description: decodeBase64(raw.description),
    category: raw.category ? decodeBase64(raw.category) : "",
    subcategory: raw.subcategory ? decodeBase64(raw.subcategory) : undefined,
    memo: raw.memo ? decodeBase64(raw.memo) : undefined,
    payment_method: raw.payment_method ? decodeBase64(raw.payment_method) : undefined,
    hash: "",
    created_at: raw.created_at,
    updated_at: raw.created_at,
  };
}

const EXPENSE_CATEGORIES = [
  "食費", "住居費", "交通費", "光熱費", "通信費",
  "日用品", "医療費", "娯楽費", "教育費", "被服費", "その他",
];

const INCOME_CATEGORIES = ["給与", "副収入", "投資収入", "その他"];

const PER_PAGE = 25;

type SortKey = "date" | "amount" | "category" | "description";
type SortDir = "asc" | "desc";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formDate, setFormDate] = useState(todayString());
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formMemo, setFormMemo] = useState("");

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ApiTransactionResponse[]>("/api/transactions?limit=5000");
      setTransactions(res.map(mapApiTransaction));
    } catch {
      // keep current data
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get<AccountResponse[]>("/api/accounts");
      setAccounts(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, [fetchTransactions, fetchAccounts]);

  // Unique categories for filter
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const tx of transactions) {
      if (tx.category) cats.add(tx.category);
    }
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter + search + sort
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.memo?.toLowerCase().includes(q) ?? false),
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter((tx) => tx.category === filterCategory);
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [transactions, search, filterCategory, filterType, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedTransactions.length / PER_PAGE));
  const pagedTransactions = processedTransactions.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterType, sortKey, sortDir]);

  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) map.set(acc.id, acc.name);
    return map;
  }, [accounts]);

  const categoryOptions = formType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const resetForm = () => {
    setFormDate(todayString());
    setFormType("expense");
    setFormAmount("");
    setFormDescription("");
    setFormCategory("");
    setFormAccountId("");
    setFormMemo("");
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formAmount || !formDescription || !formAccountId) return;
    setIsSubmitting(true);
    try {
      await api.post("/api/transactions", {
        account_id: formAccountId,
        date: formDate,
        transaction_type: formType,
        amount: formAmount,
        description: formDescription,
        category: formCategory || undefined,
        memo: formMemo || undefined,
      });
      setDialogOpen(false);
      resetForm();
      await fetchTransactions();
    } catch {
      // error handling could be added
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この取引を削除しますか？")) return;
    try {
      await api.delete(`/api/transactions/${id}`);
      await fetchTransactions();
    } catch {
      // ignore
    }
  };

  const SortButton = ({ field, label }: { field: SortKey; label: string }) => (
    <button
      type="button"
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors cursor-pointer"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown size={12} className={cn(sortKey === field ? "text-primary" : "text-muted-foreground/50")} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] sm:text-[27px] font-bold">取引一覧</h1>
        <Button onClick={handleOpenDialog}>
          <Plus size={16} className="mr-2" />
          取引を追加
        </Button>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>取引を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>日付</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>種別</Label>
              <Select
                value={formType}
                onValueChange={(v) => { setFormType(v as "income" | "expense"); setFormCategory(""); }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>金額 *</Label>
              <Input type="number" min="0" placeholder="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>摘要 *</Label>
              <Input placeholder="例: ランチ" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="w-full"><SelectValue placeholder="カテゴリを選択" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>口座 *</Label>
              <Select value={formAccountId} onValueChange={setFormAccountId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="口座を選択" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea placeholder="メモ（任意）" value={formMemo} onChange={(e) => setFormMemo(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
              <Button onClick={handleSubmit} disabled={!formAmount || !formDescription || !formAccountId || isSubmitting}>
                {isSubmitting ? "追加中..." : "追加"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="取引を検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="カテゴリ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全カテゴリ</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Summary */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span>{processedTransactions.length}件</span>
            {totalPages > 1 && <span>{currentPage} / {totalPages} ページ</span>}
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
                      <TableHead><SortButton field="date" label="日付" /></TableHead>
                      <TableHead><SortButton field="description" label="摘要" /></TableHead>
                      <TableHead><SortButton field="category" label="カテゴリ" /></TableHead>
                      <TableHead className="text-right"><SortButton field="amount" label="金額" /></TableHead>
                      <TableHead>口座</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          取引データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedTransactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell>
                            {tx.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {tx.category}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right whitespace-nowrap font-medium",
                            tx.type === "income" ? "text-green-600" : "text-red-500",
                          )}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {accountNameMap.get(tx.account_id) ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tx.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    前へ
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "ghost"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    次へ
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
