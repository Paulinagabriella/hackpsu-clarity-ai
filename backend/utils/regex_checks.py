import re


def detect_privacy_issues(text: str):
    issues = []

    phone_pattern = r'(\+?\d{1,2}[\s\-]?)?(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})'
    email_pattern = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    address_keywords = [
        "street", "st.", "avenue", "ave", "road", "rd",
        "drive", "dr", "lane", "ln", "apartment", "apt"
    ]
    location_keywords = [
        "my dorm", "my house", "my apartment", "home alone", "out of town"
    ]

    if re.search(phone_pattern, text):
        issues.append("Possible phone number detected")

    if re.search(email_pattern, text):
        issues.append("Possible email address detected")

    lowered = text.lower()

    if any(word in lowered for word in address_keywords):
        issues.append("Possible address or location oversharing detected")

    if any(word in lowered for word in location_keywords):
        issues.append("Possible personal location or safety oversharing detected")

    return issues


def build_privacy_result(text: str):
    issues = detect_privacy_issues(text)

    if not issues:
        return {
            "tag": "No Privacy Risk Detected",
            "score": 0,
            "details": ["No major privacy issues detected"]
        }

    score = 4

    if len(issues) >= 2:
        score = 7

    if any("phone number" in issue.lower() for issue in issues):
        score = max(score, 8)

    if any("address" in issue.lower() for issue in issues):
        score = max(score, 8)

    return {
        "tag": "Privacy Risk",
        "score": score,
        "details": issues
    }