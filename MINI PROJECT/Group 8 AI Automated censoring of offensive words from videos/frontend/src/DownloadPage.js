import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DownloadPage = () => {
  const [report, setReport] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedReport = JSON.parse(localStorage.getItem("censorshipReport"));
    setReport(storedReport);
  }, []);

  const handleDownload = () => {
    if (report?.censored_video) {
      window.location.href = report.censored_video;
    }
  };

  return (
    <div className="container mt-5">
      <div className="app-card text-center">
        <h1 className="app-title">🎉 Thank You for Using CleanVid!</h1>
        <p className="mb-4">Your censored video is ready for download.</p>

        <button className="btn btn-app-primary mb-4" onClick={handleDownload}>
          Download Censored Video
        </button>

        <button className="btn btn-app-secondary" onClick={() => navigate("/")}>
          Go Back Home
        </button>
      </div>
    </div>
  );
};

export default DownloadPage;