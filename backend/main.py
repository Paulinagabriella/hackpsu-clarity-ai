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

# Demo-only in-memory storage
user_history = {}

CATEGORY_WEIGHTS = {
    "sarcasm_joking": 0.5,
    "rude_tone": 1.0,
    "aggression": 1.2,
    "harassment": 1.5,
    "hate_speech": 2.5,
    "threat": 3.0,
    "misinformation": 1.5,
    "privacy_risk": 1.5,
}

IMMEDIATE_ESCALATION_TYPES = {"hate_speech", "threat"}
IMMEDIATE_ESCALATION_SEVERITY = 9


class PostInput(BaseModel):
    post: str
    user_id: str = "demo_user"


@app.get("/")
def root():
    return {"message": "Clarity AI backend is running"}


@app.get("/history/{user_id}")
def get_user_history(user_id: str):
    return {
        "user_id": user_id,
        "history": user_history.get(user_id, [])
    }


def attach_weighted_points(categories):
    enriched = []
    total_points = 0.0

    for category in categories:
        category_type = category["type"]
        severity = int(category["severity"])
        weight = CATEGORY_WEIGHTS.get(category_type, 1.0)
        points = round(severity * weight, 1)

        item = {
            **category,
            "weight": weight,
            "points": points
        }
        enriched.append(item)
        total_points += points

    return enriched, round(total_points, 1)


def build_privacy_category(privacy_result):
    if privacy_result["score"] <= 0:
        return None

    return {
        "type": "privacy_risk",
        "severity": min(10, int(privacy_result["score"])),
        "details": "; ".join(privacy_result["details"])
    }


def get_recent_window(history, limit=10):
    return history[-limit:]


def calculate_user_moderation(recent_posts):
    total_points = round(sum(post.get("post_points", 0) for post in recent_posts), 1)

    category_breakdown = {}
    immediate_review = False
    immediate_reasons = []

    for post in recent_posts:
        for category in post.get("moderation_categories", []):
            ctype = category["type"]
            severity = int(category["severity"])
            points = float(category["points"])

            category_breakdown[ctype] = round(category_breakdown.get(ctype, 0) + points, 1)

            if ctype in IMMEDIATE_ESCALATION_TYPES and severity >= IMMEDIATE_ESCALATION_SEVERITY:
                immediate_review = True
                immediate_reasons.append(
                    f"Immediate review triggered by {ctype} with severity {severity}"
                )

    if immediate_review:
        return {
            "level": "review",
            "message": "Critical content detected. This account should be sent for human moderation review immediately.",
            "total_points": total_points,
            "category_breakdown": category_breakdown,
            "immediate_review": True,
            "immediate_reasons": immediate_reasons
        }

    if total_points >= 50:
        level = "review"
        message = "This account has accumulated severe harmful-content points and should be sent for human moderation review."
    elif total_points >= 35:
        level = "flagged"
        message = "This account has been flagged for repeated harmful behavior and should be reviewed soon."
    elif total_points >= 20:
        level = "strong_warning"
        message = "Repeated harmful behavior detected. Continued activity may lead to moderation review."
    elif total_points >= 10:
        level = "gentle_warning"
        message = "Your recent posted/commented content shows a pattern of harmful or risky behavior. Please revise your tone and content."
    else:
        level = "none"
        message = "No cumulative moderation warning at this time."

    return {
        "level": level,
        "message": message,
        "total_points": total_points,
        "category_breakdown": category_breakdown,
        "immediate_review": False,
        "immediate_reasons": []
    }


def build_analysis_result(post: str, user_id: str):
    privacy_result = build_privacy_result(post)
    ai_result = analyze_with_gemini(post)

    moderation_categories = list(ai_result.get("moderation_categories", []))

    privacy_category = build_privacy_category(privacy_result)
    if privacy_category:
        moderation_categories.append(privacy_category)

    moderation_categories, post_points = attach_weighted_points(moderation_categories)

    current_history = user_history.get(user_id, [])
    recent_posts = get_recent_window(current_history, limit=10)
    moderation_status = calculate_user_moderation(recent_posts)

    return {
        "privacy": privacy_result,
        "tone": ai_result["tone"],
        "misinformation": ai_result["misinformation"],
        "wellbeing": ai_result["wellbeing"],
        "rewrite": ai_result["rewrite"],
        "moderation_categories": moderation_categories,
        "post_points": post_points,
        "used_fallback": ai_result.get("used_fallback", False),
        "user_id": user_id,
        "recent_post_count": len(current_history),
        "moderation_status": moderation_status,
        "counted_toward_history": False
    }


@app.post("/preview")
def preview_post(data: PostInput):
    post = data.post.strip()
    user_id = data.user_id.strip() or "demo_user"
    return build_analysis_result(post, user_id)


@app.post("/commit")
def commit_post(data: PostInput):
    post = data.post.strip()
    user_id = data.user_id.strip() or "demo_user"

    if user_id not in user_history:
        user_history[user_id] = []

    preview_result = build_analysis_result(post, user_id)

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "post_text": post,
        "privacy": preview_result["privacy"],
        "tone": preview_result["tone"],
        "misinformation": preview_result["misinformation"],
        "wellbeing": preview_result["wellbeing"],
        "rewrite": preview_result["rewrite"],
        "moderation_categories": preview_result["moderation_categories"],
        "post_points": preview_result["post_points"],
        "committed": True
    }

    user_history[user_id].append(entry)

    recent_posts = get_recent_window(user_history[user_id], limit=10)
    updated_status = calculate_user_moderation(recent_posts)

    return {
        **preview_result,
        "recent_post_count": len(user_history[user_id]),
        "moderation_status": updated_status,
        "counted_toward_history": True,
        "commit_message": "This post/comment was counted toward the user's moderation history."
    }


# Optional compatibility endpoint if other parts still call /analyze
@app.post("/analyze")
def analyze_alias(data: PostInput):
    return preview_post(data)