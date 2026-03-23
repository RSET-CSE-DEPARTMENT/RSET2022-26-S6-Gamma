# search_engine.py
import os
import time
import traceback
import urllib.parse

import requests
import numpy as np
from bs4 import BeautifulSoup
from Bio import Entrez
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ================= CONFIG =================
Entrez.email = os.environ.get("ENTREZ_EMAIL", "developer@example.com")
api_key = os.environ.get("ENTREZ_API_KEY")
if api_key:
    Entrez.api_key = api_key

PUBMED_BASE_URL = "https://pubmed.ncbi.nlm.nih.gov"

# ================= OPTIONAL SBERT =================
_use_sbert = False
_model = None
try:
    from sentence_transformers import SentenceTransformer
    _use_sbert = True
except Exception:
    _use_sbert = False


def _ensure_sbert():
    global _model, _use_sbert
    if not _use_sbert:
        return False
    if _model is None:
        try:
            print("[MiniGoogle] Loading SBERT model...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[MiniGoogle] SBERT loaded.")
        except Exception:
            traceback.print_exc()
            _use_sbert = False
            _model = None
            return False
    return True


# ================= EMBEDDINGS =================
_tfidf_vect = None


def _embed_tfidf(texts):
    global _tfidf_vect
    texts = [t or "" for t in texts]
    if _tfidf_vect is None:
        _tfidf_vect = TfidfVectorizer(stop_words="english", max_features=10000)
        X = _tfidf_vect.fit_transform(texts)
    else:
        X = _tfidf_vect.transform(texts)
    return X.toarray()


def _embed_texts(texts):
    if _ensure_sbert():
        return _model.encode(
            [t or "" for t in texts],
            convert_to_numpy=True,
            normalize_embeddings=True
        )
    return _embed_tfidf(texts)


# ================= PUBMED SEARCH =================
def search_pubmed(query, max_results=20):
    try:
        handle = Entrez.esearch(
            db="pubmed",
            term=query,
            retmax=max_results,
            sort="relevance"
        )
        record = Entrez.read(handle)
        handle.close()
        ids = record.get("IdList", [])
    except Exception as e:
        print("[MiniGoogle] PubMed search failed:", e)
        return []

    if not ids:
        return []

    try:
        handle = Entrez.efetch(
            db="pubmed",
            id=",".join(ids),
            rettype="xml",
            retmode="xml"
        )
        records = Entrez.read(handle)
        handle.close()
    except Exception as e:
        print("[MiniGoogle] PubMed fetch failed:", e)
        return []

    papers = []

    for article in records.get("PubmedArticle", []):
        try:
            med = article.get("MedlineCitation", {})
            art = med.get("Article", {})

            pmid = str(med.get("PMID", ""))

            title = art.get("ArticleTitle", "No Title")

            # -------- Authors --------
            authors = []
            for a in art.get("AuthorList", []):
                last = a.get("LastName")
                init = a.get("Initials")
                if last:
                    authors.append(f"{last} {init}" if init else last)

            # -------- Journal + Date --------
            journal = art.get("Journal", {}).get("Title", "")

            pubdate_info = (
                art.get("Journal", {})
                .get("JournalIssue", {})
                .get("PubDate", {})
            )

            year = pubdate_info.get("Year", "")
            month = pubdate_info.get("Month", "")
            day = pubdate_info.get("Day", "")

            pubdate = " ".join(filter(None, [year, month, day])) or "Unknown"

            # -------- Abstract --------
            abstract = ""
            abs_data = art.get("Abstract", {}).get("AbstractText")
            if isinstance(abs_data, list):
                abstract = " ".join(map(str, abs_data))
            elif abs_data:
                abstract = str(abs_data)

            papers.append({
                "pmid": pmid,
                "title": str(title),
                "authors": ", ".join(authors[:6]),
                "journal": journal,
                "pubdate": pubdate,
                "abstract": abstract,
                "link": f"{PUBMED_BASE_URL}/{pmid}/"
            })

        except Exception:
            traceback.print_exc()

    return papers


# ================= SUMMARY =================
def generate_summary(text, max_sentences=2):
    if not text:
        return ""
    sents = [s.strip() for s in text.split(". ") if s.strip()]
    return ". ".join(sents[:max_sentences]) + "."


# ================= RANKING =================
def _safe_year(paper):
    try:
        return int(paper.get("pubdate", "").split()[0])
    except Exception:
        return 0


def rank_results(user_query, papers, top_k=10):
    if not papers:
        return []

    corpus = [
        (p.get("title", "") + " " + p.get("abstract", "")).strip()
        for p in papers
    ]

    try:
        doc_embs = _embed_texts(corpus)
        q_emb = _embed_texts([user_query])
        sims = cosine_similarity(q_emb, doc_embs)[0]
    except Exception:
        qw = set(user_query.lower().split())
        sims = np.array([
            len(qw & set(text.lower().split()))
            for text in corpus
        ], dtype=float)

    for p, s in zip(papers, sims):
        p["score"] = float(s)
        p["summary"] = generate_summary(
            p.get("abstract") or p.get("title")
        )

    papers_sorted = sorted(
        papers,
        key=lambda x: (_safe_year(x), x.get("score", 0)),
        reverse=True
    )

    return papers_sorted[:top_k]


# ================= TRUSTED SITES =================
_TRUSTED_SITES = [
    {"name": "WHO", "search_url": "https://www.who.int/search?q={q}"},
    {"name": "CDC", "search_url": "https://search.cdc.gov/search?query={q}"},
    {"name": "NIH", "search_url": "https://www.nih.gov/search?keys={q}"},
]


def fetch_trusted_sites(query, max_sites=3, per_site=3, sleep_between=0.3):
    results = []
    headers = {"User-Agent": "MiniGoogle/1.0"}
    q = urllib.parse.quote_plus(query)

    for site in _TRUSTED_SITES:
        try:
            url = site["search_url"].format(q=q)
            r = requests.get(url, headers=headers, timeout=8)
            if r.status_code != 200:
                continue

            soup = BeautifulSoup(r.text, "html.parser")

            for a in soup.select("a")[:per_site]:
                title = a.get_text(strip=True)
                link = a.get("href")
                if title and link:
                    results.append({
                        "source": site["name"],
                        "title": title,
                        "link": link
                    })

            time.sleep(sleep_between)

        except Exception:
            continue

    return results[:max_sites * per_site]
