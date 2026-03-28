import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

def analyze_with_gemini(post: str):
    prompt = f"""
You are an AI social media safety assistant.

Analyze the following social media post for:
1. harmful or aggressive communication
2. misinformation risk
3. mental wellbeing impact
4. a safer rewritten version

Return ONLY valid JSON in this exact format:
{{
  "tone": {{
    "tag": "one short label",
    "score": 0,
    "details": "one short explanation"
  }},
  "misinformation": {{
    "tag": "one short label",
    "score": 0,
    "details": "one short explanation"
  }},
  "wellbeing": {{
    "tag": "one short label",
    "score": 0,
    "details": "one short explanation"
  }},
  "rewrite": "a calmer, safer, more respectful rewrite"
}}

Scoring rules:
- score must be an integer from 0 to 10
- 0 = no meaningful concern
- 10 = severe concern

Important rules:
- Do not wrap the JSON in markdown
- Keep explanations concise
- Do not claim certainty for misinformation; describe it as risk or need for verification
- The rewrite must remove insults, threats, and sensitive personal information such as exact addresses, phone numbers, or other private details
- The rewrite should be safe for posting publicly

Post:
\"\"\"{post}\"\"\"
"""

    response = model.generate_content(prompt)

    raw = response.text.strip()

    if raw.startswith("```json"):
        raw = raw.replace("```json", "").replace("```", "").strip()
    elif raw.startswith("```"):
        raw = raw.replace("```", "").replace("```", "").strip()

    parsed = json.loads(raw)

    # Extra safety to ensure required keys exist and scores are ints
    parsed.setdefault("tone", {})
    parsed.setdefault("misinformation", {})
    parsed.setdefault("wellbeing", {})
    parsed.setdefault("rewrite", "")

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

    return parsed