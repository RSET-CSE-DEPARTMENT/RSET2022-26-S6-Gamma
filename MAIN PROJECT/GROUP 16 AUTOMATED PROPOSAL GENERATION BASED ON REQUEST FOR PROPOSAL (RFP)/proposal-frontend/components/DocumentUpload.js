'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    --warning: #b45309;
    --warning-bg: #fef3c7;
    --danger: #c0392b;
    --danger-bg: #fdecea;
    --border: #e2ddd6;
    --shadow-sm: 0 1px 3px rgba(15,25,35,0.06), 0 1px 2px rgba(15,25,35,0.04);
    --shadow-md: 0 4px 16px rgba(15,25,35,0.08), 0 2px 6px rgba(15,25,35,0.05);
    --shadow-lg: 0 12px 40px rgba(15,25,35,0.12), 0 4px 12px rgba(15,25,35,0.06);
    --radius: 14px;
    --radius-sm: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .rfp-page {
    min-height: 100vh;
    background: var(--paper);
    background-image:
      radial-gradient(ellipse at 20% 0%, rgba(26,92,255,0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 100%, rgba(26,92,255,0.04) 0%, transparent 60%);
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    padding: 48px 20px 80px;
  }

  .rfp-wrap {
    max-width: 860px;
    margin: 0 auto;
  }

  /* ── HEADER ── */
  .rfp-header {
    margin-bottom: 40px;
  }

  .rfp-header-eyebrow {
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

  .rfp-header-eyebrow::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .rfp-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 700;
    line-height: 1.15;
    color: var(--ink);
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }

  .rfp-title span {
    color: var(--accent);
  }

  .rfp-subtitle {
    font-size: 15px;
    color: var(--ink-light);
    font-weight: 400;
    line-height: 1.6;
    max-width: 520px;
  }

  /* ── UPLOAD CARD ── */
  .upload-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 20px;
  }

  .upload-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-sm);
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--paper);
    position: relative;
    overflow: hidden;
  }

  .upload-zone:hover {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .upload-zone.has-file {
    border-color: var(--accent);
    border-style: solid;
    background: var(--accent-light);
  }

  .upload-zone input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }

  .upload-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: var(--white);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
    box-shadow: var(--shadow-sm);
  }

  .upload-zone.has-file .upload-icon-wrap {
    background: var(--accent);
    border-color: var(--accent);
  }

  .upload-icon-wrap svg {
    width: 22px;
    height: 22px;
    color: var(--ink-muted);
  }

  .upload-zone.has-file .upload-icon-wrap svg {
    color: white;
  }

  .upload-main-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 4px;
  }

  .upload-main-text strong {
    color: var(--accent);
  }

  .upload-sub-text {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .upload-filename {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
  }

  /* ── BUTTONS ── */
  .btn-row {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .btn-primary {
    flex: 1;
    padding: 13px 24px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(26,92,255,0.3);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-dark);
    box-shadow: 0 4px 16px rgba(26,92,255,0.4);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    padding: 13px 20px;
    background: transparent;
    color: var(--ink-light);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--ink-light);
    color: var(--ink);
    background: var(--paper);
  }

  /* ── SPINNER ── */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── ERROR ── */
  .error-bar {
    background: var(--danger-bg);
    border: 1px solid rgba(192,57,43,0.2);
    color: var(--danger);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── EMPTY STATE ── */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--ink-muted);
  }

  .empty-state-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    opacity: 0.3;
  }

  .empty-state p {
    font-size: 14px;
    line-height: 1.6;
  }

  /* ── RESULTS ── */
  .results-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.4s ease forwards;
  }

  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .result-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 32px;
    box-shadow: var(--shadow-sm);
  }

  .card-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .card-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 20px;
    letter-spacing: -0.01em;
  }

  /* ── INFO GRID ── */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .info-item {
    background: var(--paper);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    border: 1px solid var(--border);
  }

  .info-item-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 4px;
  }

  .info-item-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }

  /* ── METADATA ── */
  .meta-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }

  .meta-chip {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
  }

  .meta-chip-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-muted);
    margin-bottom: 6px;
  }

  .meta-chip-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
  }

  .confidence-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
  }

  .confidence-high { background: var(--success-bg); color: var(--success); }
  .confidence-medium { background: var(--warning-bg); color: var(--warning); }
  .confidence-low { background: var(--danger-bg); color: var(--danger); }

  /* ── EVALUATION ── */
  .decision-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .decision-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
  }

  .decision-badge {
    font-size: 13px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 100px;
    letter-spacing: 0.04em;
  }

  .decision-ACCEPT { background: var(--success-bg); color: var(--success); }
  .decision-REJECT { background: var(--danger-bg); color: var(--danger); }
  .decision-REVIEW { background: var(--warning-bg); color: var(--warning); }

  .proceed-banner {
    background: linear-gradient(135deg, #0a7c4e 0%, #0d9960 100%);
    border-radius: var(--radius);
    padding: 24px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 4px 20px rgba(10,124,78,0.25);
  }

  .proceed-banner-text h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18px;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
  }

  .proceed-banner-text p {
    font-size: 13px;
    color: rgba(255,255,255,0.75);
  }

  .btn-proceed {
    padding: 12px 28px;
    background: white;
    color: #0a7c4e;
    border: none;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .btn-proceed:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  }

  .confidence-complete { background: var(--success-bg); color: var(--success); }
  .confidence-partial { background: var(--warning-bg); color: var(--warning); }
  .confidence-minimal { background: var(--warning-bg); color: var(--warning); }
  .confidence-insufficient { background: var(--danger-bg); color: var(--danger); }

  .scores-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }

  .score-bar-item {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
  }

  .score-bar-item.overall {
    grid-column: 1 / -1;
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }

  .score-bar-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .score-bar-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .score-bar-item.overall .score-bar-name {
    color: rgba(255,255,255,0.6);
  }

  .score-bar-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    font-family: 'Playfair Display', Georgia, serif;
  }

  .score-bar-item.overall .score-bar-value {
    color: white;
  }

  .score-track {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .score-bar-item.overall .score-track {
    background: rgba(255,255,255,0.2);
  }

  .score-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .score-bar-item.overall .score-fill {
    background: white;
  }

  .reasoning-box {
    background: var(--paper);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--ink-light);
    line-height: 1.6;
    border-left: 3px solid var(--accent);
  }

  .reasoning-box strong {
    color: var(--ink);
    font-weight: 600;
  }

  /* ── SUMMARY ── */
  .summary-text {
    font-size: 15px;
    line-height: 1.75;
    color: var(--ink-light);
  }

  /* ── KEYWORDS ── */
  .kw-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .kw-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
    background: var(--paper);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 100px;
  }

  .kw-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .kw-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 6px 12px 6px 8px;
    font-size: 13px;
    transition: all 0.15s ease;
    cursor: default;
  }

  .kw-chip:hover {
    border-color: var(--accent);
    background: var(--accent-light);
    color: var(--accent);
  }

  .kw-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .kw-text {
    font-weight: 500;
    color: var(--ink);
    text-transform: capitalize;
  }

  .kw-chip:hover .kw-text {
    color: var(--accent);
  }

  .kw-score {
    font-size: 11px;
    color: var(--ink-muted);
    font-weight: 500;
  }

  .kw-chip:hover .kw-score {
    color: var(--accent);
    opacity: 0.7;
  }

  @media (max-width: 600px) {
    .rfp-page { padding: 24px 16px 60px; }
    .upload-card { padding: 20px; }
    .result-card { padding: 20px; }
    .scores-grid { grid-template-columns: 1fr; }
    .scores-grid .score-bar-item.overall { grid-column: 1; }
  }
`;

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState('');
  const [documentInfo, setDocumentInfo] = useState(null);
  const [summary, setSummary] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [extractedMetadata, setExtractedMetadata] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Refetch document data from Django if ?doc=ID is in URL
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && !isSuccess) {
      refetchDocument(docId);
    }
  }, []);

  const refetchDocument = async (docId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/documents/${docId}/`);
      const data = response.data;
      setDocumentInfo({
        filename: data.filename,
        upload_date: data.upload_date,
        keyword_count: data.keyword_count,
        id: data.id,
        status: data.status || 'PROCESSED',
      });
      setKeywords(data.keywords || []);
      setSummary(data.summary || '');
      // Refetch evaluation separately
      const evalResponse = await axios.get(`/api/documents/${docId}/evaluation/`).catch(() => null);
      if (evalResponse?.data) {
        setEvaluation(evalResponse.data);
      }
      setIsSuccess(true);
      // Push doc ID to URL so back navigation can refetch
      router.replace(`/?doc=${response.data.id}`, { scroll: false });
    } catch (err) {
      console.error('Failed to refetch document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    setIsSuccess(false);
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'txt'].includes(ext)) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError('');
      } else {
        alert('Invalid file type. Please select a PDF, DOCX, or TXT file.');
        e.target.value = '';
        setFile(null);
        setFileName('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { alert('Please select a file.'); return; }

    setLoading(true);
    setIsSuccess(false);
    setError('');
    setKeywords([]);
    setDocumentInfo(null);
    setSummary('');
    setEvaluation(null);
    setExtractedMetadata(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      setDocumentInfo({
        filename: response.data.filename || fileName,
        upload_date: response.data.upload_date || new Date().toISOString(),
        keyword_count: response.data.keywords?.length || 0,
        id: response.data.id,
        status: response.data.status || 'PROCESSED',
      });
      setKeywords(response.data.keywords || []);
      setSummary(response.data.summary || '');
      setEvaluation(response.data.evaluation || null);
      setExtractedMetadata(response.data.rfp_metadata || null);
      setIsSuccess(true);
      // Push doc ID to URL so back navigation can refetch
      router.replace(`/?doc=${response.data.id}`, { scroll: false });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to process document. Please check the server and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null); setFileName(''); setLoading(false);
    setError(''); setKeywords([]); setDocumentInfo(null);
    setSummary(''); setEvaluation(null); setExtractedMetadata(null);
    setIsSuccess(false);
  };

  const formatINR = (value) => {
    if (!value || value <= 0) return 'Unknown';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(value);
  };

  const hasResults = keywords.length > 0 || evaluation || extractedMetadata || summary;

  const decisionIcon = { ACCEPT: '✓', REJECT: '✕', REVIEW: '~' };
  const canProceed = evaluation && evaluation.decision === 'ACCEPT';

  return (
    <>
      <style>{styles}</style>
      <div className="rfp-page">
        <div className="rfp-wrap">

          {/* Header */}
          <header className="rfp-header">
            <div className="rfp-header-eyebrow">AI-Powered Analysis</div>
            <h1 className="rfp-title">RFP Evaluation &amp;<br />Proposal Generation</h1>
            <p className="rfp-subtitle">
              Upload any Request for Proposal document to extract key terms, generate a structured summary, and receive an automated fit assessment.
            </p>
          </header>

          {/* Upload Card */}
          <div className="upload-card">
            <form onSubmit={handleSubmit}>
              <div className={`upload-zone ${fileName ? 'has-file' : ''}`}>
                <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} />
                <div className="upload-icon-wrap">
                  {fileName ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  )}
                </div>
                {fileName ? (
                  <p className="upload-filename">{fileName}</p>
                ) : (
                  <>
                    <p className="upload-main-text"><strong>Click to upload</strong> or drag &amp; drop</p>
                    <p className="upload-sub-text">PDF, DOCX or TXT &nbsp;·&nbsp; Max 10 MB</p>
                  </>
                )}
              </div>

              <div className="btn-row">
                <button type="submit" disabled={!file || loading} className="btn-primary">
                  {loading ? (
                    <><div className="spinner" /> Analysing document…</>
                  ) : (
                    <>Upload &amp; Evaluate</>
                  )}
                </button>
                {(file || hasResults) && (
                  <button type="button" onClick={handleReset} disabled={loading} className="btn-secondary">
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="error-bar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Results */}
          {hasResults && isSuccess && (
            <div className="results-stack">

              {/* Proceed Banner */}
              {canProceed && (
                <div className="proceed-banner">
                  <div className="proceed-banner-text">
                    <h3>This RFP is a viable opportunity</h3>
                    <p>Evaluation complete — you can now generate a tailored proposal for this RFP.</p>
                  </div>
                  <button
                    className="btn-proceed"
                    onClick={() => router.push(`/proposal/${documentInfo?.id}`)}
                  >
                    Generate Proposal
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Document Info */}
              {documentInfo && (
                <div className="result-card">
                  <div className="card-label">Document Record</div>
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-item-label">Filename</div>
                      <div className="info-item-value">{documentInfo.filename}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item-label">Uploaded</div>
                      <div className="info-item-value">{new Date(documentInfo.upload_date).toLocaleString()}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item-label">Keywords Found</div>
                      <div className="info-item-value">{documentInfo.keyword_count}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item-label">Document ID</div>
                      <div className="info-item-value">#{documentInfo.id}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item-label">Status</div>
                      <div className="info-item-value">{documentInfo.status}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {extractedMetadata && (
                <div className="result-card">
                  <div className="card-label">Auto-detected RFP Details</div>
                  <div className="meta-row">
                    <div className="meta-chip">
                      <div className="meta-chip-label">Budget</div>
                      <div className="meta-chip-value">{formatINR(extractedMetadata.budget_in_inr)}</div>
                    </div>
                    <div className="meta-chip">
                      <div className="meta-chip-label">Timeline</div>
                      <div className="meta-chip-value">
                        {extractedMetadata.timeline_weeks ? `${extractedMetadata.timeline_weeks} weeks` : '—'}
                      </div>
                    </div>
                    <div className="meta-chip">
                      <div className="meta-chip-label">Team Size</div>
                      <div className="meta-chip-value">{extractedMetadata.team_size || '—'}</div>
                    </div>
                  </div>
                  {extractedMetadata.confidence && (
                    <span className={`confidence-badge confidence-${extractedMetadata.confidence}`}>
                      {extractedMetadata.confidence === 'complete' ? '● ' : 
                       extractedMetadata.confidence === 'partial' ? '◑ ' : '○ '}
                      {extractedMetadata.confidence} extraction
                    </span>
                  )}
                </div>
              )}

              {/* Evaluation */}
              {evaluation && (
                <div className="result-card">
                  <div className="card-label">Fit Evaluation</div>
                  <div className="decision-row">
                    <span className="decision-label">Decision</span>
                    <span className={`decision-badge decision-${evaluation.decision}`}>
                      {decisionIcon[evaluation.decision]} {evaluation.decision}
                    </span>
                  </div>
                  <div className="scores-grid">
                    {[
                      { name: 'Technical Fit', value: evaluation.technical_fit_score },
                      { name: 'Budget Fit', value: evaluation.budget_fit_score },
                      { name: 'Timeline Fit', value: evaluation.timeline_fit_score },
                    ].map(({ name, value }) => (
                      <div className="score-bar-item" key={name}>
                        <div className="score-bar-top">
                          <span className="score-bar-name">{name}</span>
                          <span className="score-bar-value">{value}%</span>
                        </div>
                        <div className="score-track">
                          <div className="score-fill" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="score-bar-item overall">
                      <div className="score-bar-top">
                        <span className="score-bar-name">Overall Fit</span>
                        <span className="score-bar-value">{evaluation.overall_fit_score}%</span>
                      </div>
                      <div className="score-track">
                        <div className="score-fill" style={{ width: `${evaluation.overall_fit_score}%` }} />
                      </div>
                    </div>
                  </div>
                  {evaluation.reasoning && (
                    <div className="reasoning-box">
                      <strong>Analysis: </strong>{evaluation.reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {summary && (
                <div className="result-card">
                  <div className="card-label">Document Summary</div>
                  <p className="summary-text">{summary}</p>
                </div>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="result-card">
                  <div className="kw-header">
                    <div className="card-label" style={{ margin: 0 }}>Extracted Keywords</div>
                    <span className="kw-count">{keywords.length} terms</span>
                  </div>
                  <div className="kw-grid">
                    {keywords.map((item, i) => (
                      <div className="kw-chip" key={i}>
                        <span className="kw-num">{i + 1}</span>
                        <span className="kw-text">{item.keyword}</span>
                        <span className="kw-score">
                          {item.relevance_score != null
                            ? `${(item.relevance_score * 100).toFixed(0)}%`
                            : item.score != null
                            ? `${(item.score * 100).toFixed(0)}%`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Empty state */}
          {!loading && !hasResults && !error && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>Upload an RFP document to begin automated analysis</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}