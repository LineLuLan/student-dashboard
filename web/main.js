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

// ── Theme toggle ─────────────────────────────────────────────────
themeBtn.addEventListener("click", () => {
    isDark = !isDark;
    htmlEl.setAttribute("data-theme", isDark ? "dark" : "light");
    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
    // Redraw after theme transition settles
    setTimeout(() => { const f = fullData.filter(d => getFilters().includes(d.motivation)); drawAll(f); }, 320);
});

// ── Load CSV ─────────────────────────────────────────────────────
d3.csv("data/clean_student_performance.csv", d => ({
    hours_studied:        +d.hours_studied,
    attendance:           +d.attendance,
    parental_involvement: d.parental_involvement,
    resources:            d.resources,
    extracurricular:      d.extracurricular,
    sleep_hours:          +d.sleep_hours,
    previous_scores:      +d.previous_scores,
    motivation:           d.motivation ? d.motivation.trim().toLowerCase() : "medium",
    internet:             d.internet,
    tutoring:             +d.tutoring,
    family_income:        d.family_income,
    teacher_quality:      d.teacher_quality,
    school_type:          d.school_type,
    peer_influence:       d.peer_influence,
    physical_activity:    +d.physical_activity,
    learning_disability:  d.learning_disability,
    parent_education:     d.parent_education,
    distance:             d.distance,
    gender:               d.gender,
    exam_score:           +d.exam_score
}))
.then(data => {
    fullData = data.filter(d => !isNaN(d.exam_score) && !isNaN(d.hours_studied));
    update();
});

// ── Filters ──────────────────────────────────────────────────────
function getFilters() {
    return Array.from(document.querySelectorAll(".controls input:checked")).map(cb => cb.value);
}

// ── KPI Bar ──────────────────────────────────────────────────────
function updateKPI(data) {
    const total    = data.length;
    const avgScore = d3.mean(data, d => d.exam_score) || 0;
    const avgAtt   = d3.mean(data, d => d.attendance) || 0;
    const avgHours = d3.mean(data, d => d.hours_studied) || 0;
    // Use mean as threshold — "above average" is more meaningful than arbitrary 75
    const avgScoreThreshold = d3.mean(data, d => d.exam_score) || 67;
    const above75  = data.filter(d => d.exam_score > avgScoreThreshold).length;
    const above75p = total ? (above75 / total * 100) : 0;

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
    const filtered = fullData.filter(d => getFilters().includes(d.motivation));
    drawScatter(filtered, scatterXField, scatterXLabel);
}

// ── Draw all charts ───────────────────────────────────────────────
function drawAll(filtered) {
    drawScatter(filtered, scatterXField, scatterXLabel);
    drawTopBottom(filtered);
    drawEnvironmentTrend(filtered, envSelect.value);
    drawKeyFactors(filtered, onFactorClick);
    drawRadar(filtered);
    drawHistogram(filtered);
}

// ── Update ────────────────────────────────────────────────────────
function update() {
    const activeFilters = getFilters();
    // When no filter selected → show all data (no filter = show everything)
    const filtered = activeFilters.length === 0
        ? fullData
        : fullData.filter(d => activeFilters.includes(d.motivation));

    updateKPI(filtered);
    // Double rAF ensures DOM has fully laid out before measuring dimensions
    requestAnimationFrame(() => requestAnimationFrame(() => drawAll(filtered)));
}

// ── Events ────────────────────────────────────────────────────────
document.querySelectorAll(".controls input").forEach(cb => cb.addEventListener("change", update));
envSelect.addEventListener("change", update);
window.addEventListener("resize", () => {
    const filtered = fullData.filter(d => getFilters().includes(d.motivation));
    if (filtered.length) requestAnimationFrame(() => drawAll(filtered));
});