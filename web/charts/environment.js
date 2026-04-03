import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const FACTOR_LABELS = {
    attendance:        "Attendance (%)",
    sleep_hours:       "Sleep Hours",
    physical_activity: "Physical Activity (days/wk)",
    tutoring:          "Tutoring Sessions",
    previous_scores:   "Previous Scores"
};

function pearsonR(data, field) {
    const meanX = d3.mean(data, d => d[field]);
    const meanY = d3.mean(data, d => d.exam_score);
    let num=0, denX=0, denY=0;
    data.forEach(d => {
        const dx = d[field]-meanX, dy = d.exam_score-meanY;
        num+=dx*dy; denX+=dx*dx; denY+=dy*dy;
    });
    return (denX&&denY) ? num/Math.sqrt(denX*denY) : 0;
}

export function drawEnvironmentTrend(data, factor) {
    const container = d3.select("#environment");
    container.selectAll("*").interrupt().remove();
    d3.select("#environmentInsight").html(""); // clear stale values immediately

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

    // ── FIX: tighter margins, more room for chart ──
    const m = { top: 10, right: 12, bottom: 38, left: 38 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    if (iw <= 0 || ih <= 0) return;

    const svg = container.append("svg").attr("width",w).attr("height",h).style("overflow","visible");
    const g   = svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    const xVals   = data.map(d => +d[factor]);
    const xExtent = d3.extent(xVals);
    const xScale  = d3.scaleLinear().domain(xExtent).nice().range([0, iw]);

    const bins = d3.bin().domain(xScale.domain()).thresholds(14)(xVals);
    const trendData = bins.map(bin => {
        const binData = data.filter(d => +d[factor] >= bin.x0 && +d[factor] < bin.x1);
        const scores  = binData.map(d => d.exam_score).sort(d3.ascending);
        return {
            x:         (bin.x0 + bin.x1) / 2,
            meanScore: d3.mean(binData, d => d.exam_score),
            q1:        d3.quantile(scores, 0.25),
            q3:        d3.quantile(scores, 0.75),
            count:     binData.length
        };
    }).filter(d => d.meanScore !== undefined && d.count >= 2);

    if (trendData.length === 0) return;

    // ── FIX: Y domain based on trend means only (tighter range) ──
    const meanExtent = d3.extent(trendData, d => d.meanScore);
    const yPad = Math.max((meanExtent[1] - meanExtent[0]) * 0.15, 2);
    const yScale = d3.scaleLinear()
        .domain([meanExtent[0] - yPad, meanExtent[1] + yPad])
        .nice()
        .range([ih, 0]);

    // Gridlines
    const _gl = g.append("g").attr("class","gl");
    _gl.call(d3.axisLeft(yScale).ticks(5).tickSize(-iw).tickFormat(""));
    _gl.selectAll("line").attr("stroke","var(--border)").attr("stroke-opacity","0.4").attr("stroke-dasharray","4,4");
    _gl.select(".domain").remove();

    // IQR band
    const area = d3.area()
        .x(d => xScale(d.x))
        .y0(d => yScale(d.q1 || d.meanScore))
        .y1(d => yScale(d.q3 || d.meanScore))
        .curve(d3.curveMonotoneX);

    g.append("path").datum(trendData)
        .attr("fill","var(--accent-blue)").attr("opacity",0.08)
        .attr("d", area);

    // Mean trend line
    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.meanScore))
        .curve(d3.curveMonotoneX);

    const path = g.append("path").datum(trendData)
        .attr("fill","none")
        .attr("stroke","var(--accent-blue)")
        .attr("stroke-width",2.5)
        .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray",`${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition().duration(900).ease(d3.easeQuadOut)
        .attr("stroke-dashoffset",0);

    // Dots
    const tooltip = d3.select("#tooltip");
    g.selectAll(".tpoint").data(trendData).enter().append("circle")
        .attr("class","tpoint")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.meanScore))
        .attr("r", 4)
        .attr("fill","var(--surface)")
        .attr("stroke","var(--accent-blue)").attr("stroke-width",2)
        .on("mouseover", function(event,d) {
            d3.select(this).attr("r",6).attr("fill","var(--accent-blue)");
            tooltip.style("opacity",1).html(`
                <strong>${FACTOR_LABELS[factor]||factor}</strong><span class="tt-val">${d.x.toFixed(1)}</span>
                <strong>Avg Score</strong><span class="tt-val">${d.meanScore.toFixed(1)}</span>
                <strong>IQR</strong><span class="tt-val">${d.q1?.toFixed(1)} – ${d.q3?.toFixed(1)}</span>
                <strong>n</strong><span class="tt-val">${d.count} students</span>
            `);
        })
        .on("mousemove", e => {
                const tx = Math.min(e.clientX + 16, window.innerWidth  - 230);
                const ty = Math.min(e.clientY - 10, window.innerHeight - 140);
                tooltip.style("left", tx+"px").style("top", ty+"px");
            })
        .on("mouseout", function() {
            d3.select(this).attr("r",4).attr("fill","var(--surface)");
            tooltip.style("opacity",0);
        });

    // Axes
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
    g.append("g").call(d3.axisLeft(yScale).ticks(4));

    // Axis labels
    g.append("text").attr("x",iw/2).attr("y",ih+30)
        .attr("text-anchor","middle").attr("fill","var(--text-secondary)")
        .attr("font-family","var(--font-mono)").attr("font-size",10).attr("font-weight","600")
        .text((FACTOR_LABELS[factor]||factor).toUpperCase());

    g.append("text").attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-26)
        .attr("text-anchor","middle").attr("fill","var(--text-secondary)")
        .attr("font-family","var(--font-mono)").attr("font-size",10).attr("font-weight","600")
        .text("AVG EXAM SCORE");

    // Side panel
    const r        = pearsonR(data, factor);
    const first    = trendData[0];
    const last     = trendData[trendData.length-1];
    const diff     = last && first ? last.meanScore - first.meanScore : 0;
    const dir      = diff >= 0 ? "↑" : "↓";
    const dirColor = diff >= 0 ? "var(--accent-green)" : "var(--accent-red)";
    const rStrength = Math.abs(r) > 0.5 ? "Strong" : Math.abs(r) > 0.3 ? "Moderate" : "Weak";

    // Inline annotation on chart — top-left
    // Place annotation bottom-left — avoids right-side data clutter
    const annG = g.append("g").attr("transform",`translate(4, ${ih - 30})`);
    annG.append("rect").attr("rx",3).attr("width",Math.min(iw - 8, 190)).attr("height",24)
        .attr("fill","var(--surface)").attr("opacity",0.88)
        .attr("stroke","var(--border)").attr("stroke-width",0.8);
    annG.append("text").attr("x",6).attr("y",10)
        .attr("font-family","var(--font-mono)").attr("font-size","8.5px").attr("font-weight","600")
        .attr("fill","var(--text-secondary)")
        .text(`${rStrength} link: ${FACTOR_LABELS[factor]||factor} vs score`);
    annG.append("text").attr("x",6).attr("y",20)
        .attr("font-family","var(--font-mono)").attr("font-size","8px")
        .attr("fill",dirColor)
        .text(`Score ${dir}${Math.abs(diff).toFixed(1)} pts across full range`);

    d3.select("#environmentInsight").html(`
        <div class="stat-label">Corr. with Score</div>
        <div style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:${Math.abs(r)>0.3?'var(--accent-blue)':'var(--text-muted)'}">
            r = ${r.toFixed(3)}
        </div>
        <div class="stat-sub">${rStrength}</div>
        <div class="stat-divider"></div>
        <div class="insight-text">
            Score <strong style="color:${dirColor}">${dir}${Math.abs(diff).toFixed(1)} pts</strong> full range.
        </div>
        ${factor==='sleep_hours'?`<div class="stat-divider"></div><div class="insight-text" style="color:var(--text-muted);font-size:10px">⚠ Confounders may mask.</div>`:''}
    `);
}