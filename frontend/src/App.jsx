import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [post, setPost] = useState("");
  const [userId, setUserId] = useState("demo_user");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzePost = async () => {
    if (!post.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        post,
        user_id: userId,
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error analyzing post.");
    } finally {
      setLoading(false);
    }
  };

  const copyRewrite = async () => {
    if (!result?.rewrite) return;
    try {
      await navigator.clipboard.writeText(result.rewrite);
      alert("Rewrite copied to clipboard.");
    } catch (error) {
      alert("Could not copy rewrite.");
    }
  };

  const moderationLevelClass = (level) => {
    switch (level) {
      case "gentle_warning":
        return "mod-banner yellow";
      case "strong_warning":
        return "mod-banner orange";
      case "flagged":
        return "mod-banner red";
      case "review":
        return "mod-banner darkred";
      default:
        return "mod-banner green";
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Clarity AI 🚀</h1>
        <p className="subtitle">
          Analyze posts for truth, tone, privacy, emotional impact, and repeated harmful behavior over time.
        </p>

        <div className="input-group">
          <label className="label">Demo User ID</label>
          <input
            className="user-input"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter a user ID"
          />
        </div>

        <textarea
          className="post-input"
          rows="6"
          placeholder="Type or paste a post..."
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />

        <button onClick={analyzePost} disabled={loading}>
          {loading ? "Analyzing with AI..." : "Analyze Post"}
        </button>

        {result && (
          <div className="results">
            {result.used_fallback && (
              <div className="fallback-banner">
                <h3>⚠️ AI Quota Reached</h3>
                <p>
                  Gemini quota was temporarily exceeded, so this result is using
                  a local fallback analysis.
                </p>
              </div>
            )}

            <div className={moderationLevelClass(result.moderation_status.level)}>
              <h3>
                🛡 Moderation Status:{" "}
                {result.moderation_status.level.replace("_", " ")}
              </h3>
              <p>{result.moderation_status.message}</p>
              <div className="mod-meta">
                <span>
                  Total points (recent window):{" "}
                  <strong>{result.moderation_status.total_points}</strong>
                </span>
                <span>
                  Tracked posts for this user:{" "}
                  <strong>{result.recent_post_count}</strong>
                </span>
              </div>
            </div>

            <div className="grid">
              <div className="card red">
                <h3>🔒 Privacy Check</h3>
                <div className="score">Score: {result.privacy.score}/10</div>
                <ul>
                  {result.privacy.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="card orange">
                <h3>⚠️ Truth Check</h3>
                <div className="score">
                  Score: {result.misinformation.score}/10
                </div>
                <div className="tag">{result.misinformation.tag}</div>
                <p>{result.misinformation.details}</p>
              </div>

              <div className="card blue">
                <h3>💬 Communication Tone</h3>
                <div className="score">Score: {result.tone.score}/10</div>
                <div className="tag">{result.tone.tag}</div>
                <p>{result.tone.details}</p>
              </div>

              <div className="card purple">
                <h3>🧠 Emotional Impact</h3>
                <div className="score">Score: {result.wellbeing.score}/10</div>
                <div className="tag">{result.wellbeing.tag}</div>
                <p>{result.wellbeing.details}</p>
              </div>
            </div>

            <div className="category-section">
              <h2>📊 Moderation Categories</h2>
              {result.moderation_categories.length === 0 ? (
                <p>No moderation categories triggered for this post.</p>
              ) : (
                <div className="category-list">
                  {result.moderation_categories.map((cat, index) => (
                    <div className="category-card" key={index}>
                      <div className="category-header">
                        <span className="category-type">{cat.type}</span>
                        <span className="category-severity">
                          Severity: {cat.severity}/10
                        </span>
                      </div>
                      <div className="category-points">
                        Weight: {cat.weight} • Points: {cat.points}
                      </div>
                      <p>{cat.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="points-summary">
              <h2>🧮 Post Moderation Points</h2>
              <p>
                This post added <strong>{result.post_points}</strong> weighted
                moderation points.
              </p>
            </div>

            <div className="rewrite">
              <h2>✨ Better Version</h2>
              <p>{result.rewrite}</p>
              <button onClick={copyRewrite}>Copy Rewrite</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;