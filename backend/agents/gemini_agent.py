import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

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
    "details": "one short explanation"
  }},
  "misinformation": {{
    "tag": "one short label",
    "details": "one short explanation"
  }},
  "wellbeing": {{
    "tag": "one short label",
    "details": "one short explanation"
  }},
  "rewrite": "a calmer, safer, more respectful rewrite"
}}

Important rules:
- Do not wrap the JSON in markdown
- Keep explanations concise
- Do not claim certainty for misinformation; describe it as risk or possible need for verification

Post:
\"\"\"{post}\"\"\"
"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    if raw.startswith("```json"):
        raw = raw.replace("```json", "").replace("```", "").strip()
    elif raw.startswith("```"):
        raw = raw.replace("```", "").strip()

    return json.loads(raw)