import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [post, setPost] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzePost = async () => {
    if (!post.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze", {
        post,
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error analyzing post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Clarity AI 🚀</h1>
        <p className="subtitle">
          Analyze your post for truth, tone, privacy, and wellbeing before sharing.
        </p>

        <textarea
          className="post-input"
          rows="6"
          placeholder="Type or paste a post..."
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />

        <button onClick={analyzePost} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Post"}
        </button>

        {result && (
          <div className="results">
            <div className="grid">

              <div className="card red">
                <h3>🔒 Privacy Check</h3>
                <ul>
                  {result.privacy.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="card orange">
                <h3>⚠️ Truth Check</h3>
                <p>{result.misinformation.details}</p>
              </div>

              <div className="card blue">
                <h3>💬 Communication Tone</h3>
                <p>{result.tone.details}</p>
              </div>

              <div className="card purple">
                <h3>🧠 Emotional Impact</h3>
                <p>{result.wellbeing.details}</p>
              </div>

            </div>

            <div className="rewrite">
              <h2>✨ Better Version</h2>
              <p>{result.rewrite}</p>
              <button
                onClick={() => navigator.clipboard.writeText(result.rewrite)}
              >
                Copy Rewrite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;