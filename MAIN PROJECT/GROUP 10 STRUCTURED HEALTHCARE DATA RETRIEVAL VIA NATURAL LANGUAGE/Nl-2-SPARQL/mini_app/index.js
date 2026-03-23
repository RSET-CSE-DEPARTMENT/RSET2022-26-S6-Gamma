
api_link = "http://localhost:3030/healthkg"

document.getElementById("getDatasetForm").addEventListener("submit", async (e) => {
    e.preventDefault();

	try {
        const response = await fetch(api_link + "/data", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.text();
        console.log("API Response:", result);
		document.querySelector("#getDatasetForm pre").textContent = result;
    } 
    catch (error) {
		document.querySelector("#getDatasetForm pre").textContent = "error";
		console.log("Error: " + error)
    }
});


document.getElementById("queryForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const queryText = document.querySelector("#queryForm #queryInput").value;

    const url = api_link + "/query?query=" + encodeURIComponent(queryText) + "&format=json";

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/sparql-results+json"
            }
        });

        const result = await response.json();
        console.log("QueryForm API Response:", result);

        document.querySelector("#queryForm pre").textContent =
            JSON.stringify(result, null, 2);
    } 
    catch (error) {
        document.querySelector("#queryForm pre").textContent = "Error: " + error;
        console.log("Error: ", error);
    }
});

document.getElementById("form3").addEventListener("submit", async (e) => {
    e.preventDefault();

    const diseaseName = document.getElementById("input1").value.trim();

    const sparqlQuery = `
PREFIX ex:   <http://example.org/health#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?diseaseLabel ?symptomLabel ?medLabel
WHERE {
  ?d a ex:Disease ;
     rdfs:label ?diseaseLabel ;
     ex:hasSymptom ?symptom .

  FILTER(LCASE(STR(?diseaseLabel)) = LCASE("${diseaseName}"))

  ?symptom rdfs:label ?symptomLabel .

  ?med a ex:Medication ;
       ex:treats ?symptom ;
       rdfs:label ?medLabel .
}
    `;

    const url = api_link + "/query?query=" + encodeURIComponent(sparqlQuery) + "&format=json";

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Accept": "application/sparql-results+json" }
        });

        const json = await response.json();
        const bindings = json.results?.bindings || [];

        if (bindings.length === 0) {
            document.querySelector("#form3 pre").textContent =
                `No drug recommendations found for "${diseaseName}".`;
            return;
        }

        const lines = bindings.map(b =>
            `Drug: ${b.medLabel.value}  |  Symptom: ${b.symptomLabel.value}`
        );

        const table = document.querySelector("#form3 table");

        table.innerHTML = "";

        const record = document.createElement("tr");
        record.innerHTML = `
            <th>Recommended Drug</th>
            <th>Symptom</th>
        `;
        table.appendChild(record);
        
        bindings.forEach(element => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${element.medLabel.value}</td>
                <td>${element.symptomLabel.value}</td>
            `;
            table.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        document.querySelector("#form3 pre").textContent =
            "Error fetching drug recommendations: " + err;
    }
});

