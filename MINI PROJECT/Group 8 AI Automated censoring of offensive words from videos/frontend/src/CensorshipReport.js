import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CensorshipReport = () => {
  const [report, setReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [noOffensiveWords, setNoOffensiveWords] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedReport = JSON.parse(localStorage.getItem("censorshipReport"));
    setReport(storedReport);

    if (storedReport && storedReport.censored_words.length === 0) {
      console.log("✅ No offensive words detected. Staying on the Upload Page.");
      setNoOffensiveWords(true);
    }
  }, []);

  const handleUndo = async (wordToRemove) => {
    if (!report) return;

    const updatedWords = report.censored_words.filter(
      (wordData) => wordData.word !== wordToRemove
    );

    const updatedReport = { ...report, censored_words: updatedWords };
    setReport(updatedReport);
    localStorage.setItem("censorshipReport", JSON.stringify(updatedReport));

    try {
      await fetch("http://127.0.0.1:5000/save_updated_json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ censored_words: updatedWords }),
      });
    } catch (error) {
      console.error("❌ Error saving updated JSON file:", error);
    }
  };

  const handleProceedToDownload = async () => {
    if (!report) return;

    setIsProcessing(true);
    console.log("🚀 Processing censorship and merging video...");

    try {
      const response = await fetch("http://127.0.0.1:5000/censor_and_merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path: report.video_path,
          audio_path: report.audio_path,
          transcript_json: report.transcript_json,
          unique_id: report.unique_id,
        }),
      });

      const data = await response.json();

      if (data.censored_video) {
        localStorage.setItem("censorshipReport", JSON.stringify(data));
        console.log("✅ Censorship complete. Redirecting to /download");
        navigate("/download");
      } else {
        alert("❌ Error processing the video.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("❌ Failed to process censorship.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="app-card">
        <h1 className="app-title">Censorship Report</h1>

        {noOffensiveWords ? (
          <div className="text-center">
            <h5 className="text-success mb-4">✅ No offensive words detected! You can upload another video.</h5>
            <button className="btn btn-app-secondary" onClick={() => navigate("/")}>
              Upload Another Video
            </button>
          </div>
        ) : (
          <>
            <h5 className="mt-4 mb-3">Detected Offensive Words</h5>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Start Time (s)</th>
                    <th>End Time (s)</th>
                    <th>Confidence (%)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.censored_words?.map((wordData, index) => (
                    <tr key={index}>
                      <td>{wordData.word}</td>
                      <td>{wordData.start_time.toFixed(2)}</td>
                      <td>{wordData.end_time.toFixed(2)}</td>
                      <td>{(wordData.confidence * 100).toFixed(2)}%</td>
                      <td>
                        <button 
                          className="btn btn-warning btn-sm" 
                          onClick={() => handleUndo(wordData.word)}
                        >
                          Undo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-center">
              {!isProcessing ? (
                <button 
                  className="btn btn-app-primary" 
                  onClick={handleProceedToDownload}
                >
                  Proceed to Download
                </button>
              ) : (
                <div className="mt-4 text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  <p className="mt-3">Processing...</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CensorshipReport;