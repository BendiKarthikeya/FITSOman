import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface CSATDonutChartProps {
  forumPercent: number;
  incidentPercent: number;
}

export function CSATDonutChart({ forumPercent, incidentPercent }: CSATDonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.6;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const data = [
      { label: "Forum", value: forumPercent, color: "#FF6B6B" },
      { label: "Incident", value: incidentPercent, color: "#FFB84D" },
    ];

    const pie = d3
      .pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcs = svg
      .selectAll("arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw arcs
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Add labels
    arcs.each(function (d, i) {
      const [x, y] = arc.centroid(d);
      const angle = (d.startAngle + d.endAngle) / 2;
      const isLeft = angle > Math.PI;

      const group = d3.select(this);

      // Percentage text
      group
        .append("text")
        .attr("transform", `translate(${x}, ${y})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text(`${d.data.value.toFixed(2)}%`);

      // Label text outside
      const labelRadius = radius + 30;
      const labelX = Math.cos(angle - Math.PI / 2) * labelRadius;
      const labelY = Math.sin(angle - Math.PI / 2) * labelRadius;

      group
        .append("text")
        .attr("transform", `translate(${labelX}, ${labelY})`)
        .attr("text-anchor", isLeft ? "end" : "start")
        .attr("font-size", "14px")
        .attr("fill", "#666")
        .text(d.data.label);
    });

  }, [forumPercent, incidentPercent]);

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef}></svg>
    </div>
  );
}
