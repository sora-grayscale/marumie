"use client";

import { useEffect, useState } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { cn, formatCurrency } from "@/lib/utils";

interface SankeyNode {
  id: string;
  label?: string;
  color?: string;
  nodeType?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyChartProps {
  data: SankeyData;
  className?: string;
}

// marumie準拠カラー
const NODE_COLORS: Record<string, string> = {
  income: "#2AA693",
  "income-sub": "#45bfa4",
  total: "#4F566B",
  expense: "#DC2626",
  "expense-sub": "#f87171",
};

function getNodeColor(node: SankeyNode): string {
  if (node.color) return node.color;
  if (node.id === "合計" || node.id === "total") return NODE_COLORS.total;
  if (node.id === "収支残高") return NODE_COLORS.total;
  if (node.nodeType && NODE_COLORS[node.nodeType]) return NODE_COLORS[node.nodeType];
  return "#6b7280";
}

// ノードツールチップ
function NodeTooltip({ node }: { node: { id: string; value: number; color: string } }) {
  return (
    <div className="bg-gray-900/95 text-white px-4 py-3 rounded-xl shadow-xl text-sm backdrop-blur-sm">
      <div className="font-bold mb-1 flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: node.color }} />
        {node.id}
      </div>
      <div className="text-lg font-bold">{formatCurrency(node.value)}</div>
    </div>
  );
}

// リンクツールチップ
function LinkTooltip({ link }: { link: { source: { id: string }; target: { id: string }; value: number; color: string } }) {
  return (
    <div className="bg-gray-900/95 text-white px-4 py-3 rounded-xl shadow-xl text-sm backdrop-blur-sm">
      <div className="font-bold mb-1">{link.source.id} → {link.target.id}</div>
      <div className="text-lg font-bold">{formatCurrency(link.value)}</div>
    </div>
  );
}

// カスタムラベルレイヤー（金額＋パーセンテージ表示）
function CustomLabels({ nodes }: { nodes: Array<{ id: string; x: number; y: number; width: number; height: number; value: number; color: string; label: string }> }) {
  const totalValue = nodes.reduce((sum, n) => {
    if (n.id === "合計" || n.id === "total") return n.value;
    return sum;
  }, 0) || nodes.reduce((max, n) => Math.max(max, n.value), 0);

  // 左右判定: 全ノードのx座標の中央値を基準にする
  const xValues = nodes.map(n => n.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const midX = (minX + maxX) / 2;

  return (
    <>
      {nodes.map((node) => {
        const isCenter = node.id === "合計" || node.id === "total";
        const isLeft = !isCenter && node.x < midX;
        const percent = totalValue > 0 ? (node.value / totalValue) * 100 : 0;
        const showPercent = percent >= 1 && !isCenter && node.id !== "収支残高";

        // 合計ノードはノード上に重ねて表示
        const labelX = isCenter
          ? node.x + node.width + 10
          : isLeft
            ? node.x - 8
            : node.x + node.width + 8;

        const textAnchor = isCenter ? "start" : isLeft ? "end" : "start";

        return (
          <g key={node.id}>
            <text
              x={labelX}
              y={node.y + node.height / 2 - (showPercent ? 6 : 0)}
              textAnchor={textAnchor}
              dominantBaseline="central"
              style={{
                fontSize: isCenter ? 14 : 12,
                fontWeight: 700,
                fill: isCenter ? "#374151" : node.color,
              }}
            >
              {node.id}
            </text>
            {isCenter && (
              <text
                x={labelX}
                y={node.y + node.height / 2 + 16}
                textAnchor={textAnchor}
                dominantBaseline="central"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: "#6b7280",
                }}
              >
                {formatCurrency(node.value)}
              </text>
            )}
            {showPercent && (
              <text
                x={labelX}
                y={node.y + node.height / 2 + 12}
                textAnchor={textAnchor}
                dominantBaseline="central"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  fill: "#9ca3af",
                }}
              >
                {formatCurrency(node.value)} ({percent.toFixed(0)}%)
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

export default function SankeyChart({ data, className }: SankeyChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 150);
    };
    window.addEventListener("resize", debounced);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", debounced);
    };
  }, []);

  if (!data.nodes.length || !data.links.length) {
    return (
      <div className={cn("flex items-center justify-center h-[400px] text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  // ノードにカラーを割り当て
  const coloredData = {
    ...data,
    nodes: data.nodes.map((node) => ({
      ...node,
      color: getNodeColor(node),
    })),
  };

  const margin = isMobile
    ? { top: 16, right: 100, bottom: 16, left: 100 }
    : { top: 24, right: 180, bottom: 24, left: 160 };

  return (
    <div className={cn("h-[400px] md:h-[650px]", className)}>
      <ResponsiveSankey
        data={coloredData}
        margin={margin}
        align="justify"
        colors={(d) => (d as unknown as { color?: string }).color || "#999"}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={12}
        nodeSpacing={20}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.3}
        linkHoverOpacity={0.6}
        linkHoverOthersOpacity={0.08}
        linkContract={2}
        enableLinkGradient={false}
        enableLabels={false}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        layers={["links", "nodes", CustomLabels as any]}
        nodeTooltip={NodeTooltip}
        linkTooltip={LinkTooltip}
        theme={{
          tooltip: {
            container: {
              background: "transparent",
              boxShadow: "none",
              padding: 0,
            },
          },
        }}
      />
    </div>
  );
}
