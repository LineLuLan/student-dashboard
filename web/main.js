console.log("Before import");
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { drawScatter } from "./charts/scatter.js";
import { drawTopBottom } from "./charts/bar.js";

console.log("After import");

let fullData = [];

d3.csv("data/clean_student_performance.csv", d => ({
    hours_studied: +d.hours_studied,
    attendance: +d.attendance,
    parental_involvement: d.parental_involvement,
    resources: d.resources,
    extracurricular: d.extracurricular,
    sleep_hours: +d.sleep_hours,
    previous_scores: +d.previous_scores,
    motivation: d.motivation,
    internet: d.internet,
    tutoring: +d.tutoring,
    family_income: d.family_income,
    teacher_quality: d.teacher_quality,
    school_type: d.school_type,
    peer_influence: d.peer_influence,
    physical_activity: +d.physical_activity,
    learning_disability: d.learning_disability,
    parent_education: d.parent_education,
    distance: d.distance,
    gender: d.gender,
    exam_score: +d.exam_score
}))
.then(data => {
    console.log("CSV LOADED", data.length);
    console.log("parsed:", data[0]);
    drawScatter(data);
    drawTopBottom(data);
    
    fullData = data;
    update();
});

function getFilters() {
    return Array.from(document.querySelectorAll(".controls input:checked"))
        .map(cb => cb.value);
}

function update() {
    const selected = getFilters();

    console.log("filters:", selected);

    const filtered = fullData.filter(d => selected.includes(d.motivation));

    console.log("filtered size:", filtered.length);

    drawScatter(filtered);
    drawTopBottom(filtered);

}

document.querySelectorAll(".controls input")
    .forEach(cb => cb.addEventListener("change", update));

window.addEventListener("resize", () => {
    update();
});
