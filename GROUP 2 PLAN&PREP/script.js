let uploadedFile = null;
const generateBtn = document.getElementById("generateBtn");
const pdfUpload = document.getElementById("pdfUpload");
const fileName = document.getElementById("fileName");
const questionList = document.getElementById("questionList");
const rightPanel = document.getElementById("rightPanel");
const leftPanel = document.querySelector(".left-panel");
const qaBox = document.getElementById("qaBox");
const loader = document.getElementById("loader");
const closeResults = document.getElementById("closeResults");
const qaCount = document.getElementById("qaCount");

// Handle file selection
pdfUpload.addEventListener("change", function(event) {
    uploadedFile = event.target.files[0];
    generateBtn.disabled = !uploadedFile;
    
    if (uploadedFile) {
        fileName.textContent = uploadedFile.name;
    } else {
        fileName.textContent = "No file selected";
    }
});

// Close results and reset the UI
closeResults.addEventListener("click", function() {
    rightPanel.classList.remove("active");
    leftPanel.classList.remove("shrink");
    
    // Wait for the animation to complete before hiding the close button
    setTimeout(() => {
        closeResults.style.display = "none";
    }, 400);
});

// Generate questions when the button is clicked
generateBtn.addEventListener("click", function() {
    if (!uploadedFile) return;
    
    // Show loader
    loader.style.display = "block";
    generateBtn.disabled = true;
    
    const formData = new FormData();
    formData.append("file", uploadedFile);
    
    // Get the number of questions from the input
    const questionCount = document.getElementById("questionCount").value;
    formData.append("num_questions", questionCount);
    
    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Hide loader
        loader.style.display = "none";
        generateBtn.disabled = false;
        
        // Clear previous results
        questionList.innerHTML = "";
        
        if (data.error) {
            questionList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>
                    <p style="color: #ef4444;">${data.error}</p>
                </div>
            `;
            
            // Show results panel
            showResults();
            return;
        }
        
        // Update question count
        qaCount.textContent = `${data.qa_pairs.length} Questions`;
        
        // Generate question-answer pairs
        data.qa_pairs.forEach((item, index) => {
            const div = document.createElement("div");
            div.classList.add("qa-item");
            div.innerHTML = `
                <div class="question">
                    <strong>Q${index + 1}:</strong> ${item.question}
                </div>
                <div class="answer">
                    <strong>A:</strong> ${item.answer}
                </div>
            `;
            questionList.appendChild(div);
        });
        
        // Show results panel with animation
        showResults();
    })
    .catch(error => {
        console.error("Error:", error);
        loader.style.display = "none";
        generateBtn.disabled = false;
        
        questionList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                <p style="color: #ef4444;">Connection error. Please check if the server is running.</p>
            </div>
        `;
        
        // Show results panel
        showResults();
    });
});

function showResults() {
    // Animate the panels
    leftPanel.classList.add("shrink");
    rightPanel.classList.add("active");
    
    // Show the close button
    closeResults.style.display = "block";
    
    // After a small delay, animate the qa box
    setTimeout(() => {
        qaBox.classList.add("active");
    }, 100);
}