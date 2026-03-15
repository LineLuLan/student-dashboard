import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function linearRegression(data, xField) {
    const n = data.length;
    const sumX  = d3.sum(data, d => d[xField]);
    const sumY  = d3.sum(data, d => d.exam_score);
    const sumXY = d3.sum(data, d => d[xField] * d.exam_score);
    const sumX2 = d3.sum(data, d => d[xField] * d[xField]);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

function calculateR2(data, xField, slope, intercept) {
    const meanY   = d3.mean(data, d => d.exam_score);
    const ssTotal = d3.sum(data, d => Math.pow(d.exam_score - meanY, 2));
    const ssRes   = d3.sum(data, d => Math.pow(d.exam_score - (slope * d[xField] + intercept), 2));
    return 1 - ssRes / ssTotal;
}

function pearsonR(data, xField) {
    const meanX = d3.mean(data, d => d[xField]);
    const meanY = d3.mean(data, d => d.exam_score);
    let num = 0, denX = 0, denY = 0;
    data.forEach(d => {
        const dx = d[xField] - meanX, dy = d.exam_score - meanY;
        num += dx * dy; denX += dx * dx; denY += dy * dy;
    });
    return (denX && denY) ? num / Math.sqrt(denX * denY) : 0;
}

export function drawScatter(data, xField = "hours_studied", xLabel = "Study Hours") {
    const container = d3.select("#scatter");
    const infoPanel = d3.select("#scatter-info");
    // Cancel any pending transitions before removing to prevent
    // "negative width" errors from interrupted tweens
    container.selectAll("*").interrupt().remove();
    infoPanel.html("");

    if (!data || data.length === 0) {
        container.html(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.5">
            <div style="font-size:22px">⚙</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:0.05em">Select a motivation filter above</div>
        </div>`);
        return;
    }

    // Encode categorical fields to numeric for scatter
    let plotData = data;
    let plotField = xField;
    const sampleVal = data[0]?.[xField];
    if (typeof sampleVal === "string") {
        const order = { "low": 1, "medium": 2, "high": 3 };
        const unique = [...new Set(data.map(d => d[xField]))].filter(Boolean).sort();
        plotData = data.map(d => ({
            ...d,
            [xField + "_enc"]: order[d[xField]?.toLowerCase()] ?? (unique.indexOf(d[xField]) + 1)
        }));
        plotField = xField + "_enc";
    }
    // Use encoded data for all rendering
    data = plotData;
    xField = plotField;

    const _rect = container.node().getBoundingClientRect();
    const w = _rect.width  || container.node().offsetWidth  || container.node().parentNode?.clientWidth  || 300;
    const h = _rect.height || container.node().offsetHeight || container.node().parentNode?.clientHeight || 200;
    if (w < 10 || h < 10) return;

    const { slope, intercept } = linearRegression(plotData, plotField);
    const r2 = calculateR2(plotData, plotField, slope, intercept);
    const r  = pearsonR(plotData, plotField);

    const strengthLabel = Math.abs(r) > 0.5 ? "Strong" : Math.abs(r) > 0.3 ? "Moderate" : "Weak";
    const strengthColor = Math.abs(r) > 0.5 ? "var(--accent-green)" : Math.abs(r) > 0.3 ? "var(--accent-yellow)" : "var(--accent-red)";

    // Side panel rendered in HTML — no longer overlapping SVG
    // Plain language for non-technical stakeholders
    const rPct = (r2 * 100).toFixed(0);
    const linkStrength = Math.abs(r) > 0.5 ? "Strong link" : Math.abs(r) > 0.3 ? "Moderate link" : "Weak link";
    const direction = r >= 0 ? "More" : "Less";

    // Visual hierarchy: rPct% is the ONE hero number, everything else subdued
    infoPanel.html(`
        <div class="stat-block">
            <div class="stat-label">How Much It Matters</div>
            <div style="font-family:var(--font-mono);font-size:26px;font-weight:700;color:var(--text-primary);line-height:1">${rPct}%</div>
            <div style="font-size:10px;font-weight:400;color:var(--text-muted);margin-top:2px">of score differences<br>explained by ${xLabel}</div>
        </div>
        <div class="stat-divider"></div>
        <div style="font-size:10px;font-weight:400;color:var(--text-muted)">${direction} ${xLabel} →&nbsp;
            <span style="color:var(--text-secondary);font-weight:600">${linkStrength.toLowerCase()}</span>
        </div>
        <div class="stat-divider"></div>
        <div style="display:flex;flex-direction:column;gap:3px">
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.1em;font-family:var(--font-mono)">Motivation</div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:var(--low-color);display:inline-block;flex-shrink:0"></span>Low</div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:var(--med-color);display:inline-block;flex-shrink:0"></span>Medium</div>
            <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:var(--high-color);display:inline-block;flex-shrink:0"></span>High</div>
        </div>
    `);

    // Full width for chart — no internal side panel eating into SVG
    const m  = { top: 10, right: 12, bottom: 38, left: 40 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    if (iw <= 0 || ih <= 0) return;

    const svg = container.append("svg").attr("width",w).attr("height",h).style("overflow","visible");

    // No glow filters — they cause mouseout element reference issues

    const g = svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain(d3.extent(data, d => d[xField])).nice().range([0, iw]);
    const y = d3.scaleLinear().domain(d3.extent(data, d => d.exam_score)).nice().range([ih, 0]);

    const colorMap = { low:"var(--low-color)", medium:"var(--med-color)", high:"var(--high-color)" };

    // Gridlines — no transition to avoid negative width tween on interrupt
    const glLeft = g.append("g").attr("class","gl");
    glLeft.call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""));
    glLeft.selectAll("line").attr("stroke","var(--border)").attr("stroke-dasharray","3,3");
    glLeft.select(".domain").remove();

    const glBottom = g.append("g").attr("class","glx").attr("transform",`translate(0,${ih})`);
    glBottom.call(d3.axisBottom(x).ticks(6).tickSize(-ih).tickFormat(""));
    glBottom.selectAll("line").attr("stroke","var(--border)").attr("stroke-dasharray","3,3");
    glBottom.select(".domain").remove();

    // Axes
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(7));
    g.append("g").call(d3.axisLeft(y).ticks(5));

    // Axis labels
    g.append("text").attr("x",iw/2).attr("y",ih+32)
        .attr("text-anchor","middle").attr("fill","var(--text-secondary)")
        .attr("font-family","var(--font-mono)").attr("font-size",11).attr("font-weight","600")
        .text(xLabel.toUpperCase());
    g.append("text").attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-30)
        .attr("text-anchor","middle").attr("fill","var(--text-secondary)")
        .attr("font-family","var(--font-mono)").attr("font-size",11).attr("font-weight","600")
        .text("EXAM SCORE");

    // Density-aware dot sizing — fast grid O(n), not O(n²)
    const px_list = data.map(d => x(d[xField]));
    const py_list = data.map(d => y(d.exam_score));
    const CELL = Math.max(iw, ih) * 0.06;
    const gridMap = new Map();
    data.forEach((d, i) => {
        const gx = Math.floor(px_list[i] / CELL);
        const gy = Math.floor(py_list[i] / CELL);
        const key = `${gx},${gy}`;
        gridMap.set(key, (gridMap.get(key) || 0) + 1);
    });
    const density = data.map((d, i) => {
        const gx = Math.floor(px_list[i] / CELL);
        const gy = Math.floor(py_list[i] / CELL);
        let count = 0;
        for (let dx2 = -1; dx2 <= 1; dx2++)
            for (let dy2 = -1; dy2 <= 1; dy2++)
                count += gridMap.get(`${gx+dx2},${gy+dy2}`) || 0;
        return count;
    });
    const maxDensity = d3.max(density) || 1;
    const rScale = d3.scaleSqrt().domain([1, maxDensity]).range([3.8, 1.8]);
    const opScale = d3.scaleLinear().domain([1, maxDensity]).range([0.80, 0.40]);

    // Regression line
    const [xMin, xMax] = x.domain();
    g.append("line")
        .attr("x1",x(xMin)).attr("y1",y(slope*xMin+intercept))
        .attr("x2",x(xMax)).attr("y2",y(slope*xMax+intercept))
        .attr("stroke","var(--accent-blue)").attr("stroke-width",2)
        .attr("stroke-dasharray","7,4").attr("opacity",0.55);

    // Insight: written as subtitle under chart title (in HTML), not overlaid on chart
    const strengthTxt = Math.abs(r) > 0.5 ? "strong" : Math.abs(r) > 0.3 ? "moderate" : "weak";
    const subtitleEl = document.getElementById("scatter-subtitle");
    if (subtitleEl) {
        subtitleEl.textContent = `${r >= 0 ? "More" : "Less"} ${xLabel} = higher score (${strengthTxt} link) · explains ${(r2*100).toFixed(0)}% of score differences`;
    }

    // Detect if field is discrete (integer values) → add jitter
    const uniqueX = new Set(data.map(d => d[xField]));
    const isDiscrete = uniqueX.size < 60; // attendance 60-100 = discrete integers
    const jitterRange = isDiscrete ? (x(1) - x(0)) * 0.35 : 0;

    // Seed-consistent jitter per data point
    const jitter = data.map((d, i) => {
        // deterministic pseudo-random based on index
        const s = Math.sin(i * 9301 + 49297) * 233280;
        return (s - Math.floor(s) - 0.5) * 2 * jitterRange;
    });

    // Dots — dense first, sparse on top
    const indexed = data.map((d,i) => ({d,i})).sort((a,b) => density[b.i]-density[a.i]);
    const tooltip = d3.select("#tooltip");

    const circles = g.append("g").selectAll("circle")
        .data(indexed)
        .enter().append("circle")
        .attr("cx", ({d,i}) => x(d[xField]) + jitter[i])
        .attr("cy", ({d}) => y(d.exam_score))
        .attr("r",  ({i}) => rScale(density[i]))
        .attr("fill", ({d}) => colorMap[d.motivation] || colorMap.medium)
        .attr("opacity", 0)
        .attr("stroke","none");

    // Lower opacity for discrete/overplotted fields
    const baseOpacity = ({i}) => isDiscrete
        ? Math.min(0.55, opScale(density[i]))
        : opScale(density[i]);

    circles.transition().duration(500).delay((_,idx) => idx * 0.2)
        .attr("opacity", baseOpacity);

    circles
        .on("mouseover", function(event, {d, i}) {
            d3.select(this).interrupt()
                .attr("r", 6.5)
                .attr("opacity", 1)
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);
            tooltip.style("opacity",1).html(`
                <strong>Score</strong><span class="tt-val">${d.exam_score}</span>
                <strong>${xLabel}</strong><span class="tt-val">${d[xField]}</span>
                <strong>Motivation</strong><span class="tt-val" style="text-transform:capitalize;color:${d.motivation==="low"?"var(--low-color)":d.motivation==="high"?"var(--high-color)":"var(--med-color)"}">${d.motivation}</span>
                <strong>Attendance</strong><span class="tt-val">${d.attendance}%</span>
                <strong>Prev Score</strong><span class="tt-val">${d.previous_scores}</span>
            `);
        })
        .on("mousemove", e => {
                const ttW = 220, ttH = 130;
                const tx = e.clientX + 16 + ttW > window.innerWidth
                    ? e.clientX - ttW - 8
                    : e.clientX + 16;
                const ty = Math.min(e.clientY - 10, window.innerHeight - ttH);
                tooltip.style("left", tx+"px").style("top", ty+"px");
            })
        .on("mouseout", function(event, {i}) {
            d3.select(this).interrupt()
                .attr("r",            rScale(density[i]))
                .attr("opacity",      isDiscrete ? Math.min(0.55, opScale(density[i])) : opScale(density[i]))
                .attr("stroke",       "none")
                .attr("stroke-width", 0);
            tooltip.style("opacity",0);
        });
}