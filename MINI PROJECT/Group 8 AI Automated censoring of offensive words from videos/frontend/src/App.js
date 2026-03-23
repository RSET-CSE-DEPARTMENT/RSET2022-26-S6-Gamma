import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import UploadPage from "./UploadPage";
import LoadingPage from "./LoadingPage";
import CensorshipReport from "./CensorshipReport";
import DownloadPage from "./DownloadPage";
import "./App.css"; // Import the new CSS file

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/report" element={<CensorshipReport />} />
        <Route path="/download" element={<DownloadPage />} />
      </Routes>
    </>
  );
};

export default App;