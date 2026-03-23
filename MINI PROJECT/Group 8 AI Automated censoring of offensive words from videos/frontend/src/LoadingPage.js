import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoadingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkProcessing = setInterval(() => {
      const report = JSON.parse(localStorage.getItem("censorshipReport"));

      if (report && report.censored_words && report.censored_words.length > 0) {
        console.log("✅ Processing complete. Redirecting to report page.");
        clearInterval(checkProcessing);
        navigate("/report");  // ✅ Move to report only when new data is ready
      } else if (report && report.contains_offensive_words === false) {
        console.log("✅ No offensive words. Redirecting to download page.");
        clearInterval(checkProcessing);
        navigate("/download");
      } else {
        console.log("⏳ Still processing...");
      }
    }, 5000);  // ✅ Check every 5 seconds

    return () => clearInterval(checkProcessing);
  }, [navigate]);

  return (
    <div className="container mt-5 text-center">
      <div className="card p-4 shadow">
        <h1 className="h4">Processing Your Video...</h1>
        <div className="spinner-border text-primary my-3" role="status"></div>
        <p>Please wait while we analyze and censor your video.</p>
      </div>
    </div>
  );
};

export default LoadingPage;
