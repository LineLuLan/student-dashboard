import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawTopBottom(data) {
    const container = d3.select("#bar");
    const infoPanel = d3.select("#bar-info");
    container.selectAll("*").interrupt().remove();
    infoPanel.html("");

    if (!data || data.length === 0) {
        container.html(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.5">
            <div style="font-size:22px">⚙</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:0.05em">Select a motivation filter above</div>
        </div>`);
        return;
    }

    const _rect = container.node().getBoundingClientRect();
    const w = _rect.width  || container.node().offsetWidth  || container.node().parentNode?.clientWidth  || 300;
    const h = _rect.height || container.node().offsetHeight || container.node().parentNode?.clientHeight || 200;
    if (w < 10 || h < 10) return;

    const sorted    = [...data].sort((a,b) => a.exam_score - b.exam_score);
    const n         = sorted.length;
    const bottom25  = sorted.slice(0, Math.floor(n * 0.25));
    const top25     = sorted.slice(Math.floor(n * 0.75));

    const topAvg    = d3.mean(top25,    d => d.exam_score) || 0;
    const bottomAvg = d3.mean(bottom25, d => d.exam_score) || 0;
    const absDiff   = topAvg - bottomAvg;
    const diffPct   = bottomAvg ? (absDiff / bottomAvg * 100) : 0;
    const topHours  = d3.mean(top25,    d => d.hours_studied) || 0;
    const botHours  = d3.mean(bottom25, d => d.hours_studied) || 0;
    const topAtt    = d3.mean(top25,    d => d.attendance) || 0;
    const botAtt    = d3.mean(bottom25, d => d.attendance) || 0;

    d3.select("#bar-sample-badge").text(`n = ${n.toLocaleString()}`);

    infoPanel.html(`
        <div class="stat-block">
            <div class="stat-label">Top 25% Avg</div>
            <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--accent-green);line-height:1">${topAvg.toFixed(1)}</div>
        </div>
        <div class="stat-block">
            <div class="stat-label">Bottom 25% Avg</div>
            <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--accent-red);line-height:1">${bottomAvg.toFixed(1)}</div>
        </div>
        <div class="stat-divider"></div>
        <div style="font-size:10px;font-weight:700;color:var(--accent-green)">Gap: +${absDiff.toFixed(1)} pts (+${diffPct.toFixed(0)}%)</div>
        <div class="stat-divider"></div>
        <div style="font-size:9px;color:var(--text-muted);line-height:1.7">
            <span style="color:var(--accent-green);font-weight:700">▲</span> ${topHours.toFixed(0)}h · ${topAtt.toFixed(0)}%<br>
            <span style="color:var(--accent-red);font-weight:700">▼</span> ${botHours.toFixed(0)}h · ${botAtt.toFixed(0)}%
        </div>
    `);

    const m  = { top: 10, right: 10, bottom: 26, left: 34 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    if (iw <= 0 || ih <= 0) return;

    const svg = container.append("svg").attr("width",w).attr("height",h).style("overflow","visible");
    const g   = svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    const groups = [
        { label:"Top 25%",    value: topAvg,    color:"var(--accent-green)", data: top25    },
        { label:"Bottom 25%", value: bottomAvg, color:"var(--accent-red)",   data: bottom25 }
    ];

    const x = d3.scaleBand().domain(groups.map(d=>d.label)).range([0,iw]).padding(0.35);

    // ── FIX: Y domain based on actual data range, not hardcoded [0,100] ──
    const allScores = data.map(d => d.exam_score);
    const yMin = Math.max(0,  d3.min(allScores) - 5);
    const yMax = Math.min(100, d3.max(allScores) + 5);
    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([ih, 0]);

    // Gridlines
    const _gl = g.append("g").attr("class","gl");
    _gl.call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""));
    _gl.selectAll("line").attr("stroke","var(--border)").attr("stroke-dasharray","3,3");
    _gl.select(".domain").remove();

    // Axes
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y).ticks(5));

    const tooltip = d3.select("#tooltip");

    groups.forEach(grp => {
        const scores    = grp.data.map(d => d.exam_score).sort(d3.ascending);
        const q1        = d3.quantile(scores, 0.25) ?? grp.value;
        const med       = d3.quantile(scores, 0.5)  ?? grp.value;
        const q3        = d3.quantile(scores, 0.75) ?? grp.value;
        const iqr       = q3 - q1;
        const whiskerLo = Math.max(d3.min(scores), q1 - 1.5 * iqr);
        const whiskerHi = Math.min(d3.max(scores), q3 + 1.5 * iqr);
        const bx        = x(grp.label);
        const bw        = x.bandwidth();
        const mid       = bx + bw / 2;

        // ── FIX: clamp all y values to scale domain before computing heights ──
        const yq1  = y(Math.min(Math.max(q1,  yMin), yMax));
        const yq3  = y(Math.min(Math.max(q3,  yMin), yMax));
        const ymed = y(Math.min(Math.max(med, yMin), yMax));
        const ywhi = y(Math.min(Math.max(whiskerHi, yMin), yMax));
        const ywlo = y(Math.min(Math.max(whiskerLo, yMin), yMax));
        const ymean= y(Math.min(Math.max(grp.value, yMin), yMax));

        // ── FIX: box height always non-negative ──
        const boxHeight = Math.max(0, yq1 - yq3);

        // Whisker lines
        g.append("line")
            .attr("x1",mid).attr("x2",mid)
            .attr("y1",ywhi).attr("y2",yq3)
            .attr("stroke",grp.color).attr("stroke-width",1.5).attr("opacity",0.5);
        g.append("line")
            .attr("x1",mid).attr("x2",mid)
            .attr("y1",yq1).attr("y2",ywlo)
            .attr("stroke",grp.color).attr("stroke-width",1.5).attr("opacity",0.5);

        // Whisker caps
        [ywhi, ywlo].forEach(wy => {
            g.append("line")
                .attr("x1", mid - bw*0.15).attr("x2", mid + bw*0.15)
                .attr("y1", wy).attr("y2", wy)
                .attr("stroke",grp.color).attr("stroke-width",1.5).attr("opacity",0.5);
        });

        // IQR box — height guaranteed non-negative
        g.append("rect")
            .attr("x", bx).attr("width", bw).attr("rx", 4)
            .attr("y", yq3)
            .attr("height", boxHeight)
            .attr("fill", grp.color).attr("opacity", 0.18)
            .attr("stroke", grp.color).attr("stroke-width", 1.5);

        // Median line
        g.append("line")
            .attr("x1", bx).attr("x2", bx + bw)
            .attr("y1", ymed).attr("y2", ymed)
            .attr("stroke", grp.color).attr("stroke-width", 2.5);

        // Mean dot
        g.append("circle")
            .attr("cx", mid).attr("cy", ymean).attr("r", 5)
            .attr("fill", grp.color)
            .attr("stroke","var(--surface)").attr("stroke-width",2);

        // Mean label — position above dot, flip if near top edge
        const labelY = ymean < 18 ? ymean + 16 : ymean - 10;
        g.append("text")
            .attr("x", mid).attr("y", labelY)
            .attr("text-anchor","middle")
            .attr("font-family","var(--font-mono)").attr("font-size","11px").attr("font-weight","700")
            .attr("fill", grp.color)
            .text(`avg ${grp.value.toFixed(1)}`);
    });

    // Hover overlay
    groups.forEach(grp => {
        g.append("rect")
            .attr("x", x(grp.label)).attr("width", x.bandwidth())
            .attr("y", 0).attr("height", ih)
            .attr("fill","transparent")
            .on("mouseover", function(event) {
                const sc = grp.data.map(d=>d.exam_score).sort(d3.ascending);
                tooltip.style("opacity",1).html(`
                    <strong>Group</strong><span class="tt-val">${grp.label}</span>
                    <strong>Mean</strong><span class="tt-val">${grp.value.toFixed(1)}</span>
                    <strong>Median</strong><span class="tt-val">${d3.quantile(sc,0.5).toFixed(1)}</span>
                    <strong>Q1–Q3</strong><span class="tt-val">${d3.quantile(sc,0.25).toFixed(1)}–${d3.quantile(sc,0.75).toFixed(1)}</span>
                    <strong>n</strong><span class="tt-val">${grp.data.length}</span>
                `);
            })
            .on("mousemove", e => tooltip.style("left",(e.clientX+15)+"px").style("top",(e.clientY-10)+"px"))
            .on("mouseout", () => tooltip.style("opacity",0));
    });
}