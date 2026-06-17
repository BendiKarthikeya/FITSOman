import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface CESGaugeChartProps {
  score: number; // 0-100
}

export function CESGaugeChart({ score }: CESGaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Ensure score is a valid number between 0-100
    const validScore = Math.round(Math.min(100, Math.max(0, score || 0)));

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 280;
    const height = 200;
    const radius = Math.min(width, height / 1.5);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height - 30})`);

    // Background arc (full semicircle)
    const backgroundArc = d3
      .arc()
      .innerRadius(radius * 0.65)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    svg
      .append("path")
      .attr("d", backgroundArc as any)
      .attr("fill", "#E5E7EB");

    // Score arc (red portion)
    const scoreAngle = -Math.PI / 2 + (Math.PI * validScore) / 100;
    const scoreArc = d3
      .arc()
      .innerRadius(radius * 0.65)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(scoreAngle);

    svg
      .append("path")
      .attr("d", scoreArc as any)
      .attr("fill", "#FF6B6B");

    // Score text in center
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", -radius * 0.3)
      .attr("font-size", "48px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(`${validScore}%`);

    // Scale labels
    svg
      .append("text")
      .attr("text-anchor", "start")
      .attr("x", -radius)
      .attr("y", 10)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("-100");

    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", radius)
      .attr("y", 10)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("100");

  }, [score]);

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}
