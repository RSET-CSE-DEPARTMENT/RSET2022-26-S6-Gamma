import os
import re
import fitz  # PyMuPDF package
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from urllib.parse import urlparse

load_dotenv()

app = Flask(__name__)
CORS(app)

MAX_TEXT_LENGTH = 10000
UPLOADS_DIR = os.getenv("PHP_UPLOADS_DIR", r"C:\xampp\htdocs\JobNexus\Backend-PHP\uploads")

URL_PATTERN = re.compile(r'(https?://[^\s<>"\]\)]+|www\.[^\s<>"\]\)]+)', re.IGNORECASE)
BLOCKED_FILE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt",
    ".zip", ".rar", ".7z", ".png", ".jpg", ".jpeg", ".gif", ".webp"
}
BLOCKED_COURSE_DOMAINS = {
    "coursera.org",
    "udemy.com",
    "edx.org",
    "classcentral.com",
    "skillshare.com",
    "udacity.com",
    "pluralsight.com",
    "codecademy.com",
    "freecodecamp.org",
    "geeksforgeeks.org",
    "youtube.com",
    "youtu.be",
}
BLOCKED_COURSE_PATH_TOKENS = (
    "/course",
    "/courses",
    "/learn",
    "/learning",
    "/tutorial",
    "/tutorials",
    "/certificate",
    "/certification",
    "/bootcamp",
)
DOMAIN_LIKE_RE = re.compile(r"^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#][^\s]*)?$", re.IGNORECASE)


def looks_like_domain_url(value):
    if not value:
        return False
    token = value.strip()
    if "@" in token:
        return False
    return DOMAIN_LIKE_RE.match(token) is not None


def normalize_and_classify_url(raw_url):
    if not raw_url:
        return None

    url = raw_url.strip().rstrip(".,;)")
    if url.lower().startswith("www."):
        url = "https://" + url
    elif "://" not in url and looks_like_domain_url(url):
        url = "https://" + url

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]

    if host.endswith("linkedin.com"):
        return {"label": "LinkedIn", "url": url}
    if host.endswith("github.com"):
        return {"label": "GitHub", "url": url}

    for blocked_domain in BLOCKED_COURSE_DOMAINS:
        if host == blocked_domain or host.endswith("." + blocked_domain):
            return None

    path = (parsed.path or "").lower().strip()
    if any(token in path for token in BLOCKED_COURSE_PATH_TOKENS):
        return None
    _, ext = os.path.splitext(path)
    if ext in BLOCKED_FILE_EXTENSIONS:
        return None

    return {"label": "Website", "url": url}


def extract_text_from_pdf_path(file_path):
    try:
        doc = fitz.open(file_path)
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text[:MAX_TEXT_LENGTH] if len(text) > MAX_TEXT_LENGTH else text
    except Exception:
        return ""

def extract_links_from_annotations(file_path):
    try:
        doc = fitz.open(file_path)
        links = []
        seen = set()
        for page in doc:
            for link in page.get_links():
                uri = link.get("uri")
                if not uri:
                    continue
                normalized = normalize_and_classify_url(uri)
                if not normalized:
                    continue
                key = normalized["url"].lower()
                if key in seen:
                    continue
                seen.add(key)
                links.append(normalized)
        doc.close()
        return links
    except Exception:
        return []

def extract_links_from_text(text):
    if not text:
        return []

    matches = URL_PATTERN.findall(text)
    candidates = set(matches)
    for token in re.split(r"\s+", text):
        cleaned = token.strip().strip("()[]{}<>,;\"'")
        if cleaned:
            candidates.add(cleaned)
    if not candidates:
        return []

    seen = set()
    links = []

    for raw in candidates:
        normalized = normalize_and_classify_url(raw)
        if not normalized:
            continue
        key = normalized["url"].lower()
        if key in seen:
            continue
        seen.add(key)
        links.append(normalized)

    return links


@app.route("/extract-links", methods=["POST"])
def extract_links():
    data = request.get_json() or {}
    filename = data.get("filename")

    if not filename:
        return jsonify({"success": False, "message": "filename is required"}), 400

    safe_name = os.path.basename(filename)
    file_path = os.path.join(UPLOADS_DIR, safe_name)

    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "file not found"}), 404

    links = extract_links_from_annotations(file_path)
    if not links:
        text = extract_text_from_pdf_path(file_path)
        links = extract_links_from_text(text)
    return jsonify({"success": True, "links": links})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
