/* ── Emotion AI — Frontend Logic ─────────────────────────────── */

const EMOTIONS = ['angry', 'calm', 'disgust', 'fearful', 'happy', 'neutral', 'sad', 'surprise'];
const EMO_EMOJI = {
    angry: '😠', calm: '😌', disgust: '🤢', fearful: '😨',
    happy: '😄', neutral: '😐', sad: '😢', surprise: '😲'
};
const EMO_COLOR = {
    angry: '#f87171', calm: '#60a5fa', disgust: '#a78bfa', fearful: '#fbbf24',
    happy: '#34d399', neutral: '#94a3b8', sad: '#818cf8', surprise: '#fb923c'
};

/* ── DOM refs ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const videoPreview = $('video-preview');
const videoPlaceholder = $('video-placeholder');
const emotionBadge = $('emotion-badge');
const emoEmoji = $('emo-emoji');
const emoLabel = $('emo-label');
const emoConf = $('emo-conf');
const statusDot = $('status-dot');
const statusText = $('status-text');
const statusBadge = $('status-badge');

const uploadZone = $('upload-zone');
const fileInput = $('file-input');
const fileName = $('file-name');

const btnStartCam = $('btn-start-cam');
const btnRecord = $('btn-record');
const btnStop = $('btn-stop-rec');
const recIndicator = $('rec-indicator');

const qVisual = $('q-visual');
const qAudio = $('q-audio');

const btnAnalyze = $('btn-analyze');
const probContainer = $('prob-container');
const logEl = $('log');

/* ── State ──────────────────────────────────────────────────── */
let currentVideoFile = null;   // File or Blob
let camStream = null;
let recorder = null;
let isRecording = false;
let recordedChunks = [];
let predictionMode = 'fast';   // 'fast' | 'stable'

/* ── Init ───────────────────────────────────────────────────── */
(async function init() {
    buildProbBars();

    // Check server
    try {
        const r = await fetch('/');
        const d = await r.json();
        statusBadge.textContent = `● Model Loaded — ${d.features.blendshapes} blend · ${d.features.prosody} prosody`;
        statusBadge.style.color = 'var(--green)';
        log('✅ Model loaded');
    } catch {
        statusBadge.textContent = '● Server Offline';
        statusBadge.style.color = 'var(--red)';
        log('❌ Cannot reach server');
    }
})();

/* ── Probability bars ───────────────────────────────────────── */
function buildProbBars() {
    probContainer.innerHTML = EMOTIONS.map(e =>
        `<div class="prob-row" data-emo="${e}">
      <span class="name">${e}</span>
      <div class="prob-bar-bg"><div class="prob-bar" id="bar-${e}"></div></div>
      <span class="pct" id="pct-${e}">0%</span>
    </div>`
    ).join('');
}

function updateProbs(probs) {
    const maxEmo = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    EMOTIONS.forEach(e => {
        const val = (probs[e] || 0) * 100;
        const bar = $(`bar-${e}`);
        const pct = $(`pct-${e}`);
        bar.style.width = val + '%';
        bar.classList.toggle('top', e === maxEmo);
        pct.textContent = val.toFixed(1) + '%';
    });
}

/* ── Mode Toggle ────────────────────────────────────────────── */
const modeDesc = $('mode-desc');
const ensembleStatsCard = $('ensemble-stats-card');
const statsGrid = $('stats-grid');

const MODE_DESCS = {
    fast: 'Single pass — fastest inference',
    stable: 'Ensemble + TTA — multi-window averaging for robust predictions'
};

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        predictionMode = btn.dataset.mode;
        modeDesc.textContent = MODE_DESCS[predictionMode];
        log(`⚙️ Mode: ${predictionMode.toUpperCase()}`);
    });
});

/* ── Tabs ───────────────────────────────────────────────────── */
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('content-' + tab.dataset.tab).classList.add('active');
    });
});

/* ── Upload ─────────────────────────────────────────────────── */
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

function handleFile(file) {
    currentVideoFile = file;
    fileName.textContent = '✅ ' + file.name;
    uploadZone.classList.add('has-file');
    showVideoPreview(URL.createObjectURL(file));
    btnAnalyze.disabled = false;
    log('📁 Video selected: ' + file.name);
}

function showVideoPreview(src) {
    videoPreview.src = src;
    videoPreview.style.display = 'block';
    videoPreview.controls = true;
    videoPlaceholder.style.display = 'none';
}

/* ── Webcam ─────────────────────────────────────────────────── */
btnStartCam.addEventListener('click', async () => {
    try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoPreview.srcObject = camStream;
        videoPreview.style.display = 'block';
        videoPreview.muted = true;
        videoPreview.controls = false;
        videoPreview.play();
        videoPlaceholder.style.display = 'none';
        btnRecord.disabled = false;
        btnStartCam.textContent = '🟢 Camera On';
        log('📸 Camera started');
    } catch (err) {
        log('❌ Camera access denied: ' + err.message);
    }
});

btnRecord.addEventListener('click', () => {
    if (!camStream) return;
    recordedChunks = [];
    recorder = new MediaRecorder(camStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    recorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        currentVideoFile = blob;
        showVideoPreview(URL.createObjectURL(blob));
        btnAnalyze.disabled = false;
        isRecording = false;
        recIndicator.classList.remove('active');
        btnRecord.disabled = false;
        btnStop.disabled = true;
        log('✅ Recording saved (' + (blob.size / 1024).toFixed(0) + ' KB)');
    };
    recorder.start();
    isRecording = true;
    recIndicator.classList.add('active');
    btnRecord.disabled = true;
    btnStop.disabled = false;
    log('⏺ Recording started...');
});

btnStop.addEventListener('click', () => {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
});

/* ── Analyze ────────────────────────────────────────────────── */
btnAnalyze.addEventListener('click', async () => {
    if (!currentVideoFile) return;
    setProcessing(true);

    try {
        log('🔧 Extracting audio from video...');
        const audioBlob = await extractAudioFromVideo(currentVideoFile);
        log('🎵 Audio extracted — ' + (audioBlob.size / 1024).toFixed(0) + ' KB');

        const ctxVis = qVisual.value.trim();
        const ctxAud = qAudio.value.trim();
        const contextText = `Visual: ${ctxVis || 'No description'} Audio: ${ctxAud || 'No description'}`;

        const form = new FormData();
        form.append('video_file', currentVideoFile, 'video.webm');
        form.append('audio_file', audioBlob, 'audio.wav');
        form.append('context_text', contextText);

        let endpoint;
        if (predictionMode === 'stable') {
            endpoint = '/predict_stable';
            form.append('enable_tta', 'true');
            form.append('num_windows', '4');
            log('🛡️ Running stable prediction (ensemble + TTA)...');
        } else {
            endpoint = '/predict_realtime';
            log('📡 Running fast prediction...');
        }

        const resp = await fetch(endpoint, { method: 'POST', body: form });
        const data = await resp.json();

        if (data.error) {
            log('❌ ' + data.error);
            setProcessing(false);
            return;
        }

        showResult(data);

        if (predictionMode === 'stable' && data.num_passes) {
            showEnsembleStats(data);
            log(`🎯 Stable: ${data.predicted_emotion.toUpperCase()} (${(data.confidence * 100).toFixed(1)}%) — ${data.num_passes} passes, ${data.num_windows} windows, ${data.elapsed_seconds}s`);
        } else {
            ensembleStatsCard.style.display = 'none';
            log(`🎯 Prediction: ${data.predicted_emotion.toUpperCase()} (${(data.confidence * 100).toFixed(1)}%)`);
        }
    } catch (err) {
        log('❌ Error: ' + err.message);
    }

    setProcessing(false);
});

/* ── Audio extraction (browser‑side) ────────────────────────── */
async function extractAudioFromVideo(videoBlob) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const arrayBuf = await videoBlob.arrayBuffer();

    let audioBuf;
    try {
        audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    } catch {
        // fallback: silent 3s wav
        log('⚠ Audio decode failed — sending silence');
        return makeSilentWav(48000, 3.0);
    }

    // Mono, 48 kHz
    const sr = 48000;
    const offline = new OfflineAudioContext(1, audioBuf.duration * sr, sr);
    const src = offline.createBufferSource();
    src.buffer = audioBuf;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const pcm = rendered.getChannelData(0);

    return encodeWav(pcm, sr);
}

function encodeWav(samples, sr) {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);

    const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    v.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    writeStr(36, 'data');
    v.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buf], { type: 'audio/wav' });
}

function makeSilentWav(sr, dur) {
    const n = sr * dur;
    const pcm = new Float32Array(n);
    return encodeWav(pcm, sr);
}

/* ── Result display ─────────────────────────────────────────── */
function showResult(data) {
    const emo = data.predicted_emotion;
    emotionBadge.style.display = 'flex';
    emoEmoji.textContent = EMO_EMOJI[emo] || '❓';
    emoLabel.textContent = emo.toUpperCase();
    emoConf.textContent = (data.confidence * 100).toFixed(1) + '% confidence';

    const c = EMO_COLOR[emo] || '#7c5cfc';
    emotionBadge.style.borderColor = c + '60';
    emotionBadge.style.background = c + '20';

    updateProbs(data.probabilities);
}

/* ── Ensemble stats display ─────────────────────────────────── */
function showEnsembleStats(data) {
    ensembleStatsCard.style.display = 'block';
    statsGrid.innerHTML = `
      <div class="stat-item">
        <span class="stat-value">${data.num_passes}</span>
        <span class="stat-label">Forward Passes</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.num_windows}</span>
        <span class="stat-label">Video Windows</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.tta_enabled ? 'ON' : 'OFF'}</span>
        <span class="stat-label">TTA</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.elapsed_seconds}s</span>
        <span class="stat-label">Elapsed</span>
      </div>
    `;
}

/* ── Helpers ────────────────────────────────────────────────── */
function setProcessing(on) {
    btnAnalyze.disabled = on;
    btnAnalyze.classList.toggle('loading', on);
    statusDot.className = 'status-dot' + (on ? ' processing' : (currentVideoFile ? ' active' : ''));
    statusText.textContent = on ? 'Processing...' : (currentVideoFile ? 'Ready' : 'Idle');
}

function log(msg) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    logEl.innerHTML += `<div>[${ts}] ${msg}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
}
