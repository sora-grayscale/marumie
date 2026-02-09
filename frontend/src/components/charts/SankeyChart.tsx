"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

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

// カスタムカラーパレット（marumie準拠: 収入=グリーン系、支出=レッド系）
const SANKEY_COLORS = [
  "#238778", "#2da88e", "#45bfa4", "#6dd5bb",
  "#DC2626", "#ef4444", "#f87171", "#fca5a5",
  "#3b82f6", "#60a5fa", "#f59e0b", "#8b5cf6",
];

function getNodeColor(node: SankeyNode, index: number): string {
  if (node.color) return node.color;
  if (node.id === "合計" || node.id === "total") return "#238778";
  if (node.nodeType === "income") return "#22c55e";
  if (node.nodeType === "expense") return "#ef4444";
  if (node.nodeType === "expense-sub") return "#f87171";
  return SANKEY_COLORS[index % SANKEY_COLORS.length];
}

// カスタムツールチップ
function CustomTooltip({ node }: { node: { id: string; value: number; color: string } }) {
  return (
    <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
      <div className="font-bold mb-1">{node.id}</div>
      <div>{formatCurrency(node.value)}</div>
    </div>
  );
}

function CustomLinkTooltip({ link }: { link: { source: { id: string }; target: { id: string }; value: number } }) {
  return (
    <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
      <div className="font-bold mb-1">{link.source.id} → {link.target.id}</div>
      <div>{formatCurrency(link.value)}</div>
    </div>
  );
}

export default function SankeyChart({ data, className }: SankeyChartProps) {
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
    nodes: data.nodes.map((node, i) => ({
      ...node,
      color: getNodeColor(node, i),
    })),
  };

  return (
    <div className={cn("h-[500px] md:h-[600px]", className)}>
      <ResponsiveSankey
        data={coloredData}
        margin={{ top: 20, right: 180, bottom: 20, left: 20 }}
        align="justify"
        colors={(d) => (d as unknown as { color?: string }).color || "#999"}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.25}
        nodeThickness={20}
        nodeSpacing={16}
        nodeBorderWidth={0}
        nodeBorderRadius={4}
        linkOpacity={0.4}
        linkHoverOpacity={0.7}
        linkHoverOthersOpacity={0.05}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={12}
        labelTextColor={{ from: "color", modifiers: [["brighter", 0.8]] }}
        nodeTooltip={CustomTooltip}
        linkTooltip={CustomLinkTooltip}
        theme={{
          text: {
            fontSize: 12,
            fontWeight: 600,
            fill: "#6b7280",
          },
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
