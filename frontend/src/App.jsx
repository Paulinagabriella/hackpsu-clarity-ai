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
      alert("There was an error analyzing the post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Clarity AI</h1>
        <p className="subtitle">
          A social media safety agent that checks posts for privacy risks,
          harmful tone, misinformation risk, and wellbeing concerns before posting.
        </p>

        <textarea
          className="post-input"
          rows="8"
          placeholder="Paste or type a social media post here..."
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />

        <button className="analyze-button" onClick={analyzePost} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Post"}
        </button>

        {result && (
          <div className="results">
            <div className="card">
              <h2>{result.privacy.tag}</h2>
              <ul>
                {result.privacy.details.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>{result.tone.tag}</h2>
              <p>{result.tone.details}</p>
            </div>

            <div className="card">
              <h2>{result.misinformation.tag}</h2>
              <p>{result.misinformation.details}</p>
            </div>

            <div className="card">
              <h2>{result.wellbeing.tag}</h2>
              <p>{result.wellbeing.details}</p>
            </div>

            <div className="card rewrite-card">
              <h2>Suggested Rewrite</h2>
              <p>{result.rewrite}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;