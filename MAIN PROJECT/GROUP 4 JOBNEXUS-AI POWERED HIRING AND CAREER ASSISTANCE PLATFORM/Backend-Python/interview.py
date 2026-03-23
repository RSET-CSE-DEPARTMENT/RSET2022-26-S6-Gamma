import os
import base64
import hashlib
import time
import fitz  # PyMuPDF package
import requests
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
import json
import logging
from typing import Optional, Tuple
from dotenv import load_dotenv
from flask_cors import CORS
from google.cloud import texttospeech

# Setup
load_dotenv() # Load environment variables from .env file
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = Flask(__name__)
# CORS configuration - IMPORTANT!
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

ASSEMBLYAI_BASE_URL = os.getenv("ASSEMBLYAI_BASE_URL", "https://api.assemblyai.com/v2").rstrip("/")
ASSEMBLYAI_API_KEY = (os.getenv("ASSEMBLYAI_API_KEY") or "").strip()
ASSEMBLYAI_POLL_INTERVAL_SECONDS = float(os.getenv("ASSEMBLYAI_POLL_INTERVAL_SECONDS", "0.8"))
ASSEMBLYAI_TRANSCRIBE_TIMEOUT_SECONDS = int(os.getenv("ASSEMBLYAI_TRANSCRIBE_TIMEOUT_SECONDS", "45"))
ASSEMBLYAI_LANGUAGE_CODE = (os.getenv("ASSEMBLYAI_LANGUAGE_CODE", "en") or "en").strip()
ASSEMBLYAI_SPEECH_MODELS = [
    model.strip()
    for model in (os.getenv("ASSEMBLYAI_SPEECH_MODELS", "universal-2") or "").split(",")
    if model.strip()
]
if not ASSEMBLYAI_SPEECH_MODELS:
    ASSEMBLYAI_SPEECH_MODELS = ["universal-2"]

# Gemini API Configuration 
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in .env file")
    genai.configure(api_key=api_key)
    
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    model = genai.GenerativeModel(model_name)
    
    log.info(f"--- Gemini API configured successfully with model '{model_name}' ---")
except Exception as e:
    log.error(f"Error configuring Gemini API: {e}")
    model = None

# Google Cloud TTS Configuration
try:
    tts_client = texttospeech.TextToSpeechClient()
    log.info("--- Google Cloud TTS client initialized ---")
except Exception as e:
    log.error(f"Error initializing Google Cloud TTS client: {e}")
    tts_client = None

# ... rest of your code remains the same ...


MAX_TEXT_LENGTH = 10000
DEFAULT_TTS_MIME = "audio/mpeg"
QUESTIONS_CACHE = {}
QUESTIONS_CACHE_TTL_SECONDS = int(os.getenv("QUESTIONS_CACHE_TTL_SECONDS", "3600"))

def _cache_get(key):
    entry = QUESTIONS_CACHE.get(key)
    if not entry:
        return None
    if time.time() - entry["ts"] > QUESTIONS_CACHE_TTL_SECONDS:
        QUESTIONS_CACHE.pop(key, None)
        return None
    return entry["value"]

def _cache_set(key, value):
    QUESTIONS_CACHE[key] = {"ts": time.time(), "value": value}

def synthesize_speech(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Generate TTS audio and return (base64_audio, mime_type)."""
    if not tts_client or not text:
        return None, None

    try:
        voice_name = os.getenv("TTS_VOICE", "en-US-Wavenet-D")
        language_code = os.getenv("TTS_LANG", "en-US")

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        audio_b64 = base64.b64encode(response.audio_content).decode("utf-8")
        return audio_b64, DEFAULT_TTS_MIME
    except Exception as e:
        log.error(f"TTS error: {e}")
        return None, None


def transcribe_audio(
    audio_base64: str,
    audio_format: Optional[str] = None,
    sample_rate_hz: Optional[int] = None,
) -> Optional[str]:
    """Transcribe base64 audio using AssemblyAI STT."""
    if not audio_base64:
        return None

    try:
        if not ASSEMBLYAI_API_KEY:
            log.error("ASSEMBLYAI_API_KEY is not configured in Backend-Python/.env")
            return None

        audio_bytes = base64.b64decode(audio_base64)
        upload_response = requests.post(
            f"{ASSEMBLYAI_BASE_URL}/upload",
            headers={
                "authorization": ASSEMBLYAI_API_KEY,
                "content-type": "application/octet-stream",
            },
            data=audio_bytes,
            timeout=30,
        )
        if upload_response.status_code >= 300:
            log.error(f"AssemblyAI upload failed ({upload_response.status_code}): {upload_response.text}")
            return None

        upload_url = (upload_response.json() or {}).get("upload_url")
        if not upload_url:
            log.error("AssemblyAI upload did not return upload_url")
            return None

        language_code = ASSEMBLYAI_LANGUAGE_CODE.strip().lower()
        if language_code.startswith("en"):
            language_code = "en"

        transcript_payload = {
            "audio_url": upload_url,
            "speech_models": ASSEMBLYAI_SPEECH_MODELS,
            "language_code": language_code,
        }
        transcript_response = requests.post(
            f"{ASSEMBLYAI_BASE_URL}/transcript",
            headers={
                "authorization": ASSEMBLYAI_API_KEY,
                "content-type": "application/json",
            },
            json=transcript_payload,
            timeout=30,
        )
        if transcript_response.status_code >= 300:
            log.error(f"AssemblyAI transcript request failed ({transcript_response.status_code}): {transcript_response.text}")
            return None

        transcript_id = (transcript_response.json() or {}).get("id")
        if not transcript_id:
            log.error("AssemblyAI transcript request did not return id")
            return None

        started = time.time()
        while (time.time() - started) <= ASSEMBLYAI_TRANSCRIBE_TIMEOUT_SECONDS:
            status_response = requests.get(
                f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}",
                headers={"authorization": ASSEMBLYAI_API_KEY},
                timeout=30,
            )
            if status_response.status_code >= 300:
                log.error(
                    f"AssemblyAI transcript polling failed ({status_response.status_code}): {status_response.text}"
                )
                return None

            payload = status_response.json() or {}
            status = str(payload.get("status") or "").lower()
            if status == "completed":
                return str(payload.get("text") or "").strip()
            if status == "error":
                error_text = str(payload.get("error") or "unknown error")
                lowered = error_text.lower()
                if (
                    "no spoken audio" in lowered
                    or "transcoding failed" in lowered
                    or "does not appear to contain audio" in lowered
                ):
                    return ""
                log.error(f"AssemblyAI transcription error: {error_text}")
                return None
            time.sleep(ASSEMBLYAI_POLL_INTERVAL_SECONDS)

        log.error("AssemblyAI transcription timed out while waiting for completion")
        return None
    except Exception as e:
        log.error(f"STT error: {e}")
        return None

def extract_text_from_pdf(pdf_file):
    """Extracts text from an uploaded PDF file."""
    try:
        doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
        if len(text) > MAX_TEXT_LENGTH:
            log.info(f"Original text length ({len(text)}) exceeds limit. Truncating.")
            text = text[:MAX_TEXT_LENGTH]
        else:
            log.info(f"Extracted text length: {len(text)} characters.")
        return text
    except Exception as e:
        log.error(f"Error extracting text from PDF: {e}")
        return ""

def extract_text_from_upload(upload):
    """Extract text from a PDF or plain-text upload."""
    filename = (upload.filename or "").lower()
    mimetype = (upload.mimetype or "").lower()

    if filename.endswith(".txt") or mimetype.startswith("text/"):
        try:
            raw = upload.read()
            text = raw.decode("utf-8", errors="ignore")
            if len(text) > MAX_TEXT_LENGTH:
                log.info(f"Original text length ({len(text)}) exceeds limit. Truncating.")
                text = text[:MAX_TEXT_LENGTH]
            else:
                log.info(f"Extracted text length: {len(text)} characters.")
            return text
        except Exception as e:
            log.error(f"Error extracting text from text upload: {e}")
            return ""

    return extract_text_from_pdf(upload)




def generate_questions(resume_text, jd_text, num_questions: int = 5):
    """Generates interview questions using the Gemini API."""
    if not model:
        return ["Error: Gemini model not initialized. Check your API key."]

    log.info("Generating questions with the Gemini API...")
    prompt = f"""
    As an expert HR manager, analyze the following resume and job description.
    Generate {num_questions} insightful interview questions designed to probe the candidate's suitability for the role.

    Return your response ONLY as a single, valid JSON-formatted list of strings. Do not add any introductory text, explanations, or closing remarks. For example: ["Question 1?", "Question 2?"]

    Job Description:
    ---
    {jd_text}
    ---
    Candidate's Resume:
    ---
    {resume_text}
    ---
    """
    
    try:
        response = model.generate_content(prompt)
        raw_text = response.text
        log.info(f"Gemini Raw Response for questions: {raw_text}")
        
        start_index = raw_text.find('[')
        end_index = raw_text.rfind(']') + 1

        if start_index != -1 and end_index != -1:
            json_str = raw_text[start_index:end_index]
            log.info(f"Attempting to parse JSON: {json_str}")
            questions = json.loads(json_str)
            return questions
        else:
            log.error("Could not find a JSON list in the raw response.")
            return ["Error: Could not find a valid list in the AI's response."]

    except json.JSONDecodeError as e:
        log.error(f"JSON Decode Error: {e}. Failed to parse the Gemini response.")
        return ["Error: The AI response was not in a valid JSON format."]
    except Exception as e:
        log.error(f"Error during question generation with Gemini: {e}")
        return ["Error: An exception occurred while generating questions."]


def evaluate_answer(resume_text, jd_text, question, answer):
    """Evaluates a candidate's answer using the Gemini API."""
    if not model:
        return {"error": "Gemini model not initialized."}

    log.info(f"Evaluating answer for question: '{question}'")
    prompt = f"""
    As a helpful and constructive interview coach, evaluate the following answer to an interview question.
    Your feedback should be personalized and address the user directly as "you". Do not refer to them as "the candidate".
    Base your evaluation on the user's resume and the provided job description.

    Provide your feedback as a single, valid JSON object with three keys: "score" (an integer out of 10), "strength" (a list of strings), and "improvement" (a list of strings).
    Do not use any markdown formatting (like asterisks).

    Example of a good response format: {{"score": 8, "strength": ["You clearly explained the technical details of the project."], "improvement": ["To make your answer stronger, try to connect it back to the specific requirements in the job description."]}}

    Job Description:
    ---
    {jd_text}
    ---
    Your Resume:
    ---
    {resume_text}
    ---
    Question:
    {question}
    ---
    Your Answer:
    {answer}
    ---
    """

    try:
        response = model.generate_content(prompt)
        raw_text = response.text
        log.info(f"Gemini Raw Response for feedback: {raw_text}")

        start_index = raw_text.find('{')
        end_index = raw_text.rfind('}') + 1

        if start_index != -1 and end_index != -1:
            json_str = raw_text[start_index:end_index]
            log.info(f"Attempting to parse JSON: {json_str}")
            feedback_obj = json.loads(json_str)
            return feedback_obj
        else:
            log.error("Could not find a JSON object in the raw response.")
            return {"error": "Could not find a valid object in the AI's response."}
            
    except json.JSONDecodeError as e:
        log.error(f"JSON Decode Error: {e}. Failed to parse the Gemini feedback.")
        return {"error": "The AI feedback was not in a valid JSON format."}
    except Exception as e:
        log.error(f"Error during answer evaluation with Gemini: {e}")
        return {"error": "An exception occurred while evaluating the answer."}

# --- Flask Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-interview', methods=['POST'])
def start_interview():
    log.info("--- Received request for /start-interview ---")
    if 'resume' not in request.files or 'job_description' not in request.files:
        return jsonify({'error': 'Both resume and job description files are required.'}), 400

    resume_file = request.files['resume']
    jd_file = request.files['job_description']

    resume_text = extract_text_from_upload(resume_file)
    jd_text = extract_text_from_upload(jd_file)

    if not resume_text or not jd_text:
        return jsonify({
            'error': 'Could not extract text from one or both uploads.',
            'details': {
                'resume_filename': resume_file.filename,
                'resume_mimetype': resume_file.mimetype,
                'resume_extracted': bool(resume_text),
                'jd_filename': jd_file.filename,
                'jd_mimetype': jd_file.mimetype,
                'jd_extracted': bool(jd_text),
            }
        }), 500

    questions = generate_questions(resume_text, jd_text, num_questions=5)
    
    app.config['resume_text'] = resume_text
    app.config['jd_text'] = jd_text
    
    return jsonify({'questions': questions})


@app.route('/generate-questions', methods=['POST'])
def generate_questions_endpoint():
    log.info("--- Received request for /generate-questions ---")
    data = request.get_json(silent=True) or {}

    resume_text = data.get("resume_text", "")
    jd_text = data.get("jd_text", "")
    num_questions = int(data.get("num_questions", 20))
    include_audio = bool(data.get("include_audio", True))

    if not resume_text or not jd_text:
        return jsonify({"success": False, "error": "resume_text and jd_text are required."}), 400

    cache_key = hashlib.sha256(
        f"{resume_text}|{jd_text}|{num_questions}|{include_audio}".encode("utf-8")
    ).hexdigest()
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({"success": True, "questions": cached, "cached": True})

    questions = generate_questions(resume_text, jd_text, num_questions=num_questions)

    results = []
    for q in questions:
        audio_b64 = None
        audio_mime = None
        if include_audio:
            audio_b64, audio_mime = synthesize_speech(q)
        results.append({
            "text": q,
            "audio_base64": audio_b64,
            "audio_mime": audio_mime,
        })

    _cache_set(cache_key, results)
    return jsonify({"success": True, "questions": results, "cached": False})


@app.route('/evaluate-answer-advanced', methods=['POST'])
def evaluate_advanced():
    log.info("--- Received request for /evaluate-answer-advanced ---")
    data = request.get_json(silent=True) or {}

    resume_text = data.get("resume_text", "")
    jd_text = data.get("jd_text", "")
    question = data.get("question", "")
    answer_text = data.get("answer_text")
    answer_audio_base64 = data.get("answer_audio_base64")
    audio_format = data.get("audio_format")
    sample_rate_hz = data.get("sample_rate_hz")
    include_audio = bool(data.get("include_audio", True))

    if not all([resume_text, jd_text, question]):
        return jsonify({"success": False, "error": "resume_text, jd_text, and question are required."}), 400

    if not answer_text and answer_audio_base64:
        answer_text = transcribe_audio(answer_audio_base64, audio_format, sample_rate_hz)

    if not answer_text:
        return jsonify({"success": False, "error": "Answer text or audio is required."}), 400

    feedback = evaluate_answer(resume_text, jd_text, question, answer_text)

    feedback_audio_b64 = None
    feedback_audio_mime = None
    if include_audio and isinstance(feedback, dict) and not feedback.get("error"):
        speech_text = f"Score {feedback.get('score', 0)} out of 10. "
        strengths = feedback.get("strength", [])
        improvements = feedback.get("improvement", [])
        if strengths:
            speech_text += "Strengths: " + " ".join(strengths) + " "
        if improvements:
            speech_text += "Improvements: " + " ".join(improvements)
        feedback_audio_b64, feedback_audio_mime = synthesize_speech(speech_text)

    return jsonify({
        "success": True,
        "answer_text": answer_text,
        "feedback": feedback,
        "feedback_audio_base64": feedback_audio_b64,
        "feedback_audio_mime": feedback_audio_mime,
    })

@app.route('/evaluate-answer', methods=['POST'])
def evaluate():
    log.info("--- Received request for /evaluate-answer ---")
    data = request.get_json()
    question = data.get('question')
    answer = data.get('answer')
    
    resume_text = app.config.get('resume_text', '')
    jd_text = app.config.get('jd_text', '')

    if not all([question, answer, resume_text, jd_text]):
        return jsonify({'error': 'Missing data for evaluation.'}), 400

    feedback = evaluate_answer(resume_text, jd_text, question, answer)
    return jsonify({'feedback': feedback})

if __name__ == '__main__':
    if not model:
        log.error("Application cannot start. Gemini model failed to initialize. Please check your API key and .env file.")
    else:
        app.run(host='0.0.0.0', port=5000)

