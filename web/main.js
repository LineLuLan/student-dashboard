import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { drawScatter }          from "./charts/scatter.js";
import { drawTopBottom }        from "./charts/bar.js";
import { drawEnvironmentTrend } from "./charts/environment.js";
import { drawKeyFactors }       from "./charts/importance.js";

import { drawRadar }            from "./charts/radar.js";
import { drawHistogram }        from "./charts/histogram.js";

const envSelect = document.getElementById("environmentSelect");
const themeBtn  = document.getElementById("themeToggle");
const htmlEl    = document.documentElement;

let scatterXField = "hours_studied";
let scatterXLabel = "Study Hours";
let fullData = [];
let isDark = false;

// ── View Switcher Config ──────────────────────────────────────────
const VIEW_CONFIG = {
    main: {
        label:       "Motivation",
        field:       "motivation",
        values:      ["low", "medium", "high"],
        chipLabels:  ["Low", "Medium", "High"],
        colors:      ["var(--low-color)", "var(--med-color)", "var(--high-color)"],
        scatterSubtitle: null, // computed dynamically
        sidePanelTitle:  "HOW MUCH IT MATTERS",
        sidePanelStat:   null, // computed dynamically (r²%)
        sidePanelDesc:   null, // computed dynamically
        kpiDelta:        null,
        baselineField:   null,
    },
    teacher_quality: {
        label:       "Teacher Quality",
        field:       "teacher_quality",
        values:      ["low", "medium", "high"],
        chipLabels:  ["Low", "Medium", "High"],
        colors:      ["var(--low-color)", "var(--med-color)", "var(--high-color)"],
        scatterSubtitle: "How does teacher quality affect student outcomes?",
        sidePanelTitle:  "PERFORMANCE FINE-TUNING",
        sidePanelStat:   "+0.9 pts",
        sidePanelDesc:   "avg score gap between students with highest vs lowest teacher quality",
        baselineField:   "teacher_quality",
        baselineLow:     "low",
        baselineHigh:    "high",
    },
    parental_involvement: {
        label:       "Parental Involvement",
        field:       "parental_involvement",
        values:      ["low", "medium", "high"],
        chipLabels:  ["Low", "Medium", "High"],
        colors:      ["var(--low-color)", "var(--med-color)", "var(--high-color)"],
        scatterSubtitle: "Exploring how family engagement influences student performance",
        sidePanelTitle:  "FAMILY FOUNDATION",
        sidePanelStat:   "+1.7 pts",
        sidePanelDesc:   "score advantage for students with the highest parental involvement",
        baselineField:   "parental_involvement",
        baselineLow:     "low",
        baselineHigh:    "high",
    },
    peer_influence: {
        label:       "Peer Influence",
        field:       "peer_influence",
        values:      ["negative", "neutral", "positive"],
        chipLabels:  ["Negative", "Neutral", "Positive"],
        colors:      ["var(--accent-red)", "var(--accent-yellow)", "var(--accent-green)"],
        scatterSubtitle: "How does peer group environment shape student achievement?",
        sidePanelTitle:  "PEER ENVIRONMENT",
        sidePanelStat:   "+1.0 pts",
        sidePanelDesc:   "score gap between students in positive vs negative peer groups",
        baselineField:   "peer_influence",
        baselineLow:     "negative",
        baselineHigh:    "positive",
    }
};
let currentView = "main"; // default

// ── Theme toggle ─────────────────────────────────────────────────
themeBtn.addEventListener("click", () => {
    isDark = !isDark;
    htmlEl.setAttribute("data-theme", isDark ? "dark" : "light");
    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
    // Redraw after theme transition settles
    setTimeout(() => { const f = getFilteredData(); const { colorMap } = getViewState(); drawAll(f, colorMap); }, 320);
});

// ── Load CSV ─────────────────────────────────────────────────────
d3.csv("data/clean_student_performance.csv", d => ({
    hours_studied:        +d.hours_studied,
    attendance:           +d.attendance,
    parental_involvement: (d.parental_involvement||"").trim().toLowerCase(),
    resources:            (d.resources||"").trim().toLowerCase(),
    extracurricular:      d.extracurricular,
    sleep_hours:          +d.sleep_hours,
    previous_scores:      +d.previous_scores,
    motivation:           (d.motivation||"medium").trim().toLowerCase(),
    internet:             d.internet,
    tutoring:             +d.tutoring,
    family_income:        d.family_income,
    teacher_quality:      (d.teacher_quality||"").trim().toLowerCase(),
    school_type:          d.school_type,
    peer_influence:       (d.peer_influence||"").trim().toLowerCase(),
    physical_activity:    +d.physical_activity,
    learning_disability:  d.learning_disability,
    parent_education:     d.parent_education,
    distance:             d.distance,
    gender:               d.gender,
    exam_score:           +d.exam_score
}))
.then(data => {
    fullData = data.filter(d => !isNaN(d.exam_score) && !isNaN(d.hours_studied));
    window.__viewField__ = "motivation"; // default
    window.__viewConfig__ = null; // main view uses null
    update();
});

// ── Filters ──────────────────────────────────────────────────────
function getFilters() {
    return Array.from(document.querySelectorAll(".controls input:checked")).map(cb => cb.value);
}

// Returns {field, activeValues, colorMap} for current view
function getViewState() {
    const cfg = VIEW_CONFIG[currentView];
    const active = getFilters();
    const all = active.length === 0; // no filter = show all
    const colorMap = {};
    cfg.values.forEach((v, i) => colorMap[v] = cfg.colors[i]);
    return { field: cfg.field, activeValues: active, colorMap, all, cfg };
}

// Build filtered dataset using current view
function getFilteredData() {
    const { field, activeValues, all } = getViewState();
    if (all) return fullData;
    const filtered = fullData.filter(d => {
        const val = (d[field] || "").toString().trim().toLowerCase();
        return activeValues.includes(val);
    });
    // Debug: log once per switch
    if (window.__debugView__) {
        const sample = fullData[0];
        console.log(`[View] field="${field}", sample value="${(sample?.[field]||'').toLowerCase()}", activeValues=${JSON.stringify(activeValues)}, matched=${filtered.length}/${fullData.length}`);
        window.__debugView__ = false;
    }
    return filtered;
}

// Switch view: rebuild chips + redraw
function switchView(viewKey) {
    currentView = viewKey;
    const cfg = VIEW_CONFIG[viewKey];

    // Update view switcher active state
    document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("view-btn-active", b.dataset.view === viewKey);
    });

    // Rebuild filter chips
    const controlsEl = document.querySelector(".controls");
    controlsEl.innerHTML = "";
    cfg.values.forEach((val, i) => {
        const label = document.createElement("label");
        label.className = "chip";
        label.innerHTML = `<input type="checkbox" value="${val}" checked><span class="chip-dot" style="background:${cfg.colors[i]}"></span>${cfg.chipLabels[i]}`;
        controlsEl.appendChild(label);
    });

    // Re-attach events
    controlsEl.querySelectorAll("input").forEach(cb =>
        cb.addEventListener("change", update)
    );

    // Update filter label
    const lbl = document.querySelector(".filter-label");
    if (lbl) lbl.textContent = cfg.label.toUpperCase();

    // Update scatter subtitle for non-main views
    const subtitleEl = document.getElementById("scatter-subtitle");
    if (subtitleEl && cfg.scatterSubtitle) {
        subtitleEl.textContent = cfg.scatterSubtitle;
    }

    // Expose current view field for scatter dot coloring
    window.__viewField__ = cfg.field;
    window.__viewLabel__ = cfg.label;
    // main view uses null so scatter shows r²; others show delta stat
    window.__viewConfig__ = (viewKey === "main") ? null : cfg;

    update();
}

// ── KPI Bar ──────────────────────────────────────────────────────
function updateKPI(data) {
    const total    = data.length;
    const avgScore = d3.mean(data, d => d.exam_score) || 0;
    const avgAtt   = d3.mean(data, d => d.attendance) || 0;
    const avgHours = d3.mean(data, d => d.hours_studied) || 0;
    const avgScoreThreshold = d3.mean(data, d => d.exam_score) || 67;
    const above75  = data.filter(d => d.exam_score > avgScoreThreshold).length;
    const above75p = total ? (above75 / total * 100) : 0;

    // Delta vs global baseline (always compare to full dataset mean)
    const cfg = VIEW_CONFIG[currentView];
    const globalBaseline = d3.mean(fullData, d => d.exam_score) || 67.3;
    const activeFilters  = getFilters();
    let scoreLabel = "";

    // Show delta when exactly 1 group is selected in ANY view
    const allVals = cfg?.values || [];
    const oneGroupSelected = activeFilters.length > 0 && activeFilters.length < allVals.length;
    if (oneGroupSelected) {
        const delta = avgScore - globalBaseline;
        const sign  = delta >= 0 ? "↑" : "↓";
        scoreLabel  = ` (${sign}${Math.abs(delta).toFixed(1)} vs overall avg)`;
    }
    // If no filter or all groups selected → show nothing

    const fields = [
        { key:"attendance",        label:"Attendance"    },
        { key:"hours_studied",     label:"Study Hours"   },
        { key:"previous_scores",   label:"Prev. Scores"  },
        { key:"tutoring",          label:"Tutoring"      },
        { key:"sleep_hours",       label:"Sleep Hours"   },
        { key:"physical_activity", label:"Physical Act." },
    ];
    function pr(fx) {
        const mx=d3.mean(data,d=>d[fx]), my=d3.mean(data,d=>d.exam_score);
        let n=0,dx2=0,dy2=0;
        data.forEach(d=>{const dx=d[fx]-mx,dy=d.exam_score-my;n+=dx*dy;dx2+=dx*dx;dy2+=dy*dy;});
        return (dx2&&dy2)?n/Math.sqrt(dx2*dy2):0;
    }
    const topFactor = [...fields].sort((a,b)=>Math.abs(pr(b.key))-Math.abs(pr(a.key)))[0];

    // Format total with comma separator via custom animator
    animateKPIFormatted("kpi-total", total);
    animateKPI("kpi-avg-score",  avgScore,  1, "");
    // Delta sublabel — element pre-exists in HTML as .kpi-sub
    const deltaEl = document.getElementById("kpi-score-delta");
    if (deltaEl) {
        if (scoreLabel) {
            deltaEl.textContent  = scoreLabel;
            deltaEl.style.color  = scoreLabel.includes("↑") ? "var(--accent-green)" : "var(--accent-red)";
            deltaEl.style.fontWeight = "700";
        } else {
            deltaEl.textContent  = "\u00a0"; // keep height, show nothing
            deltaEl.style.color  = "";
            deltaEl.style.fontWeight = "";
        }
    }
    animateKPI("kpi-avg-att",    avgAtt,    1, "%");
    animateKPI("kpi-avg-hours",  avgHours,  1, "h");
    animateKPI("kpi-above75",    above75p,  1, "%");
    document.getElementById("kpi-top-factor").textContent = topFactor.label;
}

function animateKPIFormatted(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = +(el.dataset.val || 0);
    el.dataset.val = target;
    const t0 = performance.now();
    (function step(t) {
        const p = Math.min((t - t0) / 600, 1);
        const e = 1 - Math.pow(1-p, 3);
        const val = Math.round(start + (target-start)*e);
        el.textContent = val.toLocaleString();
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}

function animateKPI(id, target, decimals, suffix) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseFloat(el.dataset.val || 0);
    el.dataset.val = target;
    const t0 = performance.now();
    (function step(t) {
        const p = Math.min((t - t0) / 600, 1);
        const e = 1 - Math.pow(1-p, 3);
        el.textContent = (start + (target-start)*e).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}

// ── Drill-down ───────────────────────────────────────────────────
export function onFactorClick(fieldKey, fieldLabel) {
    scatterXField = fieldKey;
    scatterXLabel = fieldLabel;
    const titleEl = document.getElementById("scatter-title");
    if (titleEl) {
        titleEl.textContent = `${fieldLabel} vs Exam Score`;
        titleEl.style.color = "var(--accent-blue)";
        setTimeout(() => { titleEl.style.color = ""; }, 1200);
    }
    const filtered = getFilteredData();
    const { colorMap } = getViewState();
    const vf = VIEW_CONFIG[currentView]?.field || "motivation";
    drawScatter(filtered, scatterXField, scatterXLabel, colorMap, vf);
}

// ── Draw all charts ───────────────────────────────────────────────
function drawAll(filtered, colorMap) {
    const vf = VIEW_CONFIG[currentView]?.field || "motivation";
    drawScatter(filtered, scatterXField, scatterXLabel, colorMap, vf);
    drawTopBottom(filtered);
    drawEnvironmentTrend(filtered, envSelect.value);
    drawKeyFactors(filtered, onFactorClick);
    drawRadar(filtered);
    drawHistogram(filtered);
}

// ── Update ────────────────────────────────────────────────────────
function update() {
    const filtered = getFilteredData();
    const { colorMap } = getViewState();
    updateKPI(filtered);
    requestAnimationFrame(() => requestAnimationFrame(() => drawAll(filtered, colorMap)));
}

// ── Events ────────────────────────────────────────────────────────
document.querySelectorAll(".controls input").forEach(cb => cb.addEventListener("change", update));
envSelect.addEventListener("change", update);

// View switcher buttons
document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
});

window.addEventListener("resize", () => {
    const filtered = getFilteredData();
    const { colorMap } = getViewState();
    if (filtered.length) requestAnimationFrame(() => drawAll(filtered, colorMap));
});