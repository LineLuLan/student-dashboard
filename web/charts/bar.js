import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawTopBottom(data) {
    const container = d3.select("#bar");
    container.selectAll("*").remove();

    if (!data || data.length === 0) return;

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 40, right: 30, bottom: 40, left: 50 };

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
    
    // Tính % chênh lệch
    const diffPercent = bottomAvg === 0 ? 0 : ((topAvg - bottomAvg) / bottomAvg * 100);

    const summary = [
        { label: "Top 5 Avg", value: topAvg, color: "#27ae60" },
        { label: "Bottom 5 Avg", value: bottomAvg, color: "#c0392b" }
    ];

    // 2. Scales
    const x = d3.scaleBand()
        .domain(summary.map(d => d.label))
        .range([0, innerWidth])
        .padding(0.5); // Cột nhỏ lại cho thanh thoát

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
        .attr("y", d => y(d.value) - 10) // Đẩy lên trên cột 10px để không bị dính
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => d.value.toFixed(1)) // Chỉ lấy 1 số thập phân cho gọn
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

    // 6. INSIGHT TEXT (Đã sửa để hiện rõ ràng)
    // Vẽ trực tiếp lên SVG ở vị trí trên cùng
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10) 
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#555")
        .style("font-style", "italic")
        .text(`Gap: Top students score ${diffPercent.toFixed(1)}% higher than bottom students.`);
}