import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


def fallback_analysis(post: str):
    lowered = post.lower()

    tone_tag = "Neutral"
    tone_score = 1
    tone_details = "No major harmful tone detected."

    wellbeing_tag = "Low Concern"
    wellbeing_score = 1
    wellbeing_details = "No major emotional harm detected."

    misinformation_tag = "Needs Review"
    misinformation_score = 3
    misinformation_details = "AI quota exceeded, so this result is using a fallback estimate."

    rewrite = post

    rude_words = ["idiot", "stupid", "dumb", "clueless", "moron"]
    if any(word in lowered for word in rude_words):
        tone_tag = "Aggressive / Harmful Tone"
        tone_score = 7
        tone_details = "This post contains insulting or aggressive language."
        wellbeing_tag = "Negative Impact"
        wellbeing_score = 6
        wellbeing_details = "This post may contribute to hostility or distress."

        rewrite = post
        for word in rude_words:
            rewrite = rewrite.replace(word, "")
            rewrite = rewrite.replace(word.capitalize(), "")

        rewrite = rewrite.replace("  ", " ").strip()
        if not rewrite:
            rewrite = "I disagree and would prefer to discuss this respectfully."

    moderation_categories = []
    if tone_score >= 7:
        moderation_categories.append({
            "type": "aggression",
            "severity": 7,
            "details": "Fallback rule detected aggressive language."
        })

    return {
        "tone": {
            "tag": tone_tag,
            "score": tone_score,
            "details": tone_details
        },
        "misinformation": {
            "tag": misinformation_tag,
            "score": misinformation_score,
            "details": misinformation_details
        },
        "wellbeing": {
            "tag": wellbeing_tag,
            "score": wellbeing_score,
            "details": wellbeing_details
        },
        "rewrite": rewrite,
        "moderation_categories": moderation_categories,
        "used_fallback": True
    }


def analyze_with_gemini(post: str):
    prompt = f"""
You are an AI social media safety and moderation assistant.

Analyze the following social media post.

Return ONLY valid JSON with this exact structure:
{{
  "tone": {{
    "tag": "short label",
    "score": 0,
    "details": "short explanation"
  }},
  "misinformation": {{
    "tag": "short label",
    "score": 0,
    "details": "short explanation"
  }},
  "wellbeing": {{
    "tag": "short label",
    "score": 0,
    "details": "short explanation"
  }},
  "rewrite": "a calmer, safer, more respectful rewrite with sensitive personal information removed",
  "moderation_categories": [
    {{
      "type": "sarcasm_joking",
      "severity": 0,
      "details": "short explanation"
    }}
  ]
}}

Rules:
- score and severity must be integers from 0 to 10
- tone.score measures harmful/aggressive communication severity
- misinformation.score measures misinformation concern severity
- wellbeing.score measures emotional distress/negative impact severity
- moderation_categories should include only categories that are relevant to the post
- allowed moderation category types:
  - sarcasm_joking
  - rude_tone
  - aggression
  - harassment
  - hate_speech
  - threat
  - misinformation
  - privacy_risk
- if none are relevant, return an empty array []
- do not claim certainty for misinformation unless obviously dangerous; use risk/verification language
- the rewrite must remove insults, threats, and exact sensitive information like addresses, phone numbers, emails, or personal location details
- output raw JSON only, no markdown

Post:
\"\"\"{post}\"\"\"
"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        if raw.startswith("```json"):
            raw = raw.replace("```json", "").replace("```", "").strip()
        elif raw.startswith("```"):
            raw = raw.replace("```", "").strip()

        parsed = json.loads(raw)

        parsed.setdefault("tone", {})
        parsed.setdefault("misinformation", {})
        parsed.setdefault("wellbeing", {})
        parsed.setdefault("rewrite", "")
        parsed.setdefault("moderation_categories", [])

        parsed["tone"].setdefault("tag", "Unknown")
        parsed["tone"].setdefault("score", 0)
        parsed["tone"].setdefault("details", "No explanation provided.")

        parsed["misinformation"].setdefault("tag", "Unknown")
        parsed["misinformation"].setdefault("score", 0)
        parsed["misinformation"].setdefault("details", "No explanation provided.")

        parsed["wellbeing"].setdefault("tag", "Unknown")
        parsed["wellbeing"].setdefault("score", 0)
        parsed["wellbeing"].setdefault("details", "No explanation provided.")

        parsed["tone"]["score"] = int(parsed["tone"]["score"])
        parsed["misinformation"]["score"] = int(parsed["misinformation"]["score"])
        parsed["wellbeing"]["score"] = int(parsed["wellbeing"]["score"])

        cleaned_categories = []
        for item in parsed["moderation_categories"]:
            category_type = item.get("type", "").strip()
            severity = int(item.get("severity", 0))
            details = item.get("details", "No details provided.")

            if category_type:
                cleaned_categories.append({
                    "type": category_type,
                    "severity": max(0, min(10, severity)),
                    "details": details
                })

        parsed["moderation_categories"] = cleaned_categories
        parsed["used_fallback"] = False
        return parsed

    except ResourceExhausted:
        return fallback_analysis(post)
    except Exception:
        return fallback_analysis(post)