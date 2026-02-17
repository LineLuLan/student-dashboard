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

    // d3.select("#scatter").selectAll("*").remove(); // VERY IMPORTANT

    // const width = 600;
    // const height = 300;
    // const margin = {top:40, right:40, bottom:60, left:60};

    
    // const svg = d3.select("#scatter")
    //     .append("svg")
    //     .attr("width", width)
    //     .attr("height", height);
    
    const container = d3.select("#scatter");
    container.selectAll("*").remove();
    
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    console.log("WIDTH:", width, "HEIGHT:", height);


    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    
    const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);
    
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // // X scale
    // const x = d3.scaleLinear()
    //     .domain(d3.extent(data, d => d.hours_studied))
    //     .range([0, innerWidth])
    //     .nice();

    // // Y scale
    // const y = d3.scaleLinear()
    //     .domain(d3.extent(data, d => d.exam_score))
    //     .range([innerHeight, 0])
    //     .nice();

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.hours_studied))
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.exam_score))
        .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(["low", "medium", "high"])
        .range(["#e74c3c", "#f1c40f", "#2ecc71"]);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        // .attr("transform", `translate(${innerWeight})`)
        .call(d3.axisLeft(y));

    const tooltip = d3.select("#tooltip");  
        
    const circles = g.selectAll("circle")
    // .data(data)
    // .enter()
    // .append("circle")
    // .attr("cx", d => x(d.hours_studied))
    // .attr("cy", d => y(d.exam_score))
    // .attr("r", 4)
    // .attr("fill", d => color(d.motivation))
    // .attr("opacity", 0.6)
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.hours_studied))
        .attr("cy", innerHeight)
        .attr("r", 4)
        .attr("fill", d => color(d.motivation))
        .attr("opacity", 0.6);

    circles
        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("r", 7)
                .attr("stroke", "black");

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Score:</strong> ${d.exam_score}<br>
                    <strong>Hours:</strong> ${d.hours_studied}<br>
                    <strong>Motivation:</strong> ${d.motivation}<br>
                    <strong>Attendance:</strong> ${d.attendance}%
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {

            d3.select(this)
                .attr("r", 4)
                .attr("stroke", "none");

            tooltip.style("opacity", 0);
        });

    circles
        .transition()
        .duration(800)
        .attr("cy", d => y(d.exam_score));

    // ===== REGRESSION =====
    const { slope, intercept } = linearRegression(data);

    // Lấy đúng domain hiện tại
    const [xMin, xMax] = x.domain();

    // Tính y tương ứng
    const yMin = slope * xMin + intercept;
    const yMax = slope * xMax + intercept;

    // Nếu regression vượt ngoài domain thì mở rộng domain
    const yDomain = y.domain();

    y.domain([
        Math.min(yDomain[0], yMin, yMax),
        Math.max(yDomain[1], yMin, yMax)
    ]);

    // Cập nhật lại axis Y
    g.selectAll(".y-axis").remove();

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Vẽ line
    // g.append("line")
    //     .attr("x1", x(xMin))
    //     .attr("y1", y(yMin))
    //     .attr("x2", x(xMax))
    //     .attr("y2", y(yMax))
    //     .attr("stroke", "red")
    //     .attr("stroke-width", 3.5);
    const line = g.append("line")
        .attr("x1", x(xMin))
        .attr("y1", y(slope * xMin + intercept))
        .attr("x2", x(xMin))
        .attr("y2", y(slope * xMin + intercept))
        .attr("stroke", "red")
        .attr("stroke-width", 3);

    line.transition()
        .duration(1200)
        .attr("x2", x(xMax))
        .attr("y2", y(slope * xMax + intercept));   


    console.log("Slope:", slope);
    console.log("Intercept:", intercept);

    // ===== R^2 =====
    const r2 = calculateR2(data, slope, intercept);
    g.append("text")
        .attr("x", innerWidth - 120)
        .attr("y", 20)
        .attr("font-size", 14)
        .attr("fill", "#444")
        .text(`R² = ${r2.toFixed(3)}`);

}


