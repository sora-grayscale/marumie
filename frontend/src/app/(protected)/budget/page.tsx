"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings2, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { decodeAmount } from "@/lib/crypto";

interface BudgetEntry {
  id: string;
  category: string;
  amount: string;
  year: number;
  month: number;
  created_at: string;
}

const CATEGORIES = [
  "食費",
  "住居費",
  "交通費",
  "光熱費",
  "通信費",
  "日用品",
  "医療費",
  "娯楽費",
  "教育費",
  "被服費",
  "その他",
];

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Edit state
  const [editingBudget, setEditingBudget] = useState<BudgetEntry | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Filter state
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const fetchBudgets = useCallback(async () => {
    try {
      const data = await api.get<BudgetEntry[]>("/api/budgets");
      setBudgets(data ?? []);
    } catch {
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    setIsSubmitting(true);
    try {
      await api.post("/api/budgets", {
        category,
        amount: String(amount),
        year,
        month,
      });
      setDialogOpen(false);
      resetForm();
      await fetchBudgets();
      toast.success("予算を追加しました");
    } catch {
      toast.error("予算の追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (budget: BudgetEntry) => {
    setEditingBudget(budget);
    setEditCategory(budget.category);
    setEditAmount(String(decodeAmount(budget.amount)));
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget || !editCategory || !editAmount) return;

    setIsSubmitting(true);
    try {
      await api.put(`/api/budgets/${editingBudget.id}`, {
        category: editCategory,
        amount: String(editAmount),
      });
      setEditDialogOpen(false);
      setEditingBudget(null);
      await fetchBudgets();
      toast.success("予算を更新しました");
    } catch {
      toast.error("予算の更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/budgets/${id}`);
      await fetchBudgets();
      toast.success("予算を削除しました");
    } catch {
      toast.error("予算の削除に失敗しました");
    }
  };

  // Filter budgets
  const filteredBudgets = budgets.filter((b) => {
    if (filterYear !== "all" && b.year !== Number(filterYear)) return false;
    if (filterMonth !== "all" && b.month !== Number(filterMonth)) return false;
    return true;
  });

  const totalBudget = filteredBudgets.reduce((sum, b) => sum + decodeAmount(b.amount), 0);

  // Get unique years from budgets for filter
  const availableYears = [...new Set(budgets.map((b) => b.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">予算設定</h1>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Settings2 size={16} className="mr-2" />
          予算を編集
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">読み込み中...</div>
        </div>
      ) : (
        <>
          {/* Filter controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">年</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">月</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">予算合計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">登録件数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredBudgets.length}件</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">カテゴリ数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(filteredBudgets.map((b) => b.category)).size}種類
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>予算一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredBudgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>予算データがありません</p>
                  <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    予算を追加
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>年月</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.category}</TableCell>
                        <TableCell>{budget.year}年{budget.month}月</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(decodeAmount(budget.amount))}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(budget)}
                            >
                              <Pencil size={14} className="text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(budget.id)}
                            >
                              <Trash2 size={14} className="text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>予算を追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                placeholder="例: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">年</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">月</Label>
                <Input
                  id="month"
                  type="number"
                  min="1"
                  max="12"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting || !category || !amount}>
                {isSubmitting ? "保存中..." : "追加"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>予算を編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">カテゴリ</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">金額</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                placeholder="例: 50000"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required
              />
            </div>
            {editingBudget && (
              <p className="text-sm text-muted-foreground">
                {editingBudget.year}年{editingBudget.month}月
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting || !editCategory || !editAmount}>
                {isSubmitting ? "保存中..." : "更新"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
