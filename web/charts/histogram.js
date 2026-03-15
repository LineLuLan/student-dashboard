import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawHistogram(data) {
    const container = d3.select("#histogram");
    container.selectAll("*").interrupt().remove();

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

    const m = { top: 10, right: 14, bottom: 32, left: 38 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;

    const svg = container.append("svg").attr("width",w).attr("height",h).style("overflow","visible");
    const g   = svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    // Auto-trim: find p1 and p99 of data, add small padding
    const scores = data.map(d => d.exam_score).sort(d3.ascending);
    const p1  = Math.floor(d3.quantile(scores, 0.005) / 2) * 2;
    const p99 = Math.ceil(d3.quantile(scores, 0.995)  / 2) * 2;
    const domLo = Math.max(50, p1  - 2);
    const domHi = Math.min(102, p99 + 2); // auto-scale to actual data, never truncate
    const x = d3.scaleLinear().domain([domLo, domHi]).range([0, iw]);
    const nBins = Math.round((domHi - domLo) / 2.5);
    const bins = d3.bin().domain(x.domain()).thresholds(nBins)(data.map(d => d.exam_score));
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).nice().range([ih, 0]);

    // Single neutral color — avoid confusion with motivation colors (red/orange/green)
    const barColor = "var(--accent-blue)";

    // Gridlines
    const _gl = g.append("g").attr("class","gl");
    _gl.call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat(""));
    _gl.selectAll("line").attr("stroke","var(--border)").attr("stroke-dasharray","3,3");
    _gl.select(".domain").remove();

    const tooltip = d3.select("#tooltip");
    const mean    = d3.mean(data, d => d.exam_score);

    // Bars
    g.selectAll(".hbar")
        .data(bins)
        .enter().append("rect")
        .attr("class","hbar")
        .attr("x",      d => x(d.x0) + 1)
        .attr("width",  d => Math.max(0, x(d.x1) - x(d.x0) - 2))
        .attr("rx", 2)
        .attr("fill",   barColor)
        .attr("opacity", 0.78)
        .attr("y", d => y(d.length))
        .attr("height", d => Math.max(0, ih - y(d.length)))
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity",1);
            tooltip.style("opacity",1).html(`
                <strong>Score Range</strong><span class="tt-val">${d.x0}–${d.x1}</span>
                <strong>Count</strong><span class="tt-val">${d.length.toLocaleString()}</span>
                <strong>Share</strong><span class="tt-val">${(d.length/data.length*100).toFixed(1)}%</span>
            `);
        })
        .on("mousemove", e => {
            const tx = Math.min(e.clientX + 16, window.innerWidth - 230);
            const ty = Math.min(e.clientY - 10, window.innerHeight - 120);
            tooltip.style("left", tx+"px").style("top", ty+"px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity",0.78);
            tooltip.style("opacity",0);
        });

    // Mean line
    if (mean >= domLo && mean <= domHi) {
        g.append("line")
            .attr("x1", x(mean)).attr("x2", x(mean))
            .attr("y1", 0).attr("y2", ih)
            .attr("stroke","var(--accent-blue)").attr("stroke-width",2)
            .attr("stroke-dasharray","4,3");
        g.append("text")
            .attr("x", x(mean) + 4).attr("y", 12)
            .attr("font-family","var(--font-mono)").attr("font-size","9px").attr("font-weight","700")
            .attr("fill","var(--accent-blue)")
            .text(`μ=${mean.toFixed(1)}`);
    }

    // Axes
    g.append("g").attr("transform",`translate(0,${ih})`)
        .call(d3.axisBottom(x).ticks(7).tickFormat(d => d));
    g.append("g").call(d3.axisLeft(y).ticks(4));

    g.append("text").attr("x",iw/2).attr("y",ih+26)
        .attr("text-anchor","middle").attr("font-family","var(--font-mono)").attr("font-size",9.5)
        .attr("fill","var(--text-secondary)").text("EXAM SCORE");
}