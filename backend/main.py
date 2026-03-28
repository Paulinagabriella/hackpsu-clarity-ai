from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.regex_checks import detect_privacy_issues
from agents.gemini_agent import analyze_with_gemini

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PostInput(BaseModel):
    post: str

@app.get("/")
def root():
    return {"message": "Clarity AI backend is running"}

@app.post("/analyze")
def analyze_post(data: PostInput):
    post = data.post.strip()

    privacy_issues = detect_privacy_issues(post)
    ai_result = analyze_with_gemini(post)

    return {
        "privacy": {
            "tag": "Privacy Risk" if privacy_issues else "No Privacy Risk Detected",
            "details": privacy_issues if privacy_issues else ["No major privacy issues detected"]
        },
        "tone": ai_result["tone"],
        "misinformation": ai_result["misinformation"],
        "wellbeing": ai_result["wellbeing"],
        "rewrite": ai_result["rewrite"]
    }