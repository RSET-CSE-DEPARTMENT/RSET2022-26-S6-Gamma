// ================== IMPORTS ==================
import { predictUnified, predictCCEAM } from "./api.js";

// ================== GLOBAL STATE ==================
let latestPredictionResult = null;
let isClearingForm = false;

const RISK_FORM_KEY = "riskFormValues";
const RISK_RESULT_KEY = "riskPredictionResult";

// ================== HELPERS ==================
function num(id) {
    const el = document.getElementById(id);
    if (!el || el.value === "") return null;
    const n = Number(el.value);
    return Number.isNaN(n) ? null : n;
}

function text(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}
// ================== GLOBAL STATE ==================
let latestCCEAMResult = null;


// ================== CCEAM PREDICTION ==================
async function runCCEAM() {

    const age = num("cceam_age");
    const genderText = text("cceam_gender");
    const trop0 = num("cceam_trop0");
    const ckmb = num("cceam_ckmb");

    if (age === null || !genderText || trop0 === null || ckmb === null) {
        alert("Please fill all CCEAM fields.");
        return;
    }

    const payload = {
        Age: age,
        Gender: genderText === "male" ? 1 : 0,
        Troponin: trop0,
        CK_MB: ckmb
    };

    try {

        const result = await predictCCEAM(payload);

        // store result for report download
        latestCCEAMResult = result;

        const percent = result.probability * 100;

        let risk;
        let color;

        if (percent >= 70) {
            risk = "HIGH RISK";
            color = "#ff6b6b";
        }
        else if (percent >= 40) {
            risk = "MODERATE RISK";
            color = "#ffa94d";
        }
        else {
            risk = "LOW RISK";
            color = "#51cf66";
        }

        document.getElementById("cceamResult").innerHTML = `
            <div style="font-size:18px;font-weight:600;color:${color}">
                Prediction: ${risk}
            </div>

            <div>Probability: ${percent.toFixed(2)}%</div>

            <div style="margin-top:8px">
                Troponin 1h: ${(result.troponin_1h / 10).toFixed(4)}
            </div>

            <div>
                Troponin 2h: ${(result.troponin_2h / 10).toFixed(4)}
            </div>
        `;

    } catch (err) {
        console.error(err);
        alert("CCEAM prediction failed. Check backend.");
    }
}


// ================== DOWNLOAD CCEAM REPORT ==================
async function downloadCCEAMReport() {

    if (!latestCCEAMResult) {
        const btn = document.getElementById("downloadCCEAMReportBtn");
        const original = btn.textContent;

        btn.textContent = "⚠ Run prediction first";
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2500);

        return;
    }

    try {

        // Build payload similar to /predict output
        const payload = {
            final_prob: latestCCEAMResult.probability,
            final_label: latestCCEAMResult.probability >= 0.5 ? "Yes" : "No",
            final_conf: 1.0,
            user: {
                Age: num("cceam_age"),
                Gender: text("cceam_gender") === "male" ? 1 : 0,
                Troponin: num("cceam_trop0"),
                CK_MB: num("cceam_ckmb")
            },
            details: {
                CCEAM: {
                    ran: true,
                    prob: latestCCEAMResult.probability,
                    troponin_1h: latestCCEAMResult.troponin_1h,
                    troponin_2h: latestCCEAMResult.troponin_2h
                }
            }
        };

        const res = await fetch("http://localhost:8000/generate-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "CCEAM_MI_Report.pdf";
        a.click();

        window.URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        alert("Report download failed.");
    }
}
// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {

    // CCEAM prediction button
    document.getElementById("cceamBtn")
        ?.addEventListener("click", runCCEAM);

    // Download report button
    document.getElementById("downloadCCEAMReportBtn")
        ?.addEventListener("click", downloadCCEAMReport);

});
// ================== PUBMED SEARCH ==================
async function runPubMedSearch() {

    const query = document.getElementById("pubmedSearch")?.value.trim();
    const resultsBox = document.getElementById("pubmedResults");

    if (!query) {
        resultsBox.innerHTML = "<div class='muted'>Enter a search term.</div>";
        return;
    }

    resultsBox.innerHTML = "<div class='muted'>Searching PubMed...</div>";

    try {
        const res = await fetch(
            `http://localhost:5000/search/medical?q=${encodeURIComponent(query)}`
        );

        const data = await res.json();

        console.log("PubMed response:", data);  // DEBUG LINE

        if (!res.ok) {
            resultsBox.innerHTML = "<div class='muted'>Search failed.</div>";
            return;
        }

        if (!data.results || data.results.length === 0) {
            resultsBox.innerHTML = "<div class='muted'>No articles found.</div>";
            return;
        }

        resultsBox.innerHTML = data.results.map(item => `
            <div class="card" style="padding:10px;margin-bottom:10px">
                <strong>${item.title}</strong>
                <div class="muted" style="font-size:13px;margin-top:4px">
                    ${item.authors || ""}
                </div>
                <a href="${item.link}" target="_blank" style="color:#87cefa;margin-top:6px;display:inline-block">
                    View Article
                </a>
            </div>
        `).join("");

    } catch (err) {
        console.error("PubMed error:", err);
        resultsBox.innerHTML = "<div class='muted'>Search error.</div>";
    }
}


// ================== TAB SWITCHING ==================
function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab + "-tab");
            if (target) target.classList.add("active");
        });
    });
}

// ================== FORM PERSISTENCE ==================
function saveRiskForm() {
    if (isClearingForm) return;

    const fields = [
        "inp_troponin", "inp_ckmb", "inp_crp",
        "inp_cholesterol", "inp_homocysteine",
        "inp_triglyceride", "inp_bmi",
        "inp_age", "inp_gender"
    ];

    const data = {};
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    localStorage.setItem(RISK_FORM_KEY, JSON.stringify(data));
}

function restoreRiskForm() {
    const saved = localStorage.getItem(RISK_FORM_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);
    Object.keys(data).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
    });
}

// ================== PREDICTION ==================
async function runPrediction() {
    const age = num("inp_age");
    const genderText = text("inp_gender");

    if (age === null || !genderText) {
        alert("Please enter Age and Gender");
        return;
    }

    const payload = {
        Age: age,
        Gender: genderText === "male" ? 1 : 0
    };

    const optional = {
        BMI: "inp_bmi",
        Cholesterol: "inp_cholesterol",
        Triglyceride: "inp_triglyceride",
        CRP: "inp_crp",
        Homocysteine: "inp_homocysteine",
        Troponin: "inp_troponin",
        CK_MB: "inp_ckmb"
    };

    Object.entries(optional).forEach(([key, id]) => {
        const value = num(id);
        if (value !== null) payload[key] = value;
    });

    try {
        const result = await predictUnified(payload);
        showPrediction(result);
    } catch (err) {
        console.error(err);
        alert("Prediction failed. Check backend connection.");
    }
}

// ================== SHOW PREDICTION ==================
function showPrediction(result) {
    const prob = result.final_prob ?? result.probability ?? 0;
    const percent = (prob * 100);

    let risk;
    let color;

    if (percent >= 70) {
        risk = "HIGH RISK";
        color = "#ff6b6b";      // red
    } 
    else if (percent >= 40) {
        risk = "MEDIUM RISK";
        color = "#ffa94d";      // orange
    } 
    else {
        risk = "LOW RISK";
        color = "#51cf66";      // green
    }

    document.getElementById("riskValue").innerText = percent.toFixed(2) + "%";
    document.getElementById("riskLevel").innerText = risk;

    const box = document.getElementById("predResult");
    box.innerHTML = `
        <div style="color:${color}; font-size:18px; font-weight:600;">
            Prediction: ${risk}
        </div>
        <div>Probability: ${percent.toFixed(2)}%</div>
        <div>Confidence: ${result.final_conf ?? "Auto-calculated"}</div>
    `;

    if (result.explanation) {
        box.innerHTML += `
            <hr style="margin:10px 0;opacity:0.3">
            <div style="font-weight:600">Risk Summary</div>
            <div style="font-size:14px;color:#ccc;">
                ${result.explanation.summary}
            </div>
            <ul style="margin-top:6px;font-size:13px;color:#aaa;">
                ${result.explanation.details.map(d => `<li>${d}</li>`).join("")}
            </ul>
        `;
    }

    latestPredictionResult = result;
    savePrediction();
    fetchRecommendedLiterature(result);
}
// ================== SAVE / RESTORE PREDICTION ==================
function savePrediction() {
    localStorage.setItem(
        RISK_RESULT_KEY,
        JSON.stringify({
            result: latestPredictionResult,
            html: document.getElementById("predResult").innerHTML,
            riskValue: document.getElementById("riskValue").innerText,
            riskLevel: document.getElementById("riskLevel").innerText
        })
    );
}

function restorePrediction() {
    const saved = localStorage.getItem(RISK_RESULT_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);
    document.getElementById("predResult").innerHTML = data.html;
    document.getElementById("riskValue").innerText = data.riskValue;
    document.getElementById("riskLevel").innerText = data.riskLevel;
    latestPredictionResult = data.result;
}

// ================== CLEAR ==================
document.getElementById("clearBtn")?.addEventListener("click", () => {
    isClearingForm = true;

    [
        "inp_troponin", "inp_ckmb", "inp_crp",
        "inp_cholesterol", "inp_homocysteine",
        "inp_triglyceride", "inp_bmi", "inp_age"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    document.getElementById("inp_gender").value = "";
    document.getElementById("predResult").innerHTML = "";   // empty = CSS :empty hides it
    document.getElementById("riskValue").innerText = "--%";
    document.getElementById("riskLevel").innerText = "Not Calculated";

    // Clear prediction state in memory so the report button won't fire
    latestPredictionResult = null;

    // Hide literature section
    const litSection = document.getElementById("litSection");
    if (litSection) litSection.style.display = "none";

    // Reset the shapArea placeholder text
    const shapArea = document.getElementById("shapArea");
    if (shapArea) shapArea.innerText = "Enter values to see analysis";

    localStorage.removeItem(RISK_FORM_KEY);
    localStorage.removeItem(RISK_RESULT_KEY);

    isClearingForm = false;
});

// =====================================================
// 📍 NEARBY HOSPITALS
// =====================================================

window.getLocation = function () {
    const out = document.getElementById("hospitalResults");
    out.innerHTML = "<div class='muted'>Detecting location…</div>";

    if (!navigator.geolocation) {
        out.innerHTML = "<div class='muted'>Geolocation not supported.</div>";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            findHospitals(latitude, longitude);
        },
        () => {
            out.innerHTML = "<div class='muted'>Permission denied.</div>";
        },
        { enableHighAccuracy: true, timeout: 20000 }
    );
};


async function findHospitals(lat, lon) {
    const out = document.getElementById("hospitalResults");
    out.innerHTML = "<div class='muted'>Searching hospitals…</div>";

const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:10000,${lat},${lon});
  way["amenity"="hospital"](around:10000,${lat},${lon});
);
out center tags;
`;


    try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(query)
        });

        const json = await res.json();
        displayHospitals(json.elements || [], lat, lon);
    } catch {
        out.innerHTML = "<div class='muted'>Search failed.</div>";
    }
}

function displayHospitals(elements, userLat, userLon) {
    const out = document.getElementById("hospitalResults");
    out.innerHTML = "";

    const hospitals = elements.map(e => {
        const tags = e.tags || {};
        const name = (tags.name || "").toLowerCase();

        // 🚫 Name-based exclusion
        const EXCLUDE = [
        "ayurveda", "ayush", "homeo", "homeopathy",
        "unani", "siddha", "naturopathy", "yoga",
        "clinic", "polyclinic",
        "dental", "eye", "ophthal",
        "skin", "derma",
        "veterinary", "pet",
        "parking", "park", "ground", "ayur", "family", "co-operative", "ariya"
    ];

        if (EXCLUDE.some(word => name.includes(word))) {
            return null;
        }

        const lat = e.lat || e.center?.lat;
        const lon = e.lon || e.center?.lon;
        if (!lat || !lon || !tags.name) return null;

        const dist = distanceKm(userLat, userLon, lat, lon);
        if (dist > 8) return null;

        return {
            name: tags.name,
            address: tags["addr:street"] || "Address not available",
            phone: tags.phone || "Not available",
            lat, lon,
            distance: dist
        };
    }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 5);


    if (!hospitals.length) {
        out.innerHTML = "<div class='muted'>No nearby hospitals found.</div>";
        return;
    }

    hospitals.forEach(h => {
        out.innerHTML += `
        <div class="card" style="padding:12px;margin-bottom:12px">
            <strong>${h.name}</strong>
            <div class="muted">📍 ${h.address}</div>
            <div class="muted">☎️ ${h.phone}</div>
            <div style="color:#87cefa">${h.distance.toFixed(2)} km away</div>
            <button class="btn small"
                onclick="openMap(${h.lat},${h.lon})">
                Open in Map
            </button>
        </div>`;
    });
}

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

window.openMap = (lat, lon) => {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
};

// ================== RECOMMENDED LITERATURE ==================
async function fetchRecommendedLiterature(result) {
    const section = document.getElementById("litSection");
    const resultsEl = document.getElementById("litResults");
    const whyEl = document.getElementById("litWhyText");

    // Show section with shimmer loading skeletons
    section.style.display = "block";
    whyEl.innerHTML = "";
    whyEl.classList.remove("open");
    document.getElementById("litWhyChevron").textContent = "▾";

    resultsEl.innerHTML = Array(3).fill(0).map(() => `
        <div class="lit-article">
            <div class="lit-skeleton" style="width:85%;height:16px"></div>
            <div class="lit-skeleton" style="width:55%;height:12px"></div>
            <div class="lit-skeleton" style="width:100px;height:12px"></div>
        </div>
    `).join("");

    try {
        const res = await fetch("http://localhost:8000/recommend-literature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result)
        });

        const data = await res.json();

        if (data.error || !data.results || data.results.length === 0) {
            resultsEl.innerHTML = "<div class='muted' style='font-size:13px'>No articles found for this profile.</div>";
            return;
        }

        // Populate why-box
        whyEl.textContent = data.why || "";

        // Render article cards
        resultsEl.innerHTML = data.results.map(a => `
            <div class="lit-article">
                <div class="lit-article-title">${a.title}</div>
                ${a.authors ? `<div class="lit-article-authors">${a.authors}</div>` : ""}
                <a class="lit-article-link" href="${a.link}" target="_blank" rel="noopener">
                    View Article ↗
                </a>
            </div>
        `).join("");

    } catch (err) {
        console.error("Literature fetch error:", err);
        resultsEl.innerHTML = "<div class='muted' style='font-size:13px'>Could not load articles. Check backend connection.</div>";
    }
}

window.toggleWhyBox = function () {
    const text = document.getElementById("litWhyText");
    const chevron = document.getElementById("litWhyChevron");
    const open = text.classList.toggle("open");
    chevron.textContent = open ? "▴" : "▾";
};

// ================== DOWNLOAD REPORT ==================
document.getElementById("downloadReportBtn")?.addEventListener("click", async () => {
    if (!latestPredictionResult) {
        // Show a friendly in-page message instead of a blocking alert
        const btn = document.getElementById("downloadReportBtn");
        const original = btn.textContent;
        btn.textContent = "⚠ No prediction available — Calculate Risk first";
        btn.style.color = "#f59e0b";
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = original;
            btn.style.color = "";
            btn.disabled = false;
        }, 3000);
        return;
    }

    try {
        const res = await fetch("http://localhost:8000/generate-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(latestPredictionResult)
        });

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "Heart_Risk_Report.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
    } catch {
        alert("Report download failed.");
    }
});

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    restoreRiskForm();
    restorePrediction();

    document.getElementById("predBtn")
        ?.addEventListener("click", runPrediction);

    document.getElementById("cceamBtn")
        ?.addEventListener("click", runCCEAM);
    document.getElementById("logoutBtn")
        ?.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "index.html";
        });
    document.getElementById("pubmedBtn")
        ?.addEventListener("click", runPubMedSearch);


    const stored = localStorage.getItem("user");
    if (stored) {
        const user = JSON.parse(stored);
        document.getElementById("userName").innerText = user.name;
        document.getElementById("userAvatar").innerText =
            user.name.charAt(0).toUpperCase();
        document.getElementById("userRole").innerText = user.role;
    }
});

