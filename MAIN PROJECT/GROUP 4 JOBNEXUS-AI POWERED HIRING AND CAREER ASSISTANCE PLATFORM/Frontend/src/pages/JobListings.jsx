import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function JobListings() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    employmentType: ''
  });
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  useEffect(() => {
    fetchJobs();
    loadAppliedJobs();
  }, []);

  const loadAppliedJobs = () => {
    const applied = localStorage.getItem('appliedJobs');
    if (applied) {
      setAppliedJobs(new Set(JSON.parse(applied)));
    }
  };

  const fetchJobs = async (searchParams = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      const response = await fetch(`http://localhost/JobNexus/Backend-PHP/api/get-jobs.php?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    fetchJobs(filters);
  };

  const handleApply = (jobId) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'candidate') {
      alert('Please login as a candidate to apply');
      navigate('/login');
      return;
    }

    // Add to applied jobs
    const newApplied = new Set(appliedJobs);
    newApplied.add(jobId);
    setAppliedJobs(newApplied);
    localStorage.setItem('appliedJobs', JSON.stringify([...newApplied]));
    
    alert('Application submitted successfully!');
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #4A70A9, #4A70A9)',
        color: 'white',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.5rem' }}>Find Your Dream Job</h1>
        <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>
          Discover opportunities posted by top recruiters
        </p>
      </header>

      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
        {/* Search Filters */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by title, skills..."
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Location"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
            <select
              name="employmentType"
              value={filters.employmentType}
              onChange={handleFilterChange}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            style={{
              padding: '0.75rem 2rem',
              background: '#4A70A9',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Search Jobs
          </button>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #4A70A9',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
              No jobs found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {jobs.map(job => (
              <div
                key={job.id}
                style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
                      {job.title}
                    </h3>
                    {job.company_name && (
                      <p style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#4A70A9', fontWeight: '500' }}>
                        {job.company_name}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#6b7280' }}>
                      {job.location && <span>Location: {job.location}</span>}
                      {job.employment_type && <span>Type: {job.employment_type}</span>}
                      {job.salary_range && <span>Salary: {job.salary_range}</span>}
                      {job.experience_level && <span>Experience: {job.experience_level}</span>}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: '#f3f4f6',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    whiteSpace: 'nowrap'
                  }}>
                    {getTimeAgo(job.created_at)}
                  </span>
                </div>

                <p style={{
                  margin: '1rem 0',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  maxHeight: '4.8em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {job.description}
                </p>

                {job.skills_required && job.skills_required.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                      Required Skills:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {job.skills_required.slice(0, 6).map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '0.4rem 0.8rem',
                            background: '#ffffff',
                            color: '#4A70A9',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills_required.length > 6 && (
                        <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                          +{job.skills_required.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={appliedJobs.has(job.id)}
                    style={{
                      padding: '0.75rem 2rem',
                      background: appliedJobs.has(job.id) ? '#4A70A9' : '#4A70A9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: appliedJobs.has(job.id) ? 'default' : 'pointer',
                      opacity: appliedJobs.has(job.id) ? 0.7 : 1
                    }}
                  >
                    {appliedJobs.has(job.id) ? 'Applied' : 'Apply Now'}
                  </button>
                  <button
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'transparent',
                      color: '#4A70A9',
                      border: '2px solid #4A70A9',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
