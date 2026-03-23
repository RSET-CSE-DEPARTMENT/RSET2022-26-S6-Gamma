import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ENABLE_COLLEGE_ADMIN } from "../config/featureFlags";

// Updated Candidates Component with Match Score Navigation
export function Candidates() {
  const navigate = (path) => {
    window.location.hash = path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white p-4">
        <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
      </header>
      
      <nav className="bg-white shadow-sm p-4 flex gap-4">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="cursor-pointer hover:text-indigo-600">Home</a>
        <a href="/candidates" onClick={(e) => { e.preventDefault(); navigate("/candidates"); }} className="cursor-pointer hover:text-indigo-600">Candidates</a>
        <a href="/recruiters" onClick={(e) => { e.preventDefault(); navigate("/recruiters"); }} className="cursor-pointer hover:text-indigo-600">Recruiters</a>
        {ENABLE_COLLEGE_ADMIN && (
          <a href="/collegeadmins" onClick={(e) => { e.preventDefault(); navigate("/collegeadmins"); }} className="cursor-pointer hover:text-indigo-600">College Admins</a>
        )}
        <a href="/jobs" onClick={(e) => { e.preventDefault(); navigate("/jobs"); }} className="cursor-pointer hover:text-indigo-600">Jobs</a>
        <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login"); }} className="cursor-pointer hover:text-indigo-600">Login</a>
      </nav>

      <main className="container mx-auto p-6 max-w-4xl">
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload or Generate Resume</h2>
          <form className="space-y-4">
            <label className="block">
              <span className="text-gray-700">Upload Resume:</span>
              <input type="file" accept=".pdf,.doc,.docx" className="mt-1 block w-full" />
            </label>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700" type="submit">
              Upload
            </button>
          </form>
          <button type="button" className="inline-block mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
            Build Resume Online
          </button>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Resume Analysis & Feedback</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Get skill gap analysis
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Receive personalized improvement tips
            </li>
            <li 
              className="flex items-center gap-2 cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => navigate("/match-score")}
            >
              <CheckCircle className="w-5 h-5 text-indigo-500" />
              View your match score for jobs
            </li>
            <li 
              className="flex items-center gap-2 cursor-pointer text-indigo-600 hover:text-indigo-800"
              onClick={() => navigate("/interview-prep")}
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              AI-generated interview questions for preparation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              See suitable career paths based on resume
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Job Search & Recommendations</h2>
          <form className="space-y-4">
            <input 
              type="text" 
              placeholder="Search jobs by keyword, location, or skill" 
              className="w-full p-2 border border-gray-300 rounded"
            />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700" type="submit">
              Search
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            <li>One-click applications</li>
            <li>Recommended courses for missing skills</li>
            <li>Track application status</li>
          </ul>
        </section>
      </main>

      <footer className="bg-gray-800 text-white text-center p-4 mt-8">
        &copy; 2025 Job Nexus
      </footer>
    </div>
  );
}

// Semantic Match Score Component
export default function SemanticMatchScore() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [matchResults, setMatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type === 'text/plain')) {
      setResumeFile(file);
      setError('');
    } else {
      setError('Please upload a PDF or TXT file');
      setResumeFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_description', jobDescription);

    try {
      // Call your Python backend API
      const response = await fetch('http://localhost:8000/api/match-score', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to calculate match score');
      }

      const data = await response.json();
      setMatchResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while calculating match score');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Resume Match Score</h1>
          <p className="text-gray-600 mb-8">Upload your resume and paste a job description to see how well they match</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Your Resume
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {resumeFile ? resumeFile.name : 'Click to upload PDF or TXT'}
                  </span>
                </label>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Calculate Match Score
                </>
              )}
            </button>
          </form>

          {/* Results Display */}
          {matchResults && (
            <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Match Results</h2>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium text-gray-700">Overall Match Score</span>
                  <span className="text-3xl font-bold text-indigo-600">
                    {(matchResults.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${matchResults.similarity_score * 100}%` }}
                  ></div>
                </div>

                {matchResults.extracted_skills && matchResults.extracted_skills.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Detected Skills:</h3>
                    <div className="flex flex-wrap gap-2">
                      {matchResults.extracted_skills.slice(0, 10).map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Recommendation:</strong> {
                      matchResults.similarity_score >= 0.7 ? 
                        "Excellent match! You're a strong candidate for this role." :
                      matchResults.similarity_score >= 0.5 ?
                        "Good match. Consider highlighting relevant skills in your application." :
                        "Consider gaining more relevant skills or tailoring your resume to better match this role."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
