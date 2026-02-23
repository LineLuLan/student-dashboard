import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function linearRegression(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.hours_studied);
    const sumY = d3.sum(data, d => d.exam_score);
    const sumXY = d3.sum(data, d => d.hours_studied * d.exam_score);
    const sumX2 = d3.sum(data, d => d.hours_studied * d.hours_studied);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

function calculateR2(data, slope, intercept) {
    const meanY = d3.mean(data, d => d.exam_score);
    const ssTotal = d3.sum(data, d => Math.pow(d.exam_score - meanY, 2));
    const ssResidual = d3.sum(data, d => Math.pow(d.exam_score - (slope * d.hours_studied + intercept), 2));
    return 1 - (ssResidual / ssTotal);
}

export function drawScatter(data) {
    const container = d3.select("#scatter");
    const infoContainer = d3.select("#scatter-info"); 
    
    container.selectAll("*").remove();
    infoContainer.html(""); 

    if (!data || data.length === 0) return;

    // --- 1. TÍNH TOÁN VÀ ĐIỀN THÔNG TIN CỘT PHẢI ---
    const { slope, intercept } = linearRegression(data);
    const r2 = calculateR2(data, slope, intercept);

    infoContainer.html(`
        <div class="stat-box">
            <div class="stat-label">Correlation (R²)</div>
            <div class="stat-value" style="color: ${r2 > 0.5 ? '#27ae60' : '#e67e22'}">
                ${r2.toFixed(3)}
            </div>
            <div style="font-size:12px; margin-top:5px; color:#555">
                ${r2 > 0.1 ? "There is a trend." : "Weak correlation."}
            </div>
        </div>
        
        <div class="stat-box" style="margin-top: 20px;">
            <div class="stat-label">Legend</div>
            <div style="display:flex; align-items:center; margin-top:5px; font-size:13px;">
                <span style="width:12px; height:12px; background:#e74c3c; border-radius:50%; margin-right:8px;"></span> Low
            </div>
            <div style="display:flex; align-items:center; margin-top:5px; font-size:13px;">
                <span style="width:12px; height:12px; background:#f1c40f; border-radius:50%; margin-right:8px;"></span> Medium
            </div>
            <div style="display:flex; align-items:center; margin-top:5px; font-size:13px;">
                <span style="width:12px; height:12px; background:#2ecc71; border-radius:50%; margin-right:8px;"></span> High
            </div>
        </div>
    `);

    // --- 2. VẼ BIỂU ĐỒ BÊN TRÁI ---
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const margin = { top: 20, right: 20, bottom: 45, left: 50 };

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible"); 

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.hours_studied))
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.exam_score))
        .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(["low", "medium", "high"])
        .range(["#e74c3c", "#f1c40f", "#2ecc71"]); 

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Points
    const dotsGroup = g.append("g").attr("opacity", 0);
    
    const circles = dotsGroup.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.hours_studied))
        // Set toạ độ thật ngay từ đầu, KHÔNG để ở innerHeight nữa
        .attr("cy", d => y(d.exam_score)) 
        .attr("r", 4) // Giảm size xuống 1 xíu cho đỡ rối mắt khi data đông
        .attr("fill", d => color(d.motivation))
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5); // Giảm viền xuống để render nhẹ hơn

    // 2. Chạy đúng 1 Animation làm sáng nguyên cả cụm lên
    dotsGroup.transition().duration(800).attr("opacity", 1);

    // --- TOOLTIP EVENTS (Giữ nguyên) ---
    const tooltip = d3.select("#tooltip");
    
    circles
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(100) // Giảm thời gian hover cho nhạy
                .attr("r", 7)
                .attr("stroke", "#333")
                .attr("stroke-width", 1.5)
                .attr("opacity", 1); // Hover vào thì sáng bừng lên

            tooltip.style("opacity", 1)
                .html(`
                    <div style="font-family: sans-serif; line-height: 1.4;">
                        <strong>Score:</strong> ${d.exam_score}<br>
                        <strong>Hours:</strong> ${d.hours_studied}<br>
                        <strong>Motivation:</strong> 
                        <span style="color:${color(d.motivation)}; font-weight:bold; text-transform:capitalize;">
                            ${d.motivation}
                        </span><br>
                        <strong>Attendance:</strong> ${d.attendance}%
                    </div>
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.clientX + 15) + "px")
                .style("top", (event.clientY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(100)
                .attr("r", 4)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.7);
            
            tooltip.style("opacity", 0);
        });

    // Regression Line
    const [xMin, xMax] = x.domain();
    g.append("line")
        .attr("x1", x(xMin))
        .attr("y1", y(slope * xMin + intercept))
        .attr("x2", x(xMax))
        .attr("y2", y(slope * xMax + intercept))
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5"); 

    // Lables
    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 35) 
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Study Hours (per week)");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -35) 
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Exam Score");
}