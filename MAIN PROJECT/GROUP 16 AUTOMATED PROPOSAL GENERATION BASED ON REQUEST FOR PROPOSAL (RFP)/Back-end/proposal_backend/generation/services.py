import re
import math
import numpy as np
from collections import Counter, defaultdict

import fitz  # PyMuPDF
from docx import Document as DocxDocument
from sentence_transformers import SentenceTransformer

from django.db import transaction

from .models import (
    CompanyCapability,
    Document,
    RFPEvaluation,
    DocumentChunk,
    Keyword,
    DocumentKeyword,
)

############################################################
# LOAD EMBEDDING MODEL ONCE AT STARTUP
############################################################

_embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


############################################################
# TEXT CHUNKING
############################################################

def chunk_text(text, size=400, overlap=100):
    words = text.split()
    chunks = []
    step = size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + size])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)
    return chunks


############################################################
# DOCUMENT INDEXING — batch encode for speed
############################################################

def index_document(document, text):
    chunks = chunk_text(text)
    if not chunks:
        return

    embeddings = _embedding_model.encode(
        chunks,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
    )

    chunk_objects = [
        DocumentChunk(
            document=document,
            text=chunk,
            embedding=embeddings[i].tolist(),
        )
        for i, chunk in enumerate(chunks)
    ]
    DocumentChunk.objects.bulk_create(chunk_objects, batch_size=100)


############################################################
# RETRIEVE CHUNKS
############################################################

def retrieve_chunks(query, top_k=5):
    query_embedding = _embedding_model.encode(query, convert_to_numpy=True)
    chunks = list(DocumentChunk.objects.all().values("text", "embedding"))

    if not chunks:
        return []

    matrix = np.array([c["embedding"] for c in chunks], dtype=np.float32)
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    scores = (matrix / norms) @ query_norm

    top_indices = np.argsort(scores)[::-1][:top_k]
    return [chunks[i]["text"] for i in top_indices]


############################################################
# DOCUMENT PARSER
############################################################

class DocumentParser:

    @staticmethod
    def parse_pdf(file_obj):
        try:
            file_obj.seek(0)
            doc = fitz.open(stream=file_obj.read(), filetype="pdf")
            text = "".join(page.get_text() for page in doc)
            doc.close()
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF parsing failed: {str(e)}")

    @staticmethod
    def parse_docx(file_obj):
        try:
            file_obj.seek(0)
            doc = DocxDocument(file_obj)
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception as e:
            raise Exception(f"DOCX parsing failed: {str(e)}")

    @staticmethod
    def parse_txt(file_obj):
        try:
            file_obj.seek(0)
            return file_obj.read().decode("utf-8")
        except Exception as e:
            raise Exception(f"TXT parsing failed: {str(e)}")

    @classmethod
    def parse(cls, file_obj, file_type):
        file_type = file_type.lower()
        if file_type == "pdf":
            return cls.parse_pdf(file_obj)
        elif file_type == "docx":
            return cls.parse_docx(file_obj)
        elif file_type == "txt":
            return cls.parse_txt(file_obj)
        elif file_type == "doc":
            raise Exception(".doc format not supported. Convert to .docx")
        else:
            raise Exception(f"Unsupported format: {file_type}")


############################################################
# STOPWORDS
############################################################

STOPWORDS = {
    # Common English
    'the','and','for','are','but','not','you','all','can','had',
    'her','was','one','our','out','day','get','has','him','his',
    'how','its','may','new','now','old','see','two','who','did',
    'she','use','way','will','with','this','that','from','they',
    'been','have','here','into','more','also','some','than','then',
    'them','well','were','what','when','which','their','there',
    'these','those','would','could','should','shall','about',
    'after','being','other','over','such','very','just','like',
    'each','only','both','even','most','make','made','said','same',
    'take','come','your','time','look','does','upon','thus','http',
    # RFP document noise
    'any','per','etc','under','above','date','ref','page','para',
    'note','section','clause','part','item','must','also','herein',
    'thereof','whereby','whereas','provided','pursuant','accordance',
    'respect','regard','following','including','without','within',
    'between','through','during','before','against','along','where',
    'shall','letter','copy','annexure','appendix','schedule','form',
    'enclosed','attached','forwarded','kindly','please','dear','sir',
    'madam','regards','yours','faithfully','sincerely','hereby',
    'number','numbers','total','amount','value','rate','price',
}


############################################################
# YAKE-INSPIRED KEYWORD EXTRACTOR
# Implements the core YAKE algorithm locally:
# - Term frequency weighted by position
# - Dispersion across document
# - Co-occurrence context scoring
# - Deduplication of overlapping phrases
# Then re-ranks using sentence embeddings for semantic quality.
############################################################

class KeywordExtractor:

    def __init__(self):
        self.window_size = 3  # co-occurrence window

    def _preprocess(self, text):
        """Tokenize preserving sentence boundaries."""
        sentences = re.split(r'[.!?\n]+', text)
        result = []
        for sent in sentences:
            words = re.findall(r'\b[a-zA-Z][a-zA-Z\-]{2,}\b', sent)
            result.append([w.lower() for w in words])
        return result

    def _term_features(self, sentences):
        """
        Compute per-term features inspired by YAKE:
        - TF: raw frequency
        - TF_norm: normalized by max frequency  
        - WPos: position weight (earlier = more important)
        - WCase: uppercase bonus (acronyms like RFP, NLP)
        - Dispersion: spread across document sections
        """
        all_words = [w for sent in sentences for w in sent]
        total = len(all_words)
        if total == 0:
            return {}

        tf = Counter(all_words)
        max_tf = max(tf.values()) if tf else 1

        # Position score — words appearing earlier score higher
        first_occurrence = {}
        for i, w in enumerate(all_words):
            if w not in first_occurrence:
                first_occurrence[w] = i

        # Section dispersion — count how many chunks contain this word
        num_sections = max(1, len(sentences) // 5)
        section_size = max(1, len(all_words) // num_sections)
        section_presence = defaultdict(set)
        for i, w in enumerate(all_words):
            section_presence[w].add(i // section_size)

        features = {}
        for word in tf:
            if word in STOPWORDS or len(word) < 3:
                continue

            tf_norm = tf[word] / max_tf
            pos_score = 1.0 / (1.0 + math.log(1 + first_occurrence.get(word, total)))
            dispersion = len(section_presence[word]) / num_sections
            # Boost acronyms/technical terms
            case_bonus = 1.3 if word.upper() == word and len(word) > 1 else 1.0

            features[word] = {
                'tf': tf[word],
                'tf_norm': tf_norm,
                'pos': pos_score,
                'dispersion': dispersion,
                'case_bonus': case_bonus,
            }

        return features

    def _score_ngrams(self, sentences, features, n=3):
        """
        Score n-gram candidates (1 to n words).
        YAKE scores: lower = better (we invert to higher = better).
        """
        all_words = [w for sent in sentences for w in sent]
        candidates = {}

        for size in range(1, n + 1):
            ngram_counts = Counter()
            for i in range(len(all_words) - size + 1):
                gram = tuple(all_words[i:i + size])
                # Skip if starts/ends with stopword
                if gram[0] in STOPWORDS or gram[-1] in STOPWORDS:
                    continue
                if all(w in STOPWORDS for w in gram):
                    continue
                ngram_counts[gram] += 1

            for gram, count in ngram_counts.items():
                if count < 1:
                    continue
                phrase = ' '.join(gram)

                # Score each word in gram
                word_scores = []
                for w in gram:
                    if w in features:
                        f = features[w]
                        # YAKE word score (lower raw = more important)
                        s = (f['tf_norm'] + f['dispersion']) / (f['case_bonus'] * (f['pos'] + 0.1))
                        word_scores.append(s)
                    else:
                        word_scores.append(1.0)

                if not word_scores:
                    continue

                # Phrase score — penalize redundancy between words
                prod = 1.0
                for s in word_scores:
                    prod *= s
                sum_s = sum(word_scores) + 1e-10
                raw_score = prod / (count * (sum_s ** 2))

                # Invert: higher = more important
                final_score = 1.0 / (raw_score + 1e-10)

                # Length bonus for multi-word phrases
                length_bonus = 1.0 + (size - 1) * 0.4

                candidates[phrase] = final_score * length_bonus

        return candidates

    def _deduplicate(self, scored_candidates):
        """Remove candidates that are substrings of higher-ranked ones."""
        sorted_candidates = sorted(
            scored_candidates.items(), key=lambda x: x[1], reverse=True
        )
        kept = []
        kept_phrases = []

        for phrase, score in sorted_candidates:
            dominated = False
            for kept_phrase in kept_phrases:
                if phrase in kept_phrase or kept_phrase in phrase:
                    dominated = True
                    break
            if not dominated:
                kept.append((phrase, score))
                kept_phrases.append(phrase)

        return kept

    def _rerank_with_embeddings(self, candidates, text, top_n):
        """
        Use sentence embeddings to rerank candidates by
        semantic similarity to the document's core meaning.
        This is the key differentiator from pure YAKE —
        we combine statistical extraction with semantic ranking.
        """
        if not candidates:
            return []

        # Encode document summary + all candidates in one batch
        doc_summary = text[:3000]
        phrases = [c[0] for c in candidates[:50]]  # top 50 to rerank
        all_texts = [doc_summary] + phrases

        embeddings = _embedding_model.encode(
            all_texts,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
        )

        doc_emb = embeddings[0]
        phrase_embs = embeddings[1:]

        doc_norm = doc_emb / (np.linalg.norm(doc_emb) + 1e-10)
        norms = np.linalg.norm(phrase_embs, axis=1, keepdims=True) + 1e-10
        sim_scores = (phrase_embs / norms) @ doc_norm

        # Combine YAKE score with semantic similarity
        yake_scores = np.array([c[1] for c in candidates[:50]])
        yake_norm = yake_scores / (yake_scores.max() + 1e-10)
        sim_norm = (sim_scores - sim_scores.min()) / (sim_scores.max() - sim_scores.min() + 1e-10)

        # 40% YAKE, 60% semantic — semantic similarity is the stronger signal
        combined = 0.4 * yake_norm + 0.6 * sim_norm

        top_indices = np.argsort(combined)[::-1][:top_n]
        result = []
        for idx in top_indices:
            phrase = phrases[idx]
            score = float(combined[idx])
            result.append((phrase, round(score, 4)))

        return result

    def extract_keywords(self, text, top_n=15):
        # Use first 15,000 chars — enough for full context, not too slow
        text_sample = text[:15000]
        sentences = self._preprocess(text_sample)

        if not sentences:
            return []

        features = self._term_features(sentences)
        if not features:
            return []

        candidates = self._score_ngrams(sentences, features, n=3)
        deduped = self._deduplicate(candidates)

        # Rerank top candidates with embeddings
        final = self._rerank_with_embeddings(deduped, text_sample, top_n)
        return final


############################################################
# SUMMARIZER
############################################################

class DocumentSummarizer:

    def generate_summary(self, text, max_length=1200):
        """
        Generates summary in two parts:
        1. Structured facts (issuer, purpose, budget, EMD, deadline) via regex — fast and reliable
        2. Scope + requirements via Ollama — accurate prose from actual document content
        Falls back to pure regex if Ollama is unavailable.
        """
        clean = self._clean_text(text)
        parts = []

        # Part 1: Regex for reliable structured data
        issuer = self._extract_issuer_from_header(text)
        purpose = self._extract_purpose(clean)

        if issuer and purpose:
            parts.append(f"{issuer} has issued a Request for Proposal (RFP) seeking {purpose}.")
        elif issuer:
            parts.append(f"{issuer} has issued this Request for Proposal.")
        elif purpose:
            parts.append(f"This RFP seeks {purpose}.")

        # Part 2: Use Ollama for scope and requirements (more accurate than regex)
        ollama_scope = self._extract_scope_with_ollama(text)
        if ollama_scope:
            parts.append(f"Scope of Work: {ollama_scope}.")
        else:
            # Regex fallback
            scope = self._extract_scope(clean)
            if scope:
                parts.append(f"Scope of Work: {scope}.")

        # Part 3: Regex facts (reliable structured data)
        facts = self._extract_facts(clean)
        if facts:
            parts.append("\n" + "\n".join(f"• {f}" for f in facts))

        summary = " ".join(parts).strip()

        if len(summary) < 100:
            summary = self._semantic_fallback(text, max_length)

        return summary[:max_length]

    def _extract_scope_with_ollama(self, text):
        """Use Ollama to extract scope of work from document."""
        try:
            import requests
            # Use first 3000 chars — enough context for scope extraction
            context = text[:3000]
            prompt = f"""Read this RFP document excerpt and write ONE sentence (max 60 words) describing what work the selected vendor/agency is expected to do. Be specific. Do not include budget or deadline information.

RFP excerpt:
{context}

Write only the scope sentence, nothing else."""

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3.2",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 100}
                },
                timeout=60
            )
            if response.status_code == 200:
                result = response.json().get("response", "").strip()
                result = result.replace("**", "").strip()
                # Validate — must be a real sentence
                if len(result) > 20 and len(result) < 400:
                    return result
        except Exception:
            pass  # Silently fall back to regex
        return None

    def _clean_text(self, text):
        """Remove TOC lines, page numbers, dotted lines."""
        lines = text.split("\n")
        clean_lines = []
        for line in lines:
            line = line.strip()
            if not line or len(line) < 8:
                continue
            # Skip dotted lines
            if len(re.findall(r"\.", line)) > len(line) * 0.25:
                continue
            # Skip pure number lines
            if re.match(r"^[\d\s\|\-\_]+$", line):
                continue
            # Skip TOC entries
            if re.match(r"^[A-Za-z\s]{3,50}\.{3,}\s*\d+\s*$", line):
                continue
            clean_lines.append(line)
        return " ".join(clean_lines)

    def _is_clean(self, text):
        if not text or len(text) < 15:
            return False
        alpha = len(re.findall(r"[a-zA-Z]", text))
        return alpha > len(text) * 0.45

    def _extract_issuer_from_header(self, text):
        """
        Extract issuer from the first 10 lines of the document.
        Government RFPs almost always put the org name at the top.
        """
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        
        # Look in first 10 lines for org name
        for line in lines[:10]:
            if len(line) < 10 or len(line) > 200:
                continue
            # Must contain org indicators
            if any(w in line for w in [
                "Institute", "Ministry", "Department", "Authority",
                "Corporation", "Board", "Council", "Government",
                "Commission", "Technology", "Electronics", "NIELIT",
                "MSME", "NIC", "CDAC", "University", "Academy",
                "Centre", "Center", "Office", "Society", "Limited"
            ]):
                # Clean up the line
                line = re.sub(r'\s+', ' ', line).strip()
                if self._is_clean(line):
                    return line[:150]

        # Fallback: look for ACRONYM (Full Name) pattern in first 500 chars
        p = re.search(
            r"([A-Z]{2,10})\s*\(([A-Za-z\s,&.\-]{15,100})\)",
            text[:500]
        )
        if p:
            return f"{p.group(2).strip()} ({p.group(1)})"

        return None

    def _extract_purpose(self, text):
        """What is this RFP for?"""
        # Pattern 1: "RFP for Design/Development/Implementation of X"
        m = re.search(r"RFP\s+for\s+((?:Design|Development|Implementation|Procurement|Selection|Establishment|Supply|Provision|Empanelment|Appointment)[^.]{15,200}?)(?:\.|Table of|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            if len(r) >= 15 and r.split()[0].lower() not in {"and","or","the","a","an","to","of","in","for","such","this"}:
                return r[:200]

        # Pattern 2: "Request for Proposal for X"
        m = re.search(r"Request\s+for\s+Proposal\s+(?:\(RFP\)\s+)?(?:for|to)\s+((?:Design|Development|Implementation|Procurement|Selection|Supply|Provision)[^.]{15,200}?)(?:\.|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            if len(r) >= 15:
                return r[:200]

        # Pattern 3: "Nature of the project ... for X"
        m = re.search(r"Nature\s+of\s+the\s+project[^.]{0,80}?(?:for|to)\s+((?:Design|Development|Implementation|Procurement|Selection|Supply|Provision)[^.]{15,200}?)(?:\.|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            if len(r) >= 15:
                return r[:200]

        # Pattern 4: "invites e-bids/bids for X"
        m = re.search(r"invites?\s+(?:e-bids?|bids?)[^.]{0,80}?(?:for|to)\s+([A-Za-z][^.]{20,200}?)(?:\.|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            first = r.split()[0].lower() if r.split() else ""
            if len(r) >= 20 and first not in {"and","or","the","a","an","to","of","in","for","such","this","which"}:
                return r[:200]

        # Pattern 5: "for the selection/procurement/development of X"
        m = re.search(r"for\s+(?:the\s+)?(?:selection|appointment|procurement|development|implementation|supply|provision|empanelment|design|establishment)\s+of\s+([A-Za-z][^.]{15,200}?)(?:\.|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            first = r.split()[0].lower() if r.split() else ""
            if len(r) >= 15 and first not in {"and","or","the","a","an","to","of","in","for","such","this"}:
                return r[:200]

        # Pattern 6: "empanelment/appointment of X"
        m = re.search(r"(?:empanelment|appointment|engagement|hiring)\s+of\s+([A-Za-z][^.]{15,180}?)(?:\.|$)", text, re.IGNORECASE)
        if m and self._is_clean(m.group(1)):
            r = m.group(1).strip().rstrip(".,")
            if len(r) >= 15:
                return r[:200]

        return None

    def _extract_scope(self, text):
        """What work is expected?"""
        patterns = [
            # "Scope of Work: X" — direct label
            r"(?:scope\s+of\s+work|scope\s+of\s+services?|SoW)\s*[:\-–]\s*"
            r"([A-Za-z][^.]{30,300}?)(?:\.|$)",
            # "selected vendor/agency shall develop/provide/implement X"
            r"(?:selected\s+)?(?:vendor|bidder|agency|firm|service\s+provider)"
            r"\s+(?:shall|will|must|is\s+required\s+to)\s+"
            r"((?:develop|design|implement|provide|deploy|create|build|maintain)"
            r"[^.]{20,250}?)(?:\.|$)",
            # "the project involves/includes X"
            r"(?:the\s+)?(?:project|system|solution)\s+"
            r"(?:involves?|includes?|covers?|aims?\s+to|will)\s+"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
            # "key deliverables: X"
            r"(?:key\s+)?(?:deliverables?)\s*[:\-–]\s*"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
            # "work includes: X"
            r"work\s+(?:includes?|involves?|entails?)\s*[:\-–]?\s*"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match and self._is_clean(match.group(1)):
                result = match.group(1).strip().rstrip(".,")
                first_word = result.split()[0].lower() if result.split() else ""
                if first_word in {"and", "or", "the", "a", "an", "to", "of",
                                   "such", "this", "which", "supply", "under"}:
                    continue
                if len(result) < 20:
                    continue
                return result[:300]
        return None

    def _extract_requirements(self, text):
        """Key eligibility or technical requirements."""
        patterns = [
            r"(?:eligibility\s+criteria)\s*[:\-–]\s*"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
            r"(?:technical\s+(?:requirements?|specifications?))\s*[:\-–]\s*"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
            r"(?:bidder\s+(?:should|must|shall)\s+(?:have|possess|demonstrate))\s+"
            r"([A-Za-z][^.]{20,200}?)(?:\.|$)",
            r"(?:minimum\s+(?:experience|qualification|turnover|eligibility))"
            r"\s*[:\-–]?\s*([A-Za-z0-9][^.]{10,200}?)(?:\.|$)",
            r"(?:qualifying\s+criteria|pre.qualification)\s*[:\-–]\s*"
            r"([A-Za-z][^.]{20,250}?)(?:\.|$)",
            r"(?:the\s+bidder\s+(?:should|must|shall)\s+be)\s+"
            r"([A-Za-z][^.]{15,200}?)(?:\.|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match and self._is_clean(match.group(1)):
                result = match.group(1).strip().rstrip(".,")
                first_word = result.split()[0].lower() if result.split() else ""
                if first_word in {"and", "or", "the", "a", "an", "to", "of"}:
                    continue
                return result[:250]
        return None

    def _extract_facts(self, text):
        """Pull key structured facts."""
        facts = []

        # Deadline — must look like a real date
        deadline = re.search(
            r"(?:last\s+date|due\s+date|deadline|submission\s+(?:date|deadline)|"
            r"closing\s+date|bid\s+submission(?:\s+date)?|date\s+of\s+submission)"
            r"[^:\n]{0,60}[:\-–]?\s*"
            r"(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4}"
            r"|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
            r"[a-z]*\.?\s+\d{2,4})",
            text, re.IGNORECASE
        )
        if deadline:
            facts.append(f"Submission Deadline: {deadline.group(1).strip()}")

        # Budget — must be a real number > 0
        budget = re.search(
            r"(?:estimated\s+cost|project\s+value|contract\s+value|"
            r"total\s+(?:project\s+)?value|approximate\s+value|budget\s+(?:is|of|:))"
            r"[^:\n]{0,40}[:\-–]?\s*"
            r"(?:Rs\.?|INR|₹)?\s*([1-9][\d,]+(?:\.\d+)?"
            r"(?:\s*(?:crore|lakh|lac|thousand))?)",
            text, re.IGNORECASE
        )
        if budget:
            facts.append(f"Estimated Value: ₹{budget.group(1).strip()}")

        # EMD — must be > 0
        emd = re.search(
            r"(?:earnest\s+money(?:\s+deposit)?|EMD|bid\s+security)"
            r"[^:\n]{0,50}[:\-–]?\s*"
            r"(?:Rs\.?|INR|₹)?\s*([1-9][\d,]+(?:\.\d+)?"
            r"(?:\s*(?:crore|lakh|lac|thousand))?)",
            text, re.IGNORECASE
        )
        if emd:
            facts.append(f"EMD/Bid Security: ₹{emd.group(1).strip()}")

        # Validity — reject 0
        validity = re.search(r"(?:validity|bid validity|offer validity)[^:\n]{0,30}[:\-]?\s*([1-9]\d*\s+(?:days?|months?|weeks?))", text, re.IGNORECASE)
        if validity:
            facts.append(f"Bid Validity: {validity.group(1).strip()}")

        # Contact — look for a name after contact keywords
        

    def _semantic_fallback(self, text, max_length):
        """Use embedding similarity as fallback."""
        chunks = chunk_text(text)
        if not chunks:
            return text[:max_length]
        all_texts = [text[:5000]] + chunks
        embeddings = _embedding_model.encode(
            all_texts, batch_size=32,
            show_progress_bar=False, convert_to_numpy=True,
        )
        doc_emb = embeddings[0]
        chunk_embs = embeddings[1:]
        doc_norm = doc_emb / (np.linalg.norm(doc_emb) + 1e-10)
        norms = np.linalg.norm(chunk_embs, axis=1, keepdims=True) + 1e-10
        scores = (chunk_embs / norms) @ doc_norm
        top_indices = np.argsort(scores)[::-1][:4]
        best = [chunks[i] for i in sorted(top_indices)]
        return re.sub(r"\s+", " ", " ".join(best)).strip()[:max_length]


############################################################
# METADATA EXTRACTOR — pure regex, instant
############################################################

class RFPMetadataExtractor:

    def extract_metadata(self, text):
        budget = self._extract_budget(text)
        timeline = self._extract_timeline(text)
        team = self._extract_team(text)
        confidence = self._compute_confidence(budget, timeline, team)

        return {
            "budget_in_inr": budget,
            "timeline_weeks": timeline,
            "team_size": team,
            "confidence": confidence,
            "notes": "Extracted using YAKE + semantic NLP pipeline",
        }

    def _extract_budget(self, text):
        patterns = [
            r'(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|crore|million|thousand)?',
            r'([\d,]{6,})\s*(?:rupees?|INR)',
        ]
        candidates = []
        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                try:
                    raw = match.group(1).replace(",", "").split(".")[0]
                    value = int(raw)
                    if value > 0:
                        candidates.append(value)
                except ValueError:
                    continue

        if candidates:
            return max(candidates)

        for match in re.finditer(r'([\d,]{5,})', text):
            try:
                value = int(match.group(1).replace(",", ""))
                if 10000 <= value <= 10_000_000_000:
                    return value
            except ValueError:
                continue

        return None

    def _extract_timeline(self, text):
        match = re.search(r'(\d+)\s*(weeks?|months?|days?)', text.lower())
        if not match:
            return None
        value = int(match.group(1))
        unit = match.group(2)
        if "month" in unit:
            value *= 4
        elif "day" in unit:
            value = max(1, value // 7)
        return value

    def _extract_team(self, text):
        match = re.search(
            r'(\d+)\s*(developers?|engineers?|resources?|personnel|staff|members?)',
            text.lower()
        )
        return int(match.group(1)) if match else None

    def _compute_confidence(self, budget, timeline, team):
        """
        Confidence reflects how much metadata was successfully extracted.
        Labels updated to avoid confusion with evaluation quality.
        """
        score = sum(x is not None for x in [budget, timeline, team])
        if score == 3:
            return "complete"
        if score == 2:
            return "partial"
        if score == 1:
            return "minimal"
        return "insufficient"


############################################################
# TECHNICAL FIT CALCULATION
############################################################

def _compute_technical_fit(document, cap):
    if not cap or not cap.tech_keywords:
        return 0.0

    company_keywords = [k.lower().strip() for k in cap.tech_keywords]

    doc_keywords = [
        dk.keyword.keyword.lower().strip()
        for dk in document.keywords.all()
    ]

    # Also use raw document text for broader matching
    doc_text = (document.content_preview or "").lower()

    if not doc_keywords and not doc_text:
        return 0.0

    matched_count = 0

    for ck in company_keywords:
        matched = False

        # Strategy 1: Exact match with extracted keywords
        if ck in doc_keywords:
            matched = True

        # Strategy 2: Partial match
        if not matched:
            for dk in doc_keywords:
                if ck in dk or dk in ck:
                    matched = True
                    break

        # Strategy 3: Direct text search for multi-word phrases
        if not matched and len(ck) > 4:
            if ck in doc_text:
                matched = True

        # Strategy 4: Word overlap for long phrases
        if not matched and ' ' in ck:
            ck_words = set(ck.split())
            doc_words = set(doc_text.split())
            overlap = ck_words.intersection(doc_words)
            if len(overlap) >= max(1, len(ck_words) // 2):
                matched = True

        if matched:
            matched_count += 1

    score = (matched_count / len(company_keywords)) * 100

    # Semantic boost — blend keyword matching with embedding similarity
    try:
        if doc_keywords and len(doc_keywords) >= 3:
            company_text = " ".join(company_keywords)
            doc_kw_text = " ".join(doc_keywords[:20])

            embeddings = _embedding_model.encode(
                [company_text, doc_kw_text],
                convert_to_numpy=True,
            )

            e1 = embeddings[0] / (np.linalg.norm(embeddings[0]) + 1e-10)
            e2 = embeddings[1] / (np.linalg.norm(embeddings[1]) + 1e-10)
            semantic_sim = float(np.dot(e1, e2))

            # 70% keyword matching + 30% semantic similarity
            score = score * 0.7 + semantic_sim * 100 * 0.3
    except Exception:
        pass

    return min(100.0, round(score, 2))


############################################################
# EVALUATION ENGINE
############################################################

def evaluate_and_save(document):
    cap = CompanyCapability.objects.first()

    technical = _compute_technical_fit(document, cap)
    budget_score = _compute_budget_fit(document, cap)
    timeline_score = _compute_timeline_fit(document, cap)

    final_score = round(
        technical * 0.5 + budget_score * 0.25 + timeline_score * 0.25,
        2
    )

    if final_score >= 40:
        decision = "ACCEPT"
        status = "ACCEPTED"
    elif final_score >= 20:
        decision = "REVIEW"
        status = "REVIEW"
    else:
        decision = "REJECT"
        status = "REJECTED"

    reasoning = _build_reasoning(technical, budget_score, timeline_score, final_score, cap, document)

    evaluation, _ = RFPEvaluation.objects.update_or_create(
        document=document,
        defaults={
            "technical_fit_score": technical,
            "budget_fit_score": budget_score,
            "timeline_fit_score": timeline_score,
            "overall_fit_score": final_score,
            "decision": decision,
            "reasoning": reasoning,
        },
    )

    document.status = status
    document.processed = True
    document.save()

    return evaluation


def _compute_budget_fit(document, cap):
    """Score budget fit: is the RFP budget within company's range?"""
    if not cap or not document.rfp_budget:
        return 50  # neutral if unknown

    budget = document.rfp_budget
    if cap.min_budget <= budget <= cap.max_budget:
        return 100
    elif budget < cap.min_budget:
        # Below minimum — might not be worth it
        ratio = budget / cap.min_budget
        return round(ratio * 80, 2)
    else:
        # Above maximum — might be too large
        ratio = cap.max_budget / budget
        return round(ratio * 90, 2)


def _compute_timeline_fit(document, cap):
    """Score timeline fit: is the RFP timeline feasible?"""
    if not cap or not document.rfp_timeline_weeks:
        return 50  # neutral if unknown

    weeks = document.rfp_timeline_weeks
    if cap.min_timeline_weeks <= weeks <= cap.max_timeline_weeks:
        return 100
    elif weeks < cap.min_timeline_weeks:
        # Too tight
        ratio = weeks / cap.min_timeline_weeks
        return round(ratio * 70, 2)
    else:
        # Very long timeline — usually fine
        return 90


def _build_reasoning(technical, budget, timeline, final, cap, document):
    parts = []

    if cap is None:
        parts.append("No company capability profile found — set up CompanyCapability in Django admin for accurate scoring.")
    else:
        if technical == 0:
            parts.append("Technical fit is 0% — no matching keywords between RFP and company tech stack. Update CompanyCapability.tech_keywords in admin.")
        elif technical < 30:
            parts.append(f"Low technical fit ({technical}%) — few matching keywords with company tech stack.")
        else:
            parts.append(f"Technical fit: {technical}%.")

        if document.rfp_budget:
            parts.append(f"Budget fit: {budget}% (RFP: ₹{document.rfp_budget:,}).")
        else:
            parts.append("Budget not detected in document.")

        if document.rfp_timeline_weeks:
            parts.append(f"Timeline fit: {timeline}% ({document.rfp_timeline_weeks} weeks).")
        else:
            parts.append("Timeline not detected in document.")

    parts.append(f"Overall score: {final}%.")
    return " ".join(parts)