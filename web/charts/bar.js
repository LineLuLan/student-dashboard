import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawTopBottom(data) {
    const container = d3.select("#bar");
    const infoContainer = d3.select("#bar-info");

    container.selectAll("*").remove();
    infoContainer.html("");

    if (!data || data.length === 0) return;

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 20, right: 10, bottom: 30, left: 40 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Data Processing
    const sorted = [...data].sort((a, b) => b.exam_score - a.exam_score);
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5);

    const topAvg = d3.mean(top5, d => d.exam_score) || 0;
    const bottomAvg = d3.mean(bottom5, d => d.exam_score) || 0;
    
    // SỬA LỖI Ở ĐÂY: Tính diffPercent TRƯỚC khi in ra HTML
    const diffPercent = bottomAvg === 0 ? 0 : ((topAvg - bottomAvg) / bottomAvg * 100);

    // Điền text vào cột bên phải
    infoContainer.html(`
        <div class="stat-box">
            <div class="stat-label">Top 5 Avg</div>
            <div class="stat-value" style="color:#27ae60">${topAvg.toFixed(1)}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Bottom 5 Avg</div>
            <div class="stat-value" style="color:#c0392b">${bottomAvg.toFixed(1)}</div>
        </div>
        <hr style="border:0; border-top:1px solid #ddd; margin:10px 0;">
        <div style="font-size:13px; line-height:1.4;">
            Top students score 
            <strong style="color:#27ae60; font-size:16px">${diffPercent.toFixed(1)}%</strong> 
            higher than bottom students.
        </div>
    `);

    const summary = [
        { label: "Top 5 Avg", value: topAvg, color: "#27ae60" },
        { label: "Bottom 5 Avg", value: bottomAvg, color: "#c0392b" }
    ];

    // 2. Scales
    const x = d3.scaleBand()
        .domain(summary.map(d => d.label))
        .range([0, innerWidth])
        .padding(0.4); 

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);

    // 3. Draw Bars
    const tooltip = d3.select("#tooltip");

    chart.selectAll(".bar-rect")
        .data(summary)
        .enter()
        .append("rect")
        .attr("class", "bar-rect")
        .attr("x", d => x(d.label))
        .attr("y", innerHeight) // Bắt đầu từ dưới đáy
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", d => d.color)
        .attr("rx", 5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.8);
            tooltip.style("opacity", 1)
                .html(`<b>${d.label}</b>: ${d.value.toFixed(2)}`);
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.clientX + 15) + "px")
                   .style("top", (event.clientY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        })
        .transition().duration(1000)
        .attr("y", d => y(d.value))
        .attr("height", d => innerHeight - y(d.value));

    // 4. Draw Labels (SỐ TRÊN ĐẦU CỘT)
    chart.selectAll(".bar-label")
        .data(summary)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.label) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 10) 
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => d.value.toFixed(1)) 
        .style("opacity", 0)
        .transition().delay(800).duration(500)
        .style("opacity", 1);

    // 5. Axes
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .style("font-size", "13px");

    chart.append("g")
        .call(d3.axisLeft(y).ticks(5));
}