"""
recruitment/cv_screening_ai.py

AI-powered CV screening with a three-tier fallback chain:
  1. Groq  — llama-3.1-8b-instant  (primary, GROQ_API_KEY)
  2. OpenRouter — deepseek/deepseek-chat  (secondary, OPENROUTER_API_KEY)
  3. Regex — rule-based extraction  (last resort, no key needed)
"""

import json
import os
import re

from django.conf import settings

from recruitment.models import Candidate, CandidateScreeningProfile


# ── Shared extraction prompt ──────────────────────────────────────────────────

def _build_prompt(cv_content, job_requirements):
    return f"""Analyze the following CV and extract structured information.

CV Content:
{cv_content}

Job Requirements:
{job_requirements}

Return ONLY valid JSON with this exact structure:
{{
    "candidate_name": "extracted full name or empty string",
    "nationality": "nationality/country of the candidate or empty string",
    "present_employer": "current or most recent employer name or empty string",
    "marital_status": "single/married/divorced/widowed or empty string",
    "date_of_birth": "YYYY-MM-DD format or null",
    "place_of_birth": "city or country of birth or empty string",
    "qualification_academic": "highest academic qualification e.g. Bachelor of Engineering or empty string",
    "qualification_professional": "professional/technical certifications or skills summary or empty string",
    "experience_local_years": null,
    "experience_overseas_years": null,
    "lang_arabic": false,
    "lang_english": false,
    "lang_others": "comma-separated other languages or empty string",
    "driving_license": "light/heavy/both/none",
    "skills": ["skill1", "skill2"],
    "years_experience": 0,
    "education": [{{"degree": "Bachelor", "field": "Computer Science", "institution": "University Name"}}],
    "previous_positions": [{{"title": "Engineer", "company": "Acme", "duration": "2 years"}}],
    "matching_score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "summary": "brief summary",
    "recommendation": "auto-shortlist/interview/reject"
}}

For fields you cannot determine from the CV use empty string or null. Return JSON only — no markdown, no explanation."""


# ── Tier 1: Groq ─────────────────────────────────────────────────────────────

def _analyze_with_groq(cv_content, job_requirements):
    """Primary: Groq llama-3.1-8b-instant."""
    api_key = getattr(settings, "GROQ_API_KEY", "") or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": _build_prompt(cv_content, job_requirements)}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000,
        )
        raw = res.choices[0].message.content
        return json.loads(raw)
    except Exception as e:
        print(f"[CV Screening] Groq failed: {e}")
        return None


# ── Tier 2: OpenRouter / DeepSeek ────────────────────────────────────────────

def _analyze_with_openrouter(cv_content, job_requirements):
    """Secondary: DeepSeek via OpenRouter."""
    import requests as _requests
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek/deepseek-chat",
            "messages": [{"role": "user", "content": _build_prompt(cv_content, job_requirements)}],
            "temperature": 0.3,
            "max_tokens": 2000,
        }
        response = _requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return None
    except Exception as e:
        print(f"[CV Screening] OpenRouter/DeepSeek failed: {e}")
        return None


# ── Tier 3: regex fallback ────────────────────────────────────────────────────

def _analyze_with_regex(cv_content, job_requirements):
    """Last resort: rule-based extraction — no AI key required."""
    try:
        from recruitment.cv_screening_fallback import mock_analyze_cv
        return mock_analyze_cv(cv_content, job_requirements)
    except Exception as e:
        print(f"[CV Screening] Regex fallback failed: {e}")
        return None


# ── Unified analyzer ──────────────────────────────────────────────────────────

def _analyze_cv(cv_content, job_requirements):
    """Try Groq → OpenRouter → regex in order, return first successful result."""
    result = _analyze_with_groq(cv_content, job_requirements)
    if result:
        result["_ai_model"] = "groq/llama-3.1-8b-instant"
        return result

    result = _analyze_with_openrouter(cv_content, job_requirements)
    if result:
        result["_ai_model"] = "openrouter/deepseek-chat"
        return result

    result = _analyze_with_regex(cv_content, job_requirements)
    if result:
        result["_ai_model"] = "regex-fallback"
        return result

    return None


# ── File text extraction ──────────────────────────────────────────────────────

def _extract_text(file_path):
    """Extract plain text from PDF, DOCX, or plain text file."""
    try:
        if file_path.endswith(".pdf"):
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "".join(page.extract_text() or "" for page in reader.pages)
        elif file_path.endswith(".docx"):
            from docx import Document
            doc = Document(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
    except Exception as e:
        print(f"[CV Screening] Text extraction failed for {file_path}: {e}")
        return ""


# ── Legacy class (kept for auto_shortlist compatibility) ──────────────────────

class CVScreeningAI:
    """Thin wrapper kept for backward compatibility with auto_shortlist callers."""

    def extract_cv_content(self, cv_file_path):
        return _extract_text(cv_file_path)

    def analyze_cv_with_deepseek(self, cv_content, job_requirements):
        return _analyze_cv(cv_content, job_requirements)

    def rank_candidates(self, candidates_analysis):
        return sorted(candidates_analysis, key=lambda x: x.get("matching_score", 0), reverse=True)

    def auto_shortlist(self, candidate_ids, job_requirements, threshold=70):
        shortlisted = []
        for candidate_id in candidate_ids:
            candidate = Candidate.objects.get(pk=candidate_id)
            if candidate.resume:
                content = _extract_text(candidate.resume.path)
                analysis = _analyze_cv(content, job_requirements)
                if analysis and analysis.get("matching_score", 0) >= threshold:
                    shortlisted.append({
                        "candidate": candidate,
                        "analysis": analysis,
                        "score": analysis.get("matching_score"),
                    })
                    candidate.is_shortlisted = True
                    candidate.screening_score = analysis.get("matching_score", 0)
                    candidate.save()
        return shortlisted


# ── Main entry point ──────────────────────────────────────────────────────────

def screen_candidate_cv(candidate_id, job_requirements):
    """
    Analyze the candidate's resume using the AI chain (Groq → OpenRouter → regex)
    and save all extracted fields to CandidateScreeningProfile.
    Only the resume is used for extraction.
    """
    candidate = Candidate.objects.get(pk=candidate_id)

    if not candidate.resume:
        return None

    resume_content = _extract_text(candidate.resume.path)
    merged = _analyze_cv(resume_content, job_requirements)

    if not merged:
        return None

    composite_score = float(merged.get("matching_score", 0))

    from datetime import datetime

    profile, _ = CandidateScreeningProfile.objects.get_or_create(candidate=candidate)
    profile.extracted_skills = merged.get("skills", [])
    profile.years_experience = merged.get("years_experience", 0)
    profile.education = merged.get("education", [])
    profile.previous_positions = merged.get("previous_positions", [])
    profile.matching_score = composite_score
    profile.matching_skills = merged.get("matching_skills", [])
    profile.missing_skills = merged.get("missing_skills", [])
    profile.summary = merged.get("summary", "")
    profile.recommendation = merged.get("recommendation", "interview")
    profile.status = "screened"
    profile.ai_model = merged.get("_ai_model", "")

    # Personal details (resume-priority merged from all docs)
    profile.extracted_nationality = merged.get("nationality", "") or ""
    profile.extracted_present_employer = merged.get("present_employer", "") or ""
    profile.extracted_marital_status = merged.get("marital_status", "") or ""
    profile.extracted_place_of_birth = merged.get("place_of_birth", "") or ""
    profile.extracted_qualification_academic = merged.get("qualification_academic", "") or ""
    profile.extracted_qualification_professional = merged.get("qualification_professional", "") or ""
    profile.extracted_lang_arabic = bool(merged.get("lang_arabic", False))
    profile.extracted_lang_english = bool(merged.get("lang_english", False))
    profile.extracted_lang_others = merged.get("lang_others", "") or ""
    profile.extracted_driving_license = merged.get("driving_license", "none") or "none"

    for attr, key in [
        ("extracted_experience_local_years", "experience_local_years"),
        ("extracted_experience_overseas_years", "experience_overseas_years"),
    ]:
        val = merged.get(key)
        if val is not None:
            try:
                setattr(profile, attr, float(val))
            except (ValueError, TypeError):
                pass

    dob_str = merged.get("date_of_birth")
    if dob_str:
        try:
            profile.extracted_dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    profile.save()
    return profile


def _job_requirements_for(candidate):
    """Build a job-requirements string from the candidate's linked recruitment."""
    rec = candidate.recruitment_id
    if rec:
        return f"{rec.job_position_id or ''} {rec.title or ''} {getattr(rec, 'description', '') or ''}".strip()
    return str(candidate.job_position_id or "")


def trigger_screening_async(candidate_id):
    """
    Run screen_candidate_cv() in a daemon thread, building the job requirements
    from the candidate's linked recruitment. Safe to call from request handlers —
    falls back through Groq → OpenRouter → regex, so it never requires an API key.
    """
    import threading

    def _run():
        try:
            candidate = Candidate.objects.select_related(
                "recruitment_id", "job_position_id"
            ).get(pk=candidate_id)
            screen_candidate_cv(candidate_id, _job_requirements_for(candidate))
        except Exception as exc:  # pragma: no cover - best effort
            print(f"[CV Screening] trigger_screening_async failed: {exc}")

    threading.Thread(target=_run, daemon=True).start()
