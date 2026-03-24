'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --ink: #0f1923;
    --ink-light: #3d4f5c;
    --ink-muted: #8a9aaa;
    --paper: #f7f5f0;
    --white: #ffffff;
    --accent: #1a5cff;
    --accent-dark: #0040d0;
    --accent-light: #e8eeff;
    --success: #0a7c4e;
    --success-bg: #e6f7f0;
    --border: #e2ddd6;
    --shadow-sm: 0 1px 3px rgba(15,25,35,0.06);
    --shadow-md: 0 4px 16px rgba(15,25,35,0.08);
    --radius: 14px;
    --radius-sm: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .proposal-page {
    min-height: 100vh;
    background: var(--paper);
    background-image:
      radial-gradient(ellipse at 20% 0%, rgba(26,92,255,0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 100%, rgba(26,92,255,0.04) 0%, transparent 60%);
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    padding: 48px 20px 80px;
  }

  .proposal-wrap {
    max-width: 900px;
    margin: 0 auto;
  }

  /* BACK BUTTON */
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 32px;
    transition: color 0.15s;
  }
  .back-btn:hover { color: var(--ink); }

  /* HEADER */
  .proposal-header {
    margin-bottom: 40px;
  }
  .proposal-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-light);
    border: 1px solid rgba(26,92,255,0.15);
    padding: 5px 12px;
    border-radius: 100px;
    margin-bottom: 16px;
  }
  .proposal-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(24px, 3.5vw, 36px);
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 8px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .proposal-subtitle {
    font-size: 14px;
    color: var(--ink-muted);
  }

  /* LOADING STATE */
  .loading-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 60px 32px;
    text-align: center;
    box-shadow: var(--shadow-sm);
  }
  .loading-icon {
    width: 56px;
    height: 56px;
    border: 3px solid var(--accent-light);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .loading-steps {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 24px;
    max-width: 360px;
    margin-left: auto;
    margin-right: auto;
  }
  .loading-step {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--ink-muted);
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    background: var(--paper);
    border: 1px solid var(--border);
    transition: all 0.3s ease;
  }
  .loading-step.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-light);
  }
  .loading-step.done {
    color: var(--success);
    border-color: var(--success);
    background: var(--success-bg);
  }
  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  /* ERROR STATE */
  .error-card {
    background: #fdecea;
    border: 1px solid rgba(192,57,43,0.2);
    border-radius: var(--radius);
    padding: 32px;
    text-align: center;
    color: #c0392b;
  }
  .error-card h3 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  /* ACTION BAR */
  .action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 24px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
    flex-wrap: wrap;
  }
  .action-bar-left {
    font-size: 13px;
    color: var(--ink-muted);
  }
  .action-bar-left strong {
    color: var(--ink);
    font-weight: 600;
  }
  .action-bar-right {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn-download {
    padding: 9px 18px;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    border: 1px solid var(--border);
    background: var(--white);
    color: var(--ink-light);
  }
  .btn-download:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-light);
  }
  .btn-regenerate {
    padding: 9px 18px;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    border: none;
    background: var(--accent);
    color: white;
    box-shadow: 0 2px 8px rgba(26,92,255,0.25);
  }
  .btn-regenerate:hover {
    background: var(--accent-dark);
    transform: translateY(-1px);
  }

  /* PROPOSAL SECTIONS */
  .proposal-sections {
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeUp 0.4s ease forwards;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .proposal-section {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 28px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }
  .section-header:hover { background: var(--paper); }

  .section-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--accent-light);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .section-icon svg {
    width: 18px;
    height: 18px;
    color: var(--accent);
  }

  .section-header-text {
    flex: 1;
  }
  .section-number {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 2px;
  }
  .section-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
  }

  .section-chevron {
    width: 20px;
    height: 20px;
    color: var(--ink-muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .section-chevron.open { transform: rotate(180deg); }

  .section-body {
    padding: 28px;
    font-size: 15px;
    line-height: 1.8;
    color: var(--ink-light);
    white-space: pre-wrap;
    border-top: none;
  }

  /* Print styles */
  @media print {
    .back-btn, .action-bar { display: none; }
    .proposal-page { padding: 0; background: white; }
    .proposal-section { box-shadow: none; border: 1px solid #ccc; }
    .section-body { display: block !important; }
  }

  @media (max-width: 600px) {
    .proposal-page { padding: 24px 16px 60px; }
    .action-bar { flex-direction: column; align-items: flex-start; }
  }
`;

const SECTIONS = [
  {
    key: 'executive_summary',
    title: 'Executive Summary',
    number: 'Section 01',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'technical_approach',
    title: 'Technical Approach & Methodology',
    number: 'Section 02',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    key: 'timeline',
    title: 'Timeline & Milestones',
    number: 'Section 03',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'compliance_checklist',
    title: 'Compliance Checklist',
    number: 'Section 04',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
];

const LOADING_STEPS = [
  'Retrieving relevant RFP sections…',
  'Analysing requirements with local embeddings…',
  'Generating Executive Summary…',
  'Writing Technical Approach…',
  'Building Timeline & Milestones…',
  'Compiling Compliance Checklist…',
  'Finalising proposal…',
];

export default function ProposalPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id;

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [openSections, setOpenSections] = useState({ executive_summary: true });

  useEffect(() => {
    if (documentId) {
      fetchProposal(false);
    }
  }, [documentId]);

  const fetchProposal = async (regenerate = false) => {
    setLoading(true);
    setError('');
    setProposal(null);
    setLoadingStep(0);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 3000);

    try {
      const response = await axios.post(
        `/api/documents/${documentId}/generate_proposal/`,
        { regenerate },
        { timeout: 600000 }
      );
      clearInterval(stepInterval);
      setProposal(response.data);
      setOpenSections({ executive_summary: true });
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.response?.data?.error || 'Failed to generate proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => window.print();

  const handleDownloadText = () => {
    if (!proposal) return;
    const content = SECTIONS.map(s =>
      `${s.title.toUpperCase()}\n${'='.repeat(s.title.length)}\n\n${proposal[s.key]}\n\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal_${proposal.filename || documentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="proposal-page">
        <div className="proposal-wrap">

          {/* Back button */}
          <button className="back-btn" onClick={() => router.push('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Evaluation
          </button>

          {/* Header */}
          <header className="proposal-header">
            <div className="proposal-eyebrow">AI-Generated Proposal</div>
            <h1 className="proposal-title">
              {proposal ? `Proposal: ${proposal.filename}` : 'Generating Your Proposal'}
            </h1>
          </header>

          {/* Loading */}
          {loading && (
            <div className="loading-card">
              <div className="loading-icon" />
              <div className="loading-title">Crafting your proposal…</div>
              <p style={{ fontSize: '14px', color: 'var(--ink-muted)' }}>
                This may take some time. Analysing the RFP and generating each section.
              </p>
              <div className="loading-steps">
                {LOADING_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`loading-step ${i === loadingStep ? 'active' : i < loadingStep ? 'done' : ''}`}
                  >
                    <div className="step-dot" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-card">
              <h3>Generation Failed</h3>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>{error}</p>
              <button className="btn-regenerate" onClick={() => fetchProposal(true)}>
                Try Again
              </button>
            </div>
          )}

          {/* Proposal Content */}
          {!loading && proposal && (
            <>
              {/* Action Bar */}
              <div className="action-bar">
                <div className="action-bar-left">
                  Proposal for <strong>{proposal.filename}</strong>
                </div>
                <div className="action-bar-right">
                  <button className="btn-download" onClick={handleDownloadText}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download TXT
                  </button>
                  <button className="btn-download" onClick={handlePrint}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print / PDF
                  </button>
                  <button className="btn-regenerate" onClick={() => fetchProposal(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div className="proposal-sections">
                {SECTIONS.map((section) => (
                  <div className="proposal-section" key={section.key}>
                    <div
                      className="section-header"
                      onClick={() => toggleSection(section.key)}
                    >
                      <div className="section-icon">{section.icon}</div>
                      <div className="section-header-text">
                        <div className="section-number">{section.number}</div>
                        <div className="section-title">{section.title}</div>
                      </div>
                      <svg
                        className={`section-chevron ${openSections[section.key] ? 'open' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {openSections[section.key] && (
                      <div className="section-body">
                        {proposal[section.key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}