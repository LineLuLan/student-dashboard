import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawEnvironmentTrend(data, factor) {
    const container = d3.select("#environment");
    container.selectAll("*").remove(); // Xóa sạch cũ

    if (!data || data.length === 0) return;

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- 1. Scales ---
    // Lấy giá trị dynamic theo biến factor (vd: d["attendance"])
    const xValues = data.map(d => +d[factor]); 
    
    // SỬA LỖI: Đặt tên biến rõ ràng là xScale
    const xScale = d3.scaleLinear() 
        .domain(d3.extent(xValues))
        .nice()
        .range([0, innerWidth]);

    const bins = d3.bin()
        .domain(xScale.domain())
        .thresholds(15)(xValues);

    // --- 2. Tính toán Trend (Mean Score per Bin) ---
    const trendData = bins.map(bin => {
        const binData = data.filter(d => 
            +d[factor] >= bin.x0 && +d[factor] < bin.x1
        );
        return {
            x: (bin.x0 + bin.x1) / 2,
            meanScore: d3.mean(binData, d => d.exam_score),
            count: binData.length
        };
    }).filter(d => d.meanScore !== undefined); // Lọc bỏ bin rỗng

    const yScale = d3.scaleLinear()
        .domain([50, 100]) // Fix trục Y từ 50-100 để thấy rõ biến động
        .nice()
        .range([innerHeight, 0]);

    // --- 3. Vẽ Đường Line ---
    const line = d3.line()
        .x(d => xScale(d.x))        // SỬA LỖI: Dùng xScale thay vì x
        .y(d => yScale(d.meanScore)) // SỬA LỖI: Dùng yScale thay vì y
        .curve(d3.curveMonotoneX);

    chart.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "#4C6EF5")
        .attr("stroke-width", 3)
        .attr("d", line);

    // --- 4. Vẽ các điểm chốt (Trend points) ---
    const tooltip = d3.select("#tooltip");

    chart.selectAll(".trend-point")
        .data(trendData)
        .enter()
        .append("circle")
        .attr("class", "trend-point")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.meanScore))
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#4C6EF5")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 9).attr("fill", "#4C6EF5");
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${factor}:</strong> ${d.x.toFixed(1)}<br>
                    <strong>Avg Score:</strong> ${d.meanScore.toFixed(1)}<br>
                    <strong>Students:</strong> ${d.count}
                `);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.clientX + 10) + "px")
                .style("top", (event.clientY + 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6).attr("fill", "white");
            tooltip.style("opacity", 0);
        });

    // --- 5. Axes ---
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    chart.append("g")
        .call(d3.axisLeft(yScale));
        
    // Label trục X
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#666")
        .text(factor.replace("_", " ").toUpperCase());

    // --- 6. Insight Text ---
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    
    if (first && last) {
        const diff = last.meanScore - first.meanScore;
        const trendText = diff > 0 ? "increases" : "decreases";
        const color = diff > 0 ? "green" : "red";
        
        // Cập nhật text vào thẻ div có id environmentInsight trong HTML
        d3.select("#environmentInsight")
            .style("text-align", "left") // Căn trái cho hợp sidebar
            .html(`
                <div class="stat-box">
                    <div class="stat-label">Impact Analysis</div>
                    <div style="font-size:13px; margin-top:5px;">
                        As <b>${factor}</b> increases, scores tend to 
                        <b style="color:${color}">${trendText}</b> by 
                        <span style="font-size:18px; font-weight:bold; color:${color}">
                            ${Math.abs(diff).toFixed(1)}
                        </span> points.
                    </div>
                </div>
            `);
    }
    
    // QUAN TRỌNG: Đã xóa đoạn vẽ 3000 điểm .dot ở cuối hàm này để tránh lag và lỗi x is not defined
}