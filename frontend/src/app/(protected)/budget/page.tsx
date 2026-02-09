"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BudgetChart from "@/components/charts/BudgetChart";
import type { BudgetSummary } from "@/types/budget";
import { Settings2 } from "lucide-react";

export default function BudgetPage() {
  const [budgetData, setBudgetData] = useState<BudgetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const data = await api.get<BudgetSummary[]>("/api/budgets/summary");
        setBudgetData(data);
      } catch {
        // keep empty on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchBudget();
  }, []);

  const chartData = budgetData.map((b) => ({
    category: b.category,
    budgeted: b.budgeted,
    spent: b.spent,
  }));

  const totalBudget = budgetData.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">予算設定</h1>
        <Button variant="outline">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">支出合計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-expense">{formatCurrency(totalSpent)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">残り</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? "text-income" : "text-expense"}`}>
                  {formatCurrency(totalBudget - totalSpent)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別予算</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetChart data={chartData} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
