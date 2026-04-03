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

export function drawScatter(data, xField = "hours_studied", xLabel = "Study Hours", colorMap, viewField = "motivation") {
    const container = d3.select("#scatter");
    const infoPanel = d3.select("#scatter-info");
    container.selectAll("*").interrupt().remove();
    infoPanel.html("");

    if (!data || data.length === 0) {
        container.html(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.5">
            <div style="font-size:22px">⚙</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Select a filter above</div>
        </div>`);
        return;
    }

    // Encode categorical x-field to numeric for regression/scatter
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
    data    = plotData;
    xField  = plotField;

    const _rect = container.node().getBoundingClientRect();
    const w = _rect.width  || container.node().offsetWidth  || 300;
    const h = _rect.height || container.node().offsetHeight || 200;
    if (w < 10 || h < 10) return;

    const { slope, intercept } = linearRegression(data, xField);
    const r2 = calculateR2(data, xField, slope, intercept);
    const r  = pearsonR(data, xField);

    // ── Side panel ───────────────────────────────────────────────
    colorMap = colorMap || { low: "var(--low-color)", medium: "var(--med-color)", high: "var(--high-color)" };
    const rPct        = (r2 * 100).toFixed(0);
    const linkStr     = Math.abs(r) > 0.5 ? "Strong link" : Math.abs(r) > 0.3 ? "Moderate link" : "Weak link";
    const direction   = r >= 0 ? "More" : "Less";
    const viewCfg     = window.__viewConfig__ || null;

    if (viewCfg && viewCfg.sidePanelStat) {
        // Non-main view: no legend — chips already show it
        infoPanel.html(`
            <div class="stat-block">
                <div class="stat-label">${viewCfg.sidePanelTitle}</div>
                <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent-green);line-height:1;margin:4px 0">${viewCfg.sidePanelStat}</div>
                <div style="font-size:10px;color:var(--text-muted);line-height:1.5">${viewCfg.sidePanelDesc}</div>
            </div>
            <div class="stat-divider"></div>
            <div style="font-size:10px;color:var(--text-muted);line-height:1.6">
                ⚠ Much smaller than<br>
                <span style="color:var(--accent-blue);font-weight:600">Attendance (↑7.8 pts)</span>
            </div>
        `);
    } else {
        // Main view: no legend (chips in header already show it) — full space for insight
        infoPanel.html(`
            <div class="stat-block">
                <div class="stat-label">How Much It Matters</div>
                <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--text-primary);line-height:1;margin:4px 0">${rPct}%</div>
                <div style="font-size:10px;color:var(--text-muted);line-height:1.5">of score differences<br>explained by ${xLabel}</div>
            </div>
            <div class="stat-divider"></div>
            <div style="font-size:10px;color:var(--text-muted);line-height:1.6">${direction} ${xLabel} →
                <span style="color:var(--text-secondary);font-weight:600">${linkStr.toLowerCase()}</span>
            </div>
            <div class="stat-divider"></div>
            <div style="font-size:10px;color:var(--text-muted);line-height:1.5">
                Dot size reflects<br>local data density
            </div>
        `);
    }

    // ── Subtitle update ──────────────────────────────────────────
    const strengthTxt = Math.abs(r) > 0.5 ? "strong" : Math.abs(r) > 0.3 ? "moderate" : "weak";
    const subtitleEl  = document.getElementById("scatter-subtitle");
    if (subtitleEl) {
        if (viewCfg && viewCfg.scatterSubtitle) {
            subtitleEl.textContent = viewCfg.scatterSubtitle;
        } else {
            subtitleEl.textContent = `${direction} ${xLabel} = higher score (${strengthTxt} link) · explains ${rPct}% of score differences`;
        }
    }

    // ── SVG setup ────────────────────────────────────────────────
    const m  = { top: 10, right: 12, bottom: 38, left: 40 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    if (iw <= 0 || ih <= 0) return;

    const svg = container.append("svg").attr("width", w).attr("height", h).style("overflow","visible");
    const g   = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear().domain(d3.extent(data, d => d[xField])).nice().range([0, iw]);
    const y = d3.scaleLinear().domain(d3.extent(data, d => d.exam_score)).nice().range([ih, 0]);

    // Gridlines
    const glLeft = g.append("g").attr("class","gl");
    glLeft.call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""));
    glLeft.selectAll("line").attr("stroke","var(--border)").attr("stroke-opacity","0.4").attr("stroke-dasharray","4,4");
    glLeft.select(".domain").remove();

    // No vertical gridlines — reduces visual noise in dense scatter

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

    // Density grid (O(n))
    const px_list = data.map(d => x(d[xField]));
    const py_list = data.map(d => y(d.exam_score));
    const CELL    = Math.max(iw, ih) * 0.06;
    const gridMap = new Map();
    data.forEach((d, i) => {
        const key = `${Math.floor(px_list[i]/CELL)},${Math.floor(py_list[i]/CELL)}`;
        gridMap.set(key, (gridMap.get(key) || 0) + 1);
    });
    const density = data.map((d, i) => {
        const gx = Math.floor(px_list[i]/CELL), gy = Math.floor(py_list[i]/CELL);
        let count = 0;
        for (let dx2=-1; dx2<=1; dx2++)
            for (let dy2=-1; dy2<=1; dy2++)
                count += gridMap.get(`${gx+dx2},${gy+dy2}`) || 0;
        return count;
    });
    const maxDensity = d3.max(density) || 1;
    const rScale  = d3.scaleSqrt().domain([1, maxDensity]).range([4.0, 2.0]);
    const opScale = d3.scaleLinear().domain([1, maxDensity]).range([0.55, 0.20]); // 20-55% opacity

    // Regression line
    const [xMin, xMax] = x.domain();
    g.append("line")
        .attr("x1",x(xMin)).attr("y1",y(slope*xMin+intercept))
        .attr("x2",x(xMax)).attr("y2",y(slope*xMax+intercept))
        .attr("stroke","var(--accent-blue)").attr("stroke-width",2)
        .attr("stroke-dasharray","7,4").attr("opacity",0.55);

    // Jitter for discrete x fields
    const uniqueX     = new Set(data.map(d => d[xField]));
    const isDiscrete  = uniqueX.size < 60;
    const jitterRange = isDiscrete ? (x(1) - x(0)) * 0.35 : 0;
    const jitter      = data.map((d, i) => {
        const s = Math.sin(i * 9301 + 49297) * 233280;
        return (s - Math.floor(s) - 0.5) * 2 * jitterRange;
    });

    // Dots
    const indexed = data.map((d,i) => ({d,i})).sort((a,b) => density[b.i]-density[a.i]);
    const tooltip = d3.select("#tooltip");

    const circles = g.append("g").selectAll("circle")
        .data(indexed)
        .enter().append("circle")
        .attr("cx", ({d,i}) => x(d[xField]) + jitter[i])
        .attr("cy", ({d})   => y(d.exam_score))
        .attr("r",  ({i})   => rScale(density[i]))
        .attr("fill", ({d}) => {
            const v = (d[viewField] || "").toString().trim().toLowerCase();
            return colorMap[v] || "var(--med-color)";
        })
        .attr("opacity", 0)
        .attr("stroke", "none");

    const baseOpacity = ({i}) => isDiscrete
        ? Math.min(0.40, opScale(density[i]))
        : opScale(density[i]);

    circles.transition().duration(500).delay((_,idx) => idx * 0.2)
        .attr("opacity", baseOpacity);

    circles
        .on("mouseover", function(event, {d, i}) {
            d3.select(this).interrupt()
                .attr("r", 6.5).attr("opacity", 1)
                .attr("stroke", "#fff").attr("stroke-width", 2);
            const vLabel = window.__viewLabel__ || "Motivation";
            const vVal   = (d[viewField] || "").replace(/_/g," ");
            const vColor = colorMap[(d[viewField]||"").toLowerCase()] || "var(--med-color)";
            tooltip.style("opacity",1).html(`
                <strong>Score</strong><span class="tt-val">${d.exam_score}</span>
                <strong>${xLabel}</strong><span class="tt-val">${d[xField]}</span>
                <strong>${vLabel}</strong><span class="tt-val" style="color:${vColor};text-transform:capitalize">${vVal}</span>
                <strong>Attendance</strong><span class="tt-val">${d.attendance}%</span>
                <strong>Prev Score</strong><span class="tt-val">${d.previous_scores}</span>
            `);
        })
        .on("mousemove", e => {
            const ttW = 220, ttH = 130;
            const tx  = e.clientX + 16 + ttW > window.innerWidth ? e.clientX - ttW - 8 : e.clientX + 16;
            const ty  = Math.min(e.clientY - 10, window.innerHeight - ttH);
            tooltip.style("left", tx+"px").style("top", ty+"px");
        })
        .on("mouseout", function(event, {i}) {
            d3.select(this).interrupt()
                .attr("r",       rScale(density[i]))
                .attr("opacity", isDiscrete ? Math.min(0.55, opScale(density[i])) : opScale(density[i]))
                .attr("stroke",  "none")
                .attr("stroke-width", 0);
            tooltip.style("opacity", 0);
        });
}