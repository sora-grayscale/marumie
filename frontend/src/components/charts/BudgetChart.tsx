"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface BudgetData {
  category: string;
  budgeted: number;
  spent: number;
}

interface BudgetChartProps {
  data: BudgetData[];
  className?: string;
}

export default function BudgetChart({ data, className }: BudgetChartProps) {
  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center h-[300px] text-muted-foreground", className)}>
        予算データがありません
      </div>
    );
  }

  return (
    <div className={cn("h-[300px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} />
          <YAxis type="category" dataKey="category" tick={{ fill: "#9ca3af", fontSize: 12 }} width={70} />
          <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb" }} formatter={(value: number, name: string) => [formatCurrency(value), name === "budgeted" ? "予算" : "実績"]} />
          <Bar dataKey="budgeted" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
          <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={12}>
            {data.map((entry) => (<Cell key={entry.category} fill={entry.spent > entry.budgeted ? "#ef4444" : "#22c55e"} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
