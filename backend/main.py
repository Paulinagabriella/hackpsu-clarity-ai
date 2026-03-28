from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.regex_checks import build_privacy_result
from agents.gemini_agent import analyze_with_gemini

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory history for hackathon demo purposes
# You can later replace this with MongoDB
user_history = {}


class PostInput(BaseModel):
    post: str
    user_id: str = "demo_user"


@app.get("/")
def root():
    return {"message": "Clarity AI backend is running"}


def get_behavior_warning(history):
    if not history:
        return None

    recent_posts = history[-5:]

    aggressive_count = sum(
        1 for item in recent_posts
        if item["tone"].get("score", 0) >= 7
    )

    negative_wellbeing_count = sum(
        1 for item in recent_posts
        if item["wellbeing"].get("score", 0) >= 7
    )

    privacy_count = sum(
        1 for item in recent_posts
        if item["privacy"].get("score", 0) >= 7
    )

    misinformation_count = sum(
        1 for item in recent_posts
        if item["misinformation"].get("score", 0) >= 7
    )

    avg_tone_score = sum(item["tone"].get("score", 0) for item in recent_posts) / len(recent_posts)
    avg_wellbeing_score = sum(item["wellbeing"].get("score", 0) for item in recent_posts) / len(recent_posts)

    if aggressive_count >= 3:
        return "Repeated aggressive posting detected in recent activity. Consider revising your tone before posting."

    if negative_wellbeing_count >= 3:
        return "Recent posts show repeated highly negative emotional content. Consider taking a break before posting."

    if privacy_count >= 2:
        return "Repeated privacy-risk posts detected. Be careful not to overshare sensitive information publicly."

    if misinformation_count >= 2:
        return "Repeated high-risk factual claims detected. Consider verifying claims before posting."

    if avg_tone_score >= 6.5:
        return "Your recent activity shows a pattern of escalating hostility. A calmer tone may help prevent conflict."

    if avg_wellbeing_score >= 6.5:
        return "Your recent posts suggest elevated frustration or distress. Consider pausing briefly before posting."

    return None


@app.get("/history/{user_id}")
def get_user_history(user_id: str):
    return {
        "user_id": user_id,
        "history": user_history.get(user_id, [])
    }


@app.post("/analyze")
def analyze_post(data: PostInput):
    post = data.post.strip()
    user_id = data.user_id.strip() or "demo_user"

    if user_id not in user_history:
        user_history[user_id] = []

    privacy_result = build_privacy_result(post)
    ai_result = analyze_with_gemini(post)

    result = {
        "privacy": privacy_result,
        "tone": ai_result["tone"],
        "misinformation": ai_result["misinformation"],
        "wellbeing": ai_result["wellbeing"],
        "rewrite": ai_result["rewrite"]
    }

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "post_text": post,
        "privacy": privacy_result,
        "tone": ai_result["tone"],
        "misinformation": ai_result["misinformation"],
        "wellbeing": ai_result["wellbeing"],
        "rewrite": ai_result["rewrite"]
    }

    user_history[user_id].append(entry)

    behavior_warning = get_behavior_warning(user_history[user_id])

    return {
        **result,
        "behavior_warning": behavior_warning,
        "recent_post_count": len(user_history[user_id]),
        "user_id": user_id
    }