"use client";

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";

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

// カスタムツールチップ（marumie準拠デザイン）
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const nameMap: Record<string, string> = {
    income: "収入",
    expense: "支出",
    balance: "収支バランス",
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[160px]">
      <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {nameMap[entry.dataKey] || entry.dataKey}
          </span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// カスタム凡例
function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload) return null;
  const nameMap: Record<string, string> = {
    income: "収入",
    expense: "支出",
    balance: "収支バランス",
  };
  return (
    <div className="flex justify-center gap-6 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
          {nameMap[entry.value] || entry.value}
        </div>
      ))}
    </div>
  );
}

export default function MonthlyChart({ data, className }: MonthlyChartProps) {
  if (!data?.length) {
    return (
      <div className={cn("flex items-center justify-center h-[350px] text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  // 月表記を短縮（2024-01 → 1月）
  const chartData = data.map((d) => ({
    ...d,
    displayMonth: `${parseInt(d.month.split("-")[1], 10)}月`,
  }));

  return (
    <div className={cn("h-[350px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />
          <XAxis
            dataKey="displayMonth"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}万`;
              return value.toLocaleString();
            }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
          <Line
            type="monotone"
            dataKey="balance"
            name="balance"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2, fill: "#fff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
