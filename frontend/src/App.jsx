import { useState } from "react";
import axios from "axios";
import "./App.css";

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
      const response = await axios.post("http://127.0.0.1:8000/analyze", {
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
      console.error(error);
      alert("Could not copy rewrite.");
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Clarity AI 🚀</h1>
        <p className="subtitle">
          Analyze your post for truth, tone, privacy, wellbeing, and repeated behavior patterns before sharing.
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
            {result.behavior_warning && (
              <div className="warning-banner">
                <h3>🚨 Behavior Alert</h3>
                <p>{result.behavior_warning}</p>
                <span className="warning-meta">
                  Based on recent activity for user: <strong>{result.user_id}</strong>
                </span>
              </div>
            )}

            <div className="stats-bar">
              <span>Tracked posts for this user: {result.recent_post_count}</span>
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
                <div className="score">Score: {result.misinformation.score}/10</div>
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