"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyChart from "@/components/charts/MonthlyChart";
import BalanceSheetChart from "@/components/charts/BalanceSheetChart";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savings: number;
  monthlyData: { month: string; income: number; expense: number; balance: number }[];
  assets: { name: string; value: number; color: string }[];
  liabilities: { name: string; value: number; color: string }[];
}

const defaultSummary: DashboardSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  savings: 0,
  monthlyData: [],
  assets: [],
  liabilities: [],
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.get<DashboardSummary>("/api/dashboard/summary");
        setSummary(data);
      } catch {
        // Use default empty data on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  const summaryCards = [
    { title: "今月の収入", value: summary.totalIncome, icon: TrendingUp, color: "text-income" },
    { title: "今月の支出", value: summary.totalExpense, icon: TrendingDown, color: "text-expense" },
    { title: "収支バランス", value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? "text-income" : "text-expense" },
    { title: "貯蓄額", value: summary.savings, icon: PiggyBank, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={cn(card.color)} size={20} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>{formatCurrency(card.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>月次推移</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={summary.monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>資産・負債</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceSheetChart assets={summary.assets} liabilities={summary.liabilities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
