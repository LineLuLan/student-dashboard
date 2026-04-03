import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const CLUSTERS = [
    {
        name: "Disciplined",
        subtitle: "High Performers",
        icon: "◈",
        color: "var(--accent-green)",
        score: 69.5, attendance: 91.8, study: 19.8, sleep: 6.8,
        insight: "High attendance drives results"
    },
    {
        name: "Self-Taught",
        subtitle: "Mid Performers",
        icon: "◇",
        color: "var(--accent-blue)",
        score: 66.3, attendance: 74.6, study: 20.3, sleep: 8.7,
        insight: "More sleep, lower attendance"
    },
    {
        name: "Burnout",
        subtitle: "At Risk",
        icon: "◉",
        color: "var(--accent-red)",
        score: 65.5, attendance: 71.3, study: 19.9, sleep: 6.0,
        insight: "Low attendance + low sleep"
    }
];

const STATS = [
    { key: "score",      label: "Avg Score",   unit: "",  decimals: 1 },
    { key: "attendance", label: "Attendance",  unit: "%", decimals: 1 },
    { key: "study",      label: "Study Hrs",   unit: "h", decimals: 1, equal: true },
    { key: "sleep",      label: "Sleep Hrs",   unit: "h", decimals: 1 },
];

export function drawPersonas() {
    const container = d3.select("#personas");
    container.selectAll("*").remove();

    const node = container.node();
    if (!node) return;

    const wrap = container.append("div")
        .style("display", "flex")
        .style("gap", "6px")
        .style("height", "100%")
        .style("padding", "4px 2px");

    CLUSTERS.forEach(c => {
        const card = wrap.append("div")
            .style("flex", "1")
            .style("min-width", "0")
            .style("background", "var(--surface-2)")
            .style("border", `1.5px solid color-mix(in srgb,${c.color} 40%,var(--border))`)
            .style("border-top", `3px solid ${c.color}`)
            .style("border-radius", "8px")
            .style("padding", "10px 10px 8px")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "6px");

        // Header
        const header = card.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "6px");

        header.append("span")
            .style("font-size", "16px")
            .style("color", c.color)
            .text(c.icon);

        const titleCol = header.append("div");
        titleCol.append("div")
            .style("font-family", "var(--font-mono)")
            .style("font-size", "10px")
            .style("font-weight", "700")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.08em")
            .style("color", c.color)
            .text(c.name);
        titleCol.append("div")
            .style("font-size", "9px")
            .style("color", "var(--text-muted)")
            .style("font-family", "var(--font-body)")
            .text(c.subtitle);

        // Hero score
        card.append("div")
            .style("font-family", "var(--font-display)")
            .style("font-size", "28px")
            .style("font-weight", "700")
            .style("color", c.color)
            .style("line-height", "1")
            .text(c.score.toFixed(1));

        // Divider
        card.append("div")
            .style("height", "1px")
            .style("background", "var(--border)");

        // Stats grid
        const statsGrid = card.append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "5px")
            .style("flex", "1");

        STATS.filter(s => s.key !== "score").forEach(s => {
            const row = statsGrid.append("div")
                .style("display", "flex")
                .style("justify-content", "space-between")
                .style("align-items", "baseline")
                .style("gap", "4px");

            const labelWrap = row.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "3px");

            labelWrap.append("div")
                .style("font-size", "9px")
                .style("color", "var(--text-muted)")
                .style("font-family", "var(--font-mono)")
                .text(s.label);



            row.append("div")
                .style("font-family", "var(--font-mono)")
                .style("font-size", "11px")
                .style("font-weight", "700")
                .style("color", "var(--text-primary)")
                .style("text-align", "right")
                .style("white-space", "nowrap")
                .text(`${c[s.key].toFixed(s.decimals)}${s.unit}`);
        });

        // Insight
        card.append("div")
            .style("font-size", "9px")
            .style("color", "var(--text-muted)")
            .style("font-style", "italic")
            .style("line-height", "1.3")
            .style("margin-top", "auto")
            .text(c.insight);
    });
}