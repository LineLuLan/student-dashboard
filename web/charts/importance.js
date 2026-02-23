import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function getCorrelation(data, fieldX, fieldY) {
    const meanX = d3.mean(data, d => d[fieldX]);
    const meanY = d3.mean(data, d => d[fieldY]);
    
    let num = 0, denX = 0, denY = 0;
    
    data.forEach(d => {
        const dx = d[fieldX] - meanX;
        const dy = d[fieldY] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    });
    
    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
}

export function drawKeyFactors(data) {
    const container = d3.select("#importance");
    const infoContainer = d3.select("#importance-info");

    container.selectAll("*").remove();
    infoContainer.html("");

    if (!data || data.length === 0) return;

    // --- 1. DATA PROCESSING ---
    const numericFields = [
        "hours_studied", "attendance", "sleep_hours", 
        "previous_scores", "tutoring", "physical_activity"
    ];

    let correlations = numericFields.map(field => {
        const r = getCorrelation(data, field, "exam_score");
        return {
            field: field.replace("_", " ").toUpperCase(),
            r: r,
            importance: Math.abs(r)
        };
    });

    correlations.sort((a, b) => b.importance - a.importance);

    // --- 2. RIGHT COLUMN INSIGHT (Thiết kế lại gọn gàng hơn để không bị tràn) ---
    const topFactor = correlations[0];
    const top2Factor = correlations[1];

    // Bọc trong thẻ div margin: auto 0 để fix lỗi flexbox cắt mất chữ trên cùng
    infoContainer.html(`
        <div style="width: 100%; margin: auto 0;">
            <div style="margin-bottom: 15px;">
                <div style="font-size: 11px; font-weight: bold; color: #7f8c8d; text-transform: uppercase;">1st Key Factor</div>
                <div style="color: #4C6EF5; font-size: 18px; font-weight: bold; line-height: 1.2; margin-top: 2px;">
                    ${topFactor.field}
                </div>
                <div style="font-size: 12px; color: #333; margin-top: 2px;">
                    Correlation: <strong>${topFactor.r.toFixed(2)}</strong>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-size: 11px; font-weight: bold; color: #7f8c8d; text-transform: uppercase;">2nd Key Factor</div>
                <div style="color: #6c5ce7; font-size: 16px; font-weight: bold; line-height: 1.2; margin-top: 2px;">
                    ${top2Factor.field}
                </div>
                <div style="font-size: 12px; color: #333; margin-top: 2px;">
                    Correlation: <strong>${top2Factor.r.toFixed(2)}</strong>
                </div>
            </div>

            <div style="font-size: 11px; line-height: 1.3; font-style: italic; color: #888; border-top: 1px dashed #ccc; padding-top: 8px;">
                * Longer bars indicate a stronger relationship with Exam Score.
            </div>
        </div>
    `);

    // --- 3. DRAW CHART ---
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    
    // Nới rộng margin phải để lấy chỗ cho con số, thu gọn top/bottom
    const margin = { top: 15, right: 35, bottom: 20, left: 130 };

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scale X: Nhân max với 1.15 (thêm 15% khoảng trống) để số không bị đụng vách
    const maxImportance = d3.max(correlations, d => d.importance);
    const x = d3.scaleLinear()
        .domain([0, maxImportance * 1.15]) 
        .range([0, innerWidth]);

    const y = d3.scaleBand()
        .domain(correlations.map(d => d.field))
        .range([0, innerHeight])
        .padding(0.35); // Tăng padding để thanh bar mảnh hơn

    // Gridlines (Đường kẻ mờ phía sau)
    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x)
            .ticks(5)
            .tickSize(-innerHeight)
            .tickFormat("")
        )
        .selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "4,4");

    chart.select(".grid .domain").remove(); // Ẩn đường viền dưới của grid

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Bars
    chart.selectAll(".bar")
        .data(correlations)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.field))
        .attr("height", y.bandwidth())
        .attr("fill", (d, i) => i === 0 ? "#4C6EF5" : (i === 1 ? "#6c5ce7" : "#cbd5e1")) // Tô màu xám cho các yếu tố không quan trọng
        .attr("rx", 3) // Bo góc nhẹ
        .attr("width", 0) 
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.8);
            const trend = d.r > 0 ? "Positive" : "Negative";
            tooltip.style("opacity", 1)
                .html(`
                    <div style="font-family:sans-serif;">
                        <strong>${d.field}</strong><br>
                        Correlation: ${d.r.toFixed(3)}<br>
                        <em>(${trend} impact)</em>
                    </div>
                `);
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.clientX + 15) + "px")
                   .style("top", (event.clientY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        })
        .transition().duration(800)
        .attr("width", d => x(d.importance));

    // Value Labels (Các con số nằm ngay đuôi thanh bar)
    chart.selectAll(".val-label")
        .data(correlations)
        .enter()
        .append("text")
        .attr("class", "val-label")
        .attr("y", d => y(d.field) + y.bandwidth() / 2)
        .attr("x", d => x(d.importance) + 6) // Cách đuôi bar 6px
        .attr("alignment-baseline", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", (d, i) => i === 0 ? "#4C6EF5" : (i === 1 ? "#6c5ce7" : "#64748b"))
        .text(d => d.r.toFixed(2))
        .style("opacity", 0)
        .transition().delay(600).duration(400)
        .style("opacity", 1);

    // X Axis
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .style("font-size", "10px")
        .style("color", "#94a3b8")
        .select(".domain").remove();

    // Y Axis
    chart.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("color", "#475569")
        .selectAll(".domain, .tick line").remove(); // Cạo sạch các đường viền đen dư thừa
}