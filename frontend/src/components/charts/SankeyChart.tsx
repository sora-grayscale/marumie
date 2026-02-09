"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import { cn } from "@/lib/utils";

interface SankeyNode {
  id: string;
  label?: string;
  color?: string;
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

export default function SankeyChart({ data, className }: SankeyChartProps) {
  if (!data.nodes.length || !data.links.length) {
    return (
      <div className={cn("flex items-center justify-center h-[400px] text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  return (
    <div className={cn("h-[400px]", className)}>
      <ResponsiveSankey
        data={data}
        margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
        align="justify"
        colors={{ scheme: "category10" }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={18}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.5}
        linkHoverOthersOpacity={0.1}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{ from: "color", modifiers: [["brighter", 1]] }}
        theme={{
          text: { fill: "#e5e7eb" },
          tooltip: {
            container: {
              background: "#1f2937",
              color: "#f9fafb",
              fontSize: "12px",
            },
          },
        }}
      />
    </div>
  );
}
