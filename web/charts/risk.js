import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const RF = {
    accuracy:  0.91,
    precision: 0.92,
    recall:    0.79,
    f1:        0.85,
    matrix: { tn: 831, fp: 30, fn: 88, tp: 327 }
};

export function drawRiskEngine() {
    const container = d3.select("#risk-engine");
    container.selectAll("*").remove();

    const node = container.node();
    if (!node) return;

    const parent = node.closest(".card-body");
    const W = (parent?.clientWidth  || node.offsetWidth  || 300);
    const H = (parent?.clientHeight || node.offsetHeight || 210);

    const wrap = container.append("div")
        .style("width",   W + "px")
        .style("height",  H + "px")
        .style("display", "flex")
        .style("gap",     "10px")
        .style("padding", "2px 0");

    // ── LEFT: Confusion Matrix ────────────────────────────────
    const leftW = Math.round(W * 0.50);
    const left  = wrap.append("div")
        .style("width",          leftW + "px")
        .style("flex-shrink",    "0")
        .style("display",        "flex")
        .style("flex-direction", "column")
        .style("gap",            "6px");

    left.append("div")
        .style("font-family",     "var(--font-mono)")
        .style("font-size",       "9px")
        .style("font-weight",     "700")
        .style("text-transform",  "uppercase")
        .style("letter-spacing",  "0.1em")
        .style("color",           "var(--text-muted)")
        .text("Confusion Matrix");

    // Column headers
    const colHeader = left.append("div")
        .style("display",      "flex")
        .style("gap",          "4px")
        .style("padding-left", "56px");
    ["Pred: Safe", "Pred: Risk"].forEach(lbl => {
        colHeader.append("div")
            .style("flex",        "1")
            .style("text-align",  "center")
            .style("font-size",   "8px")
            .style("font-family", "var(--font-mono)")
            .style("color",       "var(--text-muted)")
            .text(lbl);
    });

    // Rows
    const matRows = [
        [
            { val: RF.matrix.tn, type: "tn", label: "True Safe" },
            { val: RF.matrix.fp, type: "fp", label: "False Alarm" }
        ],
        [
            { val: RF.matrix.fn, type: "fn", label: "Missed" },  // WARNING cell
            { val: RF.matrix.tp, type: "tp", label: "True Risk" }
        ]
    ];
    const rowLabels = ["Actual:\nSafe", "Actual:\nRisk"];

    const cellBg = (type) => ({
        tn: "color-mix(in srgb,var(--accent-blue) 18%,var(--surface-2))",
        fp: "var(--surface-2)",
        fn: "color-mix(in srgb,var(--accent-red) 22%,var(--surface-2))",  // WARNING
        tp: "color-mix(in srgb,var(--accent-blue) 10%,var(--surface-2))",
    }[type]);

    const cellTextColor = (type) => ({
        tn: "var(--accent-blue)",
        fp: "var(--text-secondary)",
        fn: "var(--accent-red)",   // bright red WARNING
        tp: "var(--accent-blue)",
    }[type]);

    matRows.forEach((row, ri) => {
        const rowEl = left.append("div")
            .style("display",      "flex")
            .style("gap",          "4px")
            .style("align-items",  "center")
            .style("flex",         "1");

        rowEl.append("div")
            .style("width",       "54px")
            .style("flex-shrink", "0")
            .style("font-size",   "8px")
            .style("font-family", "var(--font-mono)")
            .style("color",       "var(--text-muted)")
            .style("text-align",  "right")
            .style("padding-right","4px")
            .style("white-space", "pre-line")
            .text(rowLabels[ri]);

        row.forEach(cell => {
            const cellEl = rowEl.append("div")
                .style("flex",            "1")
                .style("background",      cellBg(cell.type))
                .style("border",          cell.type === "fn"
                    ? "1.5px solid var(--accent-red)"
                    : "1px solid var(--border)")
                .style("border-radius",   "6px")
                .style("display",         "flex")
                .style("flex-direction",  "column")
                .style("align-items",     "center")
                .style("justify-content", "center")
                .style("padding",         "8px 4px")
                .style("min-height",      "44px");

            cellEl.append("div")
                .style("font-family", "var(--font-mono)")
                .style("font-size",   cell.type === "fn" ? "18px" : "16px")
                .style("font-weight", "700")
                .style("line-height", "1")
                .style("color",       cellTextColor(cell.type))
                .text(cell.val.toLocaleString());

            cellEl.append("div")
                .style("font-size",   "7.5px")
                .style("color",       cell.type === "fn" ? "var(--accent-red)" : "var(--text-muted)")
                .style("margin-top",  "3px")
                .style("font-family", "var(--font-mono)")
                .style("font-weight", cell.type === "fn" ? "700" : "400")
                .text(cell.label);
        });
    });

    // ── RIGHT: Metric cards — neutral slate style ─────────────
    const right = wrap.append("div")
        .style("flex",           "1")
        .style("min-width",      "0")
        .style("display",        "flex")
        .style("flex-direction", "column")
        .style("gap",            "5px");

    right.append("div")
        .style("font-family",    "var(--font-mono)")
        .style("font-size",      "9px")
        .style("font-weight",    "700")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "0.1em")
        .style("color",          "var(--text-muted)")
        .text("Model Performance");

    const metrics = [
        { label: "Accuracy",  val: "91%",  desc: "Overall correct predictions" },
        { label: "Precision", val: "92%",  desc: "Of warnings, 92% are real" },
        { label: "Recall",    val: "79%",  desc: "Catches 79% of at-risk students" },
        { label: "F1 Score",  val: "0.85", desc: "Precision-recall balance" },
    ];

    metrics.forEach(m => {
        const card = right.append("div")
            .style("flex",         "1")
            .style("background",   "var(--surface-2)")
            .style("border",       "1px solid var(--border)")
            .style("border-left",  "3px solid var(--text-muted)")  // neutral slate
            .style("border-radius","5px")
            .style("padding",      "5px 9px")
            .style("display",      "flex")
            .style("align-items",  "center")
            .style("gap",          "10px");

        card.append("div")
            .style("font-family",  "var(--font-mono)")
            .style("font-size",    "16px")
            .style("font-weight",  "700")
            .style("color",        "var(--text-primary)")
            .style("min-width",    "38px")
            .text(m.val);

        const col = card.append("div");
        col.append("div")
            .style("font-size",   "9px")
            .style("font-weight", "600")
            .style("color",       "var(--text-secondary)")
            .style("font-family", "var(--font-mono)")
            .text(m.label);
        col.append("div")
            .style("font-size", "8.5px")
            .style("color",     "var(--text-muted)")
            .text(m.desc);
    });
}