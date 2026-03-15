import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const AXES = [
    { key: "hours_studied",     label: "Study Hrs", max: 44  },
    { key: "attendance",        label: "Attend.",  max: 100 },
    { key: "sleep_hours",       label: "Sleep",       max: 10  },
    { key: "previous_scores",   label: "Prev Sc.",  max: 100 },
    { key: "tutoring",          label: "Tutoring",    max: 10  },
    { key: "physical_activity", label: "Physical",    max: 6   },
];

export function drawRadar(data) {
    const container = d3.select("#radar");
    const infoPanel = d3.select("#radar-info");
    container.selectAll("*").interrupt().remove();
    infoPanel.html("");

    if (!data || data.length === 0) {
        container.html(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;opacity:0.5"><div style="font-size:20px">⚙</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Select a motivation filter above</div></div>`);
        return;
    }

    const _rect = container.node().getBoundingClientRect();
    const w = _rect.width  || container.node().offsetWidth  || container.node().parentNode?.clientWidth  || 300;
    const h = _rect.height || container.node().offsetHeight || container.node().parentNode?.clientHeight || 200;
    if (w < 10 || h < 10) return;

    const sorted     = [...data].sort((a,b) => a.exam_score - b.exam_score);
    const n          = sorted.length;
    const bottom25   = sorted.slice(0, Math.floor(n * 0.25));
    const top25      = sorted.slice(Math.floor(n * 0.75));

    function meanProfile(group) {
        return AXES.map(a => ({ axis: a.label, value: d3.mean(group, d => d[a.key]) / a.max }));
    }
    const topProfile    = meanProfile(top25);
    const bottomProfile = meanProfile(bottom25);

    const gaps = AXES.map(a => ({
        label: a.label,
        gap: d3.mean(top25, d => d[a.key]) - d3.mean(bottom25, d => d[a.key])
    })).sort((a,b) => Math.abs(b.gap) - Math.abs(a.gap));

    infoPanel.html(`
        <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-secondary);margin-bottom:2px">
            <span style="width:12px;height:2px;background:var(--accent-green);display:inline-block;border-radius:1px;flex-shrink:0"></span>Top 25%
        </div>
        <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-secondary)">
            <span style="width:12px;height:0;border-top:2px dashed var(--accent-red);display:inline-block;flex-shrink:0"></span>Bot 25%
        </div>
        <div class="stat-divider"></div>
        <div class="stat-label" style="font-size:8px">BIGGEST GAP</div>
        <div style="font-family:var(--font-mono);color:var(--accent-blue);font-size:11px;font-weight:700;line-height:1.2">${gaps[0].label}</div>
        <div style="font-size:10px;color:var(--text-secondary);font-family:var(--font-mono)">Δ ${gaps[0].gap.toFixed(1)}</div>
    `);

    // ── FIX: leave enough room for labels around the radar ──
    const labelPad = 34;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - labelPad;
    if (radius <= 0) return;

    const numAxes   = AXES.length;
    const angleSlice = (Math.PI * 2) / numAxes;

    const svg = container.append("svg").attr("width",w).attr("height",h)
        .style("overflow","visible");  // allow labels to render outside SVG bounds
    const g   = svg.append("g").attr("transform",`translate(${cx},${cy})`);

    // Web rings — visible in both light and dark
    const levels = 4;
    for (let l = 1; l <= levels; l++) {
        const r = (radius / levels) * l;
        g.append("polygon")
            .attr("points", d3.range(numAxes).map(i => {
                const angle = angleSlice * i - Math.PI/2;
                return [Math.cos(angle)*r, Math.sin(angle)*r].join(",");
            }).join(" "))
            .attr("fill","none")
            .attr("stroke","var(--border)")
            .attr("stroke-width", 1);
    }

    // Axis lines
    d3.range(numAxes).forEach(i => {
        const angle = angleSlice * i - Math.PI/2;
        g.append("line")
            .attr("x1",0).attr("y1",0)
            .attr("x2", Math.cos(angle)*radius)
            .attr("y2", Math.sin(angle)*radius)
            .attr("stroke","var(--border)").attr("stroke-width",1);

        // Labels — anchor based on position
        const lx = Math.cos(angle) * (radius + 14);
        const ly = Math.sin(angle) * (radius + 14);
        const anchor = Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end";
        const baseline = ly < -4 ? "auto" : ly > 4 ? "hanging" : "middle";

        g.append("text")
            .attr("x", lx).attr("y", ly)
            .attr("text-anchor", anchor)
            .attr("dominant-baseline", baseline)
            .attr("font-family","var(--font-mono)")
            .attr("font-size","10px")
            .attr("font-weight","600")
            .attr("fill","var(--text-secondary)")   // FIX: was text-muted (too faint in light)
            .text(AXES[i].label);
    });

    function profileToPoints(profile) {
        return profile.map((d,i) => {
            const angle = angleSlice * i - Math.PI/2;
            const r = d.value * radius;
            return [Math.cos(angle)*r, Math.sin(angle)*r];
        });
    }
    const pointsToStr = pts => pts.map(p => p.join(",")).join(" ");

    // Bottom 25%
    const bottomPts = profileToPoints(bottomProfile);
    g.append("polygon")
        .attr("points", pointsToStr(bottomPts))
        .attr("fill","rgba(248,113,113,0.12)")
        .attr("stroke","var(--accent-red)")
        .attr("stroke-width",2)
        .attr("stroke-dasharray","4,3");

    // Top 25%
    const topPts = profileToPoints(topProfile);
    g.append("polygon")
        .attr("points","0,0")
        .attr("fill","rgba(74,222,128,0.14)")
        .attr("stroke","var(--accent-green)")
        .attr("stroke-width",2)
        .transition().duration(800)
        .attr("points", pointsToStr(topPts));

    // Dots
    const tooltip = d3.select("#tooltip");
    topProfile.forEach((d,i) => {
        const angle = angleSlice * i - Math.PI/2;
        const r = d.value * radius;
        g.append("circle")
            .attr("cx", Math.cos(angle)*r)
            .attr("cy", Math.sin(angle)*r)
            .attr("r", 3.5)
            .attr("fill","var(--accent-green)")
            .attr("stroke","var(--surface)").attr("stroke-width",1.5)
            .on("mouseover", function(event) {
                const raw    = d3.mean(top25,    row => row[AXES[i].key]);
                const rawBot = d3.mean(bottom25, row => row[AXES[i].key]);
                tooltip.style("opacity",1).html(`
                    <strong>${AXES[i].label}</strong><br>
                    <span style="color:var(--accent-green)">Top 25%: <span class="tt-val">${raw.toFixed(1)}</span></span><br>
                    <span style="color:var(--accent-red)">Bottom 25%: <span class="tt-val">${rawBot.toFixed(1)}</span></span>
                `);
            })
            .on("mousemove", e => tooltip.style("left",(e.clientX+15)+"px").style("top",(e.clientY-10)+"px"))
            .on("mouseout", () => tooltip.style("opacity",0));
    });
}