import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawTopBottom(data) {

    const container = d3.select("#bar");
    container.selectAll("*").remove();

    if (!data || data.length === 0) return;

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const margin = { top: 50, right: 20, bottom: 60, left: 60 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // =============================
    // 1️⃣ Sort + lấy Top & Bottom
    // =============================
    // const sorted = [...data].sort((a, b) => b.exam_score - a.exam_score);

    // const top5 = sorted.slice(0, 5);
    // const bottom5 = sorted.slice(-5).reverse();

    // const combined = [
    //     ...top5.map(d => ({ ...d, group: "Top" })),
    //     ...bottom5.map(d => ({ ...d, group: "Bottom" }))
    // ];
    const sorted = [...data].sort((a, b) => b.exam_score - a.exam_score);

    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5);

    const topAvg = d3.mean(top5, d => d.exam_score);
    const bottomAvg = d3.mean(bottom5, d => d.exam_score);
    const differencePercent = ((topAvg - bottomAvg) / bottomAvg) * 100;

    const summary = [
        { label: "Top 5 Avg", value: topAvg },
        { label: "Bottom 5 Avg", value: bottomAvg }
    ];


    // =============================
    // 2️⃣ Scale
    // =============================
    const x = d3.scaleBand()
        .domain(summary.map(d => d.label))
        .range([0, innerWidth])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);

    // =============================
    // 3️⃣ Tooltip
    // =============================
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "8px 12px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "6px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
        .style("font-size", "13px")
        .style("display", "none");

    // =============================
    // 4️⃣ Bars + Animation
    // =============================
    const bars = chart.selectAll("rect")
         .data(summary)
    .enter()
    .append("rect")
    .attr("x", d => x(d.label))
    .attr("width", x.bandwidth())
    .attr("y", innerHeight)
    .attr("height", 0)
    .attr("fill", (d,i) => i === 0 ? "#2E7D32" : "#C62828")
    .attr("rx", 8);

    bars
        .on("mouseover", function (event, d) {

            const insight =
                d.label === "Top 5 Avg"
                    ? "Top students perform exceptionally well."
                    : "Bottom students need significant improvement.";

            tooltip
                .style("display", "block")
                .html(`
                    <strong>${d.label}</strong><br>
                    Average Score: ${d.value ? d.value.toFixed(2) : 'N/A'}<br>
                    <em>${insight}</em><br>
                    <em style="color: #4caf50;">Top students score ${differencePercent ? differencePercent.toFixed(1) : 0}% higher</em>
                `);
                
            d3.select(this)
                .attr("opacity", 0.8)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);
        })

        .on("mousemove", function (event) {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })

        .on("mouseout", function () {
            tooltip.style("display", "none");

            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke", "none");
        });


    bars.transition()
        .duration(800)
        .attr("y", d => y(d.value))
        .attr("height", d => innerHeight - y(d.value));

    // =============================
    // 5️⃣ Hiển thị điểm trên cột
    // =============================
    chart.selectAll("text.score")
        .data(summary)
        .enter()
        .append("text")
        .attr("class", "score")
        .attr("x", d => x(d.label) + x.bandwidth() / 2)
        .attr("y", innerHeight)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", (d,i) => i === 0 ? "#2E7D32" : "#C62828")
        .text(d => d.value.toFixed(1))
        .transition()
        .duration(800)
        .attr("y", d => y(d.value) - 8);

    // =============================
    // 6️⃣ Axes
    // =============================
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    chart.append("g")
        .call(d3.axisLeft(y));

}
