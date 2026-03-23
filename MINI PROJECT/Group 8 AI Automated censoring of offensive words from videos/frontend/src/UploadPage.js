import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");
    console.log("🔹 Uploading started...");

    localStorage.removeItem("censorshipReport");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log(" Upload complete, received response:", data);

      localStorage.setItem("censorshipReport", JSON.stringify(data));

      if (data.contains_offensive_words) {
        console.log("🚀 Offensive words detected, navigating to /report");
        navigate("/report");
      } else {
        console.log("✅ No offensive words detected. Staying on Upload Page.");
        setUploadMessage("✅ No offensive words detected! You can upload another video.");
      }
    } catch (error) {
      console.error(" Upload failed", error);
      alert(" Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="app-card">
        <h1 className="app-title">Upload Your Video</h1>
        
        <div className="file-input-container">
          <label className="file-input-label">
            <span className="file-input-button">Choose File</span>
            <span className="file-input-text">
              {selectedFile ? selectedFile.name : "No file chosen"}
            </span>
            <input 
              type="file" 
              onChange={(e) => setSelectedFile(e.target.files[0])} 
            />
          </label>
        </div>

        {!isUploading ? (
          <button className="btn btn-app-primary" onClick={handleUpload}>
            Upload
          </button>
        ) : (
          <div className="text-center mt-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Uploading...</span>
            </div>
            <p className="mt-3">Uploading...</p>
          </div>
        )}

        {uploadMessage && (
          <p className="mt-4 text-success text-center">{uploadMessage}</p>
        )}
      </div>
    </div>
  );
};

export default UploadPage;