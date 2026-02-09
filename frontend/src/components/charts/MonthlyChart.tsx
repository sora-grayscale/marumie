"use client";

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
  className?: string;
}

export default function MonthlyChart({ data, className }: MonthlyChartProps) {
  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center h-[350px] text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  return (
    <div className={cn("h-[350px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb" }}
            formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "収入" : name === "expense" ? "支出" : "収支"]}
          />
          <Legend formatter={(value) => (value === "income" ? "収入" : value === "expense" ? "支出" : "収支")} />
          <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
