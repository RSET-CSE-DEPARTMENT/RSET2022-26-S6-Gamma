import React, { useState, useEffect } from 'react';
import { FileText, Loader2, XCircle, Award, TrendingUp, User, Download } from 'lucide-react';

// Main Component for Resume Ranking
export default function ResumeRanking() {
  const [jobId, setJobId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState('');

  // Fetch recruiter's jobs
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role === "recruiter") {
      fetchJobs(user.id);
    }
  }, []);

  const fetchJobs = async (recruiterId) => {
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/recruiter-jobs.php?recruiter_id=${recruiterId}`
      );
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Fetch applications for selected job
  const fetchApplications = async (selectedJobId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost/JobNexus/Backend-PHP/api/job-applications.php?job_id=${selectedJobId}`
      );
      const data = await response.json();
      if (data.success) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  // Handle job selection
  const handleJobSelect = (e) => {
    const selectedJobId = e.target.value;
    setJobId(selectedJobId);
    if (selectedJobId) {
      fetchApplications(selectedJobId);
    } else {
      setApplications([]);
      setRankings([]);
    }
  };

  // Rank resumes
  const handleRankResumes = async () => {
    if (!jobId || applications.length === 0) {
      setError('Please select a job and fetch applications first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost/JobNexus/Backend-PHP/api/rank-resumes.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          applications: applications
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRankings(data.rankings);
      } else {
        setError(data.message || 'Failed to rank resumes');
      }
    } catch (err) {
      console.error(err);
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  // Download resume
  const downloadResume = (filename) => {
    window.open(`http://localhost/JobNexus/Backend-PHP/uploads/${filename}`, '_blank');
  };

  const getScoreBadge = (score) => {
    if (score >= 0.7) return { text: 'Excellent Match', color: 'bg-green-500' };
    if (score >= 0.5) return { text: 'Good Match', color: 'bg-yellow-500' };
    return { text: 'Fair Match', color: 'bg-red-500' };
  };

  // Find selected job
  const selectedJob = jobs.find(job => job.id.toString() === jobId.toString());

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Rank Candidates by Match Score</h1>
          </div>
          <p className="text-gray-600">Select a job to view and rank candidate resumes</p>
        </div>

        {/* Job Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-lg font-semibold text-gray-800 mb-4">
            Select Job Posting
          </label>
          
          {loadingJobs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-gray-600 p-4 text-center">No jobs posted yet</p>
          ) : (
            <>
              <select
                value={jobId}
                onChange={handleJobSelect}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {new Date(job.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              
              {selectedJob && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800">
                    {selectedJob.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedJob.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Applications: {applications.length} candidates
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Applications List */}
        {applications.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Applications ({applications.length})
            </h3>
            
            <div className="space-y-3">
              {applications.map((app, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{app.candidate_name || `Candidate ${app.candidate_id}`}</div>
                      <div className="text-sm text-gray-500">Applied: {new Date(app.applied_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {app.resume_filename && (
                      <button
                        onClick={() => downloadResume(app.resume_filename)}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">Resume</span>
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rank Button */}
        <button
          onClick={handleRankResumes}
          disabled={loading || applications.length === 0}
          className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-lg mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Analyzing Resumes...
            </>
          ) : (
            <>
              <TrendingUp className="w-6 h-6" />
              Rank Candidates
            </>
          )}
        </button>

        {/* Rankings Display */}
        {rankings.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Award className="w-7 h-7 text-indigo-600" />
              Candidate Rankings
            </h2>

            <div className="space-y-4">
              {rankings.map((candidate, index) => {
                const badge = getScoreBadge(candidate.score);
                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-6 transition-all hover:shadow-md ${
                      index === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-300 text-orange-900' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            {candidate.candidate_name}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${badge.color} text-white font-medium`}>
                            {badge.text}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-3xl font-bold text-indigo-600">
                          {(candidate.score * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Match Score</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${candidate.score * 100}%` }}
                      ></div>
                    </div>

                    {/* Skills & Details */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resume:</h4>
                        <button
                          onClick={() => downloadResume(candidate.resume_filename)}
                          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          {candidate.resume_filename}
                        </button>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Applied:</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(candidate.applied_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Statistics */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-700 font-medium">Excellent Matches</div>
                <div className="text-2xl font-bold text-green-600">
                  {rankings.filter(r => r.score >= 0.7).length}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-sm text-yellow-700 font-medium">Good Matches</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {rankings.filter(r => r.score >= 0.5 && r.score < 0.7).length}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700 font-medium">Average Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {(rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
