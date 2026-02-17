import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

console.log("SCATTER FILE LOADED");

function linearRegression(data) {
    const n = data.length;

    const sumX = d3.sum(data, d => d.hours_studied);
    const sumY = d3.sum(data, d => d.exam_score);
    const sumXY = d3.sum(data, d => d.hours_studied * d.exam_score);
    const sumX2 = d3.sum(data, d => d.hours_studied * d.hours_studied);

    const slope = (n * sumXY - sumX * sumY) /
                  (n * sumX2 - sumX * sumX);

    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

function calculateR2(data, slope, intercept) {
    const meanY = d3.mean(data, d => d.exam_score);

    const ssTotal = d3.sum(data, d => 
        Math.pow(d.exam_score - meanY, 2)
    );

    const ssResidual = d3.sum(data, d => 
        Math.pow(d.exam_score - (slope * d.hours_studied + intercept), 2)
    );

    return 1 - (ssResidual / ssTotal);
}


export function drawScatter(data) {
    console.log("drawScatter RUNNING", data.length);

    const container = d3.select("#scatter");
    container.selectAll("*").remove();

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    // 1. TĂNG MARGIN: Để đủ chỗ cho Label trục X và Y không bị cắt
    const margin = { top: 40, right: 120, bottom: 60, left: 70 }; 
    // right: 120 để dành chỗ cho Legend bên phải (nếu muốn đặt ngoài)
    // hoặc giữ right: 30 nếu đặt Legend bên trong. 
    // Ở đây mình đặt Legend bên trong cho gọn, nhưng tăng bottom/left để hiện Label.

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible"); // Quan trọng: Để text không bị cắt nếu lỡ chòi ra ngoài

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- SCALES ---
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.hours_studied))
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.exam_score))
        .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(["low", "medium", "high"])
        .range(["#e74c3c", "#f1c40f", "#2ecc71"]); // Đỏ, Vàng, Xanh

    // --- AXES ---
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "y-axis") // Đặt class để sau này update nếu cần
        .call(d3.axisLeft(y));

    // --- POINTS ---
    const tooltip = d3.select("#tooltip");
    
    const circles = g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.hours_studied))
        .attr("cy", innerHeight) // Hiệu ứng ban đầu nằm ở đáy
        .attr("r", 5)
        .attr("fill", d => color(d.motivation))
        .attr("opacity", 0.7)
        .attr("stroke", "#fff") // Viền trắng nhẹ cho từng điểm dễ nhìn hơn
        .attr("stroke-width", 1);

    // Animation xuất hiện
    circles.transition().duration(800).attr("cy", d => y(d.exam_score));

    // --- TOOLTIP EVENTS ---
    circles
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("r", 8)
                .attr("stroke", "#333");

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
            // Dùng clientX/Y để định vị fixed chính xác hơn
            tooltip
                .style("left", (event.clientX + 15) + "px")
                .style("top", (event.clientY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(200)
                .attr("r", 5)
                .attr("stroke", "#fff");
            tooltip.style("opacity", 0);
        });

    // --- REGRESSION LINE & R2 (Giữ nguyên logic của bạn) ---
    const { slope, intercept } = linearRegression(data);
    const [xMin, xMax] = x.domain();
    
    // Vẽ line
    g.append("line")
        .attr("x1", x(xMin))
        .attr("y1", y(slope * xMin + intercept))
        .attr("x2", x(xMax))
        .attr("y2", y(slope * xMax + intercept))
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5"); // Nét đứt nhìn cho "khoa học" hơn

    // R2 Text
    const r2 = calculateR2(data, slope, intercept);
    g.append("text")
        .attr("x", innerWidth - 10)
        .attr("y", innerHeight - 10) // Đưa xuống góc dưới phải cho đỡ vướng
        .attr("text-anchor", "end")
        .attr("font-size", 14)
        .attr("fill", "#555")
        .style("font-weight", "bold")
        .text(`R² = ${r2.toFixed(3)}`);


    // --- 2. THÊM LABEL TRỤC (AXIS LABELS) ---
    
    // Label trục X
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 45) // +45 là nằm gọn trong margin.bottom 60
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Study Hours (per week)");

    // Label trục Y
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50) // -50 nằm gọn trong margin.left 70
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("Exam Score");

    // --- 3. THÊM LEGEND (CHÚ THÍCH) ---
    
    const legendGroup = g.append("g")
        .attr("transform", `translate(20, 10)`); // Đặt ở góc trên trái

    const categories = ["low", "medium", "high"];
    
    categories.forEach((cat, i) => {
        const row = legendGroup.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        row.append("circle")
            .attr("r", 5)
            .attr("fill", color(cat));

        row.append("text")
            .attr("x", 15)
            .attr("y", 5)
            .text(cat.charAt(0).toUpperCase() + cat.slice(1)) // Viết hoa chữ cái đầu
            .style("font-size", "12px")
            .style("alignment-baseline", "middle");
    });
}


