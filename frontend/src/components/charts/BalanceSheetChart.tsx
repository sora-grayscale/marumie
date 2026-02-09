"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface PortfolioItem {
  name: string;
  value: number;
  color: string;
}

interface BalanceSheetChartProps {
  assets: PortfolioItem[];
  liabilities: PortfolioItem[];
  className?: string;
}

export default function BalanceSheetChart({ assets, liabilities, className }: BalanceSheetChartProps) {
  const totalAssets = assets.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  if (!assets.length && !liabilities.length) {
    return (
      <div className={cn("flex items-center justify-center h-[300px] text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-muted-foreground">資産合計</div>
          <div className="text-lg font-bold text-green-400">{formatCurrency(totalAssets)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">負債合計</div>
          <div className="text-lg font-bold text-red-400">{formatCurrency(totalLiabilities)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">純資産</div>
          <div className={cn("text-lg font-bold", netWorth >= 0 ? "text-blue-400" : "text-red-400")}>{formatCurrency(netWorth)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-[250px]">
          <div className="text-center text-sm text-muted-foreground mb-2">資産</div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={assets} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name }) => name}>
                {assets.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb" }} formatter={(value: number) => [formatCurrency(value)]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {liabilities.length > 0 && (
          <div className="h-[250px]">
            <div className="text-center text-sm text-muted-foreground mb-2">負債</div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={liabilities} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {liabilities.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb" }} formatter={(value: number) => [formatCurrency(value)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
