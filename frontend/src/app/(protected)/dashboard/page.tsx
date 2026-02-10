"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { decodeBase64, decodeAmount } from "@/lib/crypto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyChart from "@/components/charts/MonthlyChart";
import BalanceSheetChart from "@/components/charts/BalanceSheetChart";
import SankeyChart from "@/components/charts/SankeyChart";
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";

interface AccountResponse {
  id: string;
  name: string;
  account_type: string;
  institution: string;
  currency: string;
  is_active: boolean;
  balance: number;
  created_at: string;
}

interface BudgetResponse {
  id: string;
  category: string;
  amount: string;
  year: number;
  month: number;
  created_at: string;
}

interface ApiTransaction {
  id: string;
  account_id: string;
  date: string;
  transaction_type: string;
  amount: string;
  description: string;
  category?: string;
  created_at: string;
}

interface DecodedTransaction {
  id: string;
  account_id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

interface SankeyData {
  nodes: { id: string; nodeType?: string }[];
  links: { source: string; target: string; value: number }[];
}

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthlyData: { month: string; income: number; expense: number; balance: number }[];
  assets: { name: string; value: number; color: string }[];
  liabilities: { name: string; value: number; color: string }[];
  recentTransactions: DecodedTransaction[];
  categoryBreakdown: { category: string; amount: number; color: string }[];
  budgetComparison: { category: string; budget: number; actual: number }[];
  sankeyData: SankeyData | null;
}

/** トランザクションからSankeyデータを構築（収入源 → 合計 → 支出カテゴリ） */
function buildSankeyData(transactions: DecodedTransaction[]): SankeyData | null {
  // 収入カテゴリ別集計
  const incomeByCategory = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();

  for (const t of transactions) {
    const cat = t.category || "その他";
    if (t.type === "income") {
      incomeByCategory.set(cat, (incomeByCategory.get(cat) ?? 0) + t.amount);
    } else {
      expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + t.amount);
    }
  }

  if (incomeByCategory.size === 0 && expenseByCategory.size === 0) return null;

  const nodes: { id: string; nodeType?: string }[] = [];
  const links: { source: string; target: string; value: number }[] = [];

  // 収入カテゴリノード
  for (const [cat] of incomeByCategory) {
    nodes.push({ id: cat, nodeType: "income" });
  }

  // 合計ノード
  nodes.push({ id: "合計" });

  // 支出カテゴリノード
  for (const [cat] of expenseByCategory) {
    // 収入と同名のカテゴリがある場合はサフィックス付与
    const nodeId = incomeByCategory.has(cat) ? `${cat}(支出)` : cat;
    nodes.push({ id: nodeId, nodeType: "expense" });
  }

  // 収入 → 合計 リンク
  for (const [cat, amount] of incomeByCategory) {
    if (amount > 0) {
      links.push({ source: cat, target: "合計", value: amount });
    }
  }

  // 合計 → 支出カテゴリ リンク
  for (const [cat, amount] of expenseByCategory) {
    if (amount > 0) {
      const nodeId = incomeByCategory.has(cat) ? `${cat}(支出)` : cat;
      links.push({ source: "合計", target: nodeId, value: amount });
    }
  }

  // 合計 → 収支（残高）
  const totalIncome = Array.from(incomeByCategory.values()).reduce((s, v) => s + v, 0);
  const totalExpense = Array.from(expenseByCategory.values()).reduce((s, v) => s + v, 0);
  const balance = totalIncome - totalExpense;
  if (balance > 0) {
    nodes.push({ id: "収支残高", nodeType: "expense" });
    links.push({ source: "合計", target: "収支残高", value: balance });
  }

  if (links.length === 0) return null;

  return { nodes, links };
}

function buildSummary(
  transactions: DecodedTransaction[],
  accounts: AccountResponse[],
  budgets: BudgetResponse[],
): DashboardSummary {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthTxns = transactions.filter((t) => t.date.startsWith(currentMonth));
  const totalIncome = currentMonthTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = currentMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Group by month for chart
  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = monthMap.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "income") {
      entry.income += t.amount;
    } else {
      entry.expense += t.amount;
    }
    monthMap.set(month, entry);
  }

  const monthlyData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 10);

  // Category breakdown (current month expenses)
  const categoryMap = new Map<string, number>();
  for (const t of currentMonthTxns.filter(t => t.type === "expense")) {
    const cat = t.category || "その他";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + t.amount);
  }
  const CATEGORY_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#64748b","#14b8a6","#f43f5e"];
  const categoryBreakdown = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], i) => ({
      category,
      amount,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  // Account balance computation
  const accountBalances = new Map<string, number>();
  for (const t of transactions) {
    const current = accountBalances.get(t.account_id) ?? 0;
    if (t.type === "income") {
      accountBalances.set(t.account_id, current + t.amount);
    } else {
      accountBalances.set(t.account_id, current - t.amount);
    }
  }

  const ASSET_COLORS = ["#22c55e", "#3b82f6", "#8b5cf6", "#06b6d4", "#14b8a6"];
  const LIABILITY_COLORS = ["#ef4444", "#f97316", "#eab308"];
  let assetIdx = 0;
  let liabilityIdx = 0;

  const assets: { name: string; value: number; color: string }[] = [];
  const liabilities: { name: string; value: number; color: string }[] = [];

  for (const acc of accounts) {
    const bal = accountBalances.get(acc.id) ?? 0;
    if (acc.account_type === "credit_card") {
      if (bal !== 0) {
        liabilities.push({ name: acc.name, value: Math.abs(bal), color: LIABILITY_COLORS[liabilityIdx++ % LIABILITY_COLORS.length] });
      }
    } else {
      if (bal !== 0) {
        assets.push({ name: acc.name, value: Math.abs(bal), color: ASSET_COLORS[assetIdx++ % ASSET_COLORS.length] });
      }
    }
  }

  // Budget vs actual comparison
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentBudgets = budgets.filter(b => b.year === currentYear && b.month === currentMonthNum);

  const budgetComparison = currentBudgets.map(b => {
    const budgetAmt = decodeAmount(b.amount);
    const actual = categoryMap.get(b.category) ?? 0;
    return { category: b.category, budget: budgetAmt, actual };
  });

  // Sankey data (current month)
  const sankeyData = buildSankeyData(currentMonthTxns);

  return {
    totalIncome,
    totalExpense,
    balance,
    monthlyData,
    assets,
    liabilities,
    recentTransactions,
    categoryBreakdown,
    budgetComparison,
    sankeyData,
  };
}

// FinancialSummaryCard（marumie準拠デザイン - 大きい数字・全額表示）
function FinancialSummaryCard({
  title,
  amount,
  titleColor,
  icon: Icon,
}: {
  title: string;
  amount: number;
  titleColor: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0 p-3 rounded-xl" style={{ backgroundColor: `${titleColor}12` }}>
            <Icon size={28} style={{ color: titleColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-wide" style={{ color: titleColor }}>{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight mt-1 whitespace-nowrap">
              {formatCurrency(amount)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [raw, accountsData, budgetsData] = await Promise.all([
          api.get<ApiTransaction[]>("/api/transactions?limit=5000"),
          api.get<AccountResponse[]>("/api/accounts"),
          api.get<BudgetResponse[]>("/api/budgets"),
        ]);
        const decoded: DecodedTransaction[] = (raw ?? []).map((t) => ({
          id: t.id,
          account_id: t.account_id,
          date: t.date,
          type: t.transaction_type,
          amount: parseFloat(decodeBase64(t.amount)) || 0,
          description: decodeBase64(t.description),
          category: t.category ? decodeBase64(t.category) : "",
          created_at: t.created_at,
        }));
        setSummary(buildSummary(decoded, accountsData ?? [], budgetsData ?? []));
      } catch {
        setSummary({
          totalIncome: 0, totalExpense: 0, balance: 0,
          monthlyData: [], assets: [], liabilities: [],
          recentTransactions: [], categoryBreakdown: [], budgetComparison: [],
          sankeyData: null,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] sm:text-[27px] font-bold">ダッシュボード</h1>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinancialSummaryCard
          title="今月の収入"
          amount={summary.totalIncome}
          titleColor="#238778"
          icon={TrendingUp}
        />
        <FinancialSummaryCard
          title="今月の支出"
          amount={summary.totalExpense}
          titleColor="#DC2626"
          icon={TrendingDown}
        />
        <FinancialSummaryCard
          title="収支バランス"
          amount={summary.balance}
          titleColor={summary.balance >= 0 ? "#238778" : "#DC2626"}
          icon={Wallet}
        />
      </div>

      {/* Sankey - 収支の流れ */}
      {summary.sankeyData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">今月の収支の流れ</CardTitle>
          </CardHeader>
          <CardContent>
            <SankeyChart data={summary.sankeyData} />
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">月次推移</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={summary.monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">資産・負債</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceSheetChart assets={summary.assets} liabilities={summary.liabilities} />
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown & Budget comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {summary.categoryBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">今月のカテゴリ別支出</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.categoryBreakdown.map((cat) => {
                  const percent = summary.totalExpense > 0 ? (cat.amount / summary.totalExpense * 100) : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.category}
                        </span>
                        <span className="font-medium">{formatCurrency(cat.amount)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        {summary.budgetComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">予算 vs 実績</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.budgetComparison.map((item) => {
                  const percent = item.budget > 0 ? (item.actual / item.budget * 100) : 0;
                  const isOver = item.actual > item.budget;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.category}</span>
                        <span className={cn("font-medium", isOver ? "text-red-500" : "text-green-600")}>
                          {formatCurrency(item.actual)} / {formatCurrency(item.budget)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", isOver ? "bg-red-500" : "bg-green-500")}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">最近の取引</CardTitle>
          <Link href="/transactions" className="flex items-center gap-1 text-sm text-primary hover:underline">
            すべて表示 <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent>
          {summary.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">取引データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">日付</th>
                    <th className="text-left py-2 pr-4 font-medium">摘要</th>
                    <th className="text-left py-2 pr-4 font-medium">カテゴリ</th>
                    <th className="text-right py-2 font-medium">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 pr-4 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-2.5 pr-4 max-w-[200px] truncate">{t.description}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{t.category || "—"}</td>
                      <td className={cn(
                        "py-2.5 text-right whitespace-nowrap font-medium",
                        t.type === "income" ? "text-green-600" : "text-red-500",
                      )}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
