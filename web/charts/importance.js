import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function pearsonR(data, field) {
    const vals   = data.map(d => +d[field]).filter(v => !isNaN(v));
    const scores = data.filter(d => !isNaN(+d[field])).map(d => d.exam_score);
    if (!vals.length) return 0;
    const mx = d3.mean(vals), my = d3.mean(scores);
    let num=0,dx2=0,dy2=0;
    vals.forEach((x,i) => {
        const dx=x-mx, dy=scores[i]-my;
        num+=dx*dy; dx2+=dx*dx; dy2+=dy*dy;
    });
    return (dx2&&dy2) ? num/Math.sqrt(dx2*dy2) : 0;
}

function encodeAndCorrelate(data, field) {
    const unique = [...new Set(data.map(d => d[field]))].filter(Boolean).sort();
    const fake   = data.map(d => ({ [field]: unique.indexOf(d[field]), exam_score: d.exam_score }))
                       .filter(d => d[field] >= 0);
    if (!fake.length) return 0;
    return pearsonR(fake, field);
}

const FIELDS = [
    { key: "attendance",           label: "Attendance",       type: "numeric"     },
    { key: "hours_studied",        label: "Study Hours",      type: "numeric"     },
    { key: "previous_scores",      label: "Prev. Scores",     type: "numeric"     },
    { key: "tutoring",             label: "Tutoring",         type: "numeric"     },
    { key: "parental_involvement", label: "Parental Involv.", type: "categorical" },
    { key: "resources",            label: "Resources",        type: "categorical" },
    { key: "physical_activity",    label: "Physical Act.",    type: "numeric"     },
    { key: "sleep_hours",          label: "Sleep Hours",      type: "numeric"     },
];

export function drawKeyFactors(data, onBarClick) {
    const container = d3.select("#importance");
    const infoPanel = d3.select("#importance-info");
    container.selectAll("*").interrupt().remove();
    infoPanel.html("");

    if (!data || data.length === 0) {
        container.html(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.5"><div style="font-size:20px">⚙</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Select a motivation filter above</div></div>`);
        return;
    }

    const correlations = FIELDS.map(f => ({
        ...f,
        r:   f.type === "numeric" ? pearsonR(data, f.key) : encodeAndCorrelate(data, f.key),
        abs: 0
    }));
    correlations.forEach(d => d.abs = Math.abs(d.r));
    correlations.sort((a,b) => b.abs - a.abs);

    const top1 = correlations[0];
    const top2 = correlations[1];
    const last = correlations[correlations.length - 1];

    // No side panel — lollipop chart is self-explanatory
    infoPanel.html("");

    const _rect = container.node().getBoundingClientRect();
    const w = _rect.width  || container.node().offsetWidth  || container.node().parentNode?.clientWidth  || 300;
    const h = _rect.height || container.node().offsetHeight || container.node().parentNode?.clientHeight || 200;
    if (w < 10 || h < 10) return;

    // Lollipop: always use short labels to prevent truncation
    const SHORT_LABELS = {
        "Attendance":       "Attendance",
        "Study Hours":      "Study Hrs",
        "Prev. Scores":     "Prev. Score",
        "Tutoring":         "Tutoring",
        "Parental Involv.": "Parental",
        "Resources":        "Resources",
        "Physical Act.":    "Physical",
        "Sleep Hours":      "Sleep Hrs"
    };
    const useShort = true;  // always short — prevents truncation at any card width
    const leftMargin = Math.min(80, w * 0.36);
    const m = { top: 10, right: 44, bottom: 24, left: leftMargin };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    if (iw <= 4 || ih <= 4) return;

    const svg = container.append("svg")
        .attr("width", w).attr("height", h)
        .style("overflow","visible");
    const g = svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    const maxAbs = d3.max(correlations, d => d.abs) || 1;
    const x = d3.scaleLinear().domain([-maxAbs * 1.1, maxAbs * 1.1]).range([0, iw]);
    const y = d3.scaleBand().domain(correlations.map(d => d.label)).range([0, ih]).padding(0.38);

    const zero = x(0);

    // Zero line
    g.append("line")
        .attr("x1", zero).attr("x2", zero)
        .attr("y1", 0).attr("y2", ih)
        .attr("stroke","var(--border)").attr("stroke-width",1.5)
        .attr("stroke-dasharray","4,3");

    // Subtle x gridlines
    [-0.4,-0.2,0.2,0.4,0.6].forEach(v => {
        if (Math.abs(v) <= maxAbs) {
            g.append("line")
                .attr("x1",x(v)).attr("x2",x(v))
                .attr("y1",0).attr("y2",ih)
                .attr("stroke","var(--border)").attr("stroke-width",0.5)
                .attr("stroke-dasharray","2,4");
        }
    });

    // Semantic color: highlight #1 factor (Attendance) only, neutral for rest
    const dotColor = (d, i) => {
        if (d.key === "attendance") return "var(--accent-blue)";  // hero
        if (d.r < 0) return "var(--text-muted)";                  // negative = neutral gray
        return "var(--text-muted)";                                // positive but not hero = gray
    };

    const tooltip = d3.select("#tooltip");

    correlations.forEach((d, i) => {
        const cy = y(d.label) + y.bandwidth() / 2;
        const cx = x(d.r);
        const col = dotColor(d, i);
        const isClickable = d.type === "numeric" || d.clickable;

        // Stem line from zero to dot
        g.append("line")
            .attr("x1", zero).attr("y1", cy)
            .attr("x2", cx).attr("y2", cy)
            .attr("stroke", col)
            .attr("stroke-width", d.key === "attendance" ? 2.5 : 1.5)
            .attr("opacity", d.key === "attendance" ? 0.8 : 0.4);

        // Dot
        const dot = g.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", d.key === "attendance" ? 8 : 5)
            .attr("fill", col)
            .attr("opacity", d.key === "attendance" ? 1 : 0.55)
            .attr("stroke", "var(--surface)").attr("stroke-width", 1.5)
            .attr("cursor", isClickable ? "pointer" : "default");

        // r value label next to dot
        const labelX = d.r >= 0 ? cx + 10 : cx - 10;
        const anchor = d.r >= 0 ? "start" : "end";
        g.append("text")
            .attr("x", labelX).attr("y", cy + 1)
            .attr("dominant-baseline","middle")
            .attr("text-anchor", anchor)
            .attr("font-family","var(--font-mono)")
            .attr("font-size", d.key === "attendance" ? "10.5px" : "9px")
            .attr("font-weight", d.key === "attendance" ? "700" : "400")
            .attr("fill", d.key === "attendance" ? "var(--accent-blue)" : "var(--text-muted)")
            .text(d.r.toFixed(2));

        // Y axis labels (left side)
        g.append("text")
            .attr("x", -6).attr("y", cy)
            .attr("dominant-baseline","middle")
            .attr("text-anchor","end")
            .attr("font-family","system-ui, -apple-system, 'Segoe UI', sans-serif")
            .attr("font-size", i < 2 ? "11px" : "10.5px")
            .attr("font-weight", i < 2 ? "600" : "500")
            .attr("fill", i < 2 ? "var(--text-primary)" : "var(--text-secondary)")
            .text(useShort ? (SHORT_LABELS[d.label] || d.label) : d.label);

        // Interactions
        dot.on("mouseover", function(event) {
                d3.select(this).attr("r", i < 2 ? 9 : 7).attr("opacity", 1);
                const hint = isClickable ? `<br><em style="color:var(--accent-blue);font-size:10px">Click → explore in scatter</em>` : "";
                tooltip.style("opacity",1).html(`
                    <strong>${d.label}</strong>
                    <strong>Pearson r</strong><span class="tt-val">${d.r.toFixed(3)}</span>
                    <strong>Type</strong><span class="tt-val" style="text-transform:capitalize">${d.type}</span>${hint}
                `);
            })
            .on("mousemove", e => {
                const tx = e.clientX + 16;
                const ty = Math.min(e.clientY - 10, window.innerHeight - 120);
                tooltip.style("left", tx+"px").style("top", ty+"px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", i < 2 ? 7 : 5).attr("opacity", i < 2 ? 1 : 0.65);
                tooltip.style("opacity",0);
            })
            .on("click", function(event) {
                if ((!isClickable && !d.clickable) || !onBarClick) return;
                g.selectAll("circle").attr("stroke","var(--surface)").attr("stroke-width",1.5);
                d3.select(this).attr("stroke","var(--accent-blue)").attr("stroke-width",2.5);
                onBarClick(d.key, d.label);
            });
    });

    // X axis tick labels at bottom — sans-serif for readability
    [-0.2, 0, 0.2, 0.4, 0.6].forEach(v => {
        if (x(v) >= 0 && x(v) <= iw) {
            g.append("text")
                .attr("x", x(v)).attr("y", ih + 16)
                .attr("text-anchor","middle")
                .attr("font-family","system-ui, -apple-system, 'Segoe UI', sans-serif")
                .attr("font-size","9px")
                .attr("font-weight","400")
                .attr("fill","var(--text-muted)")
                .text(v.toFixed(1));
        }
    });
}
