const API_URL = "https://clarity-ai-backend-zv30.onrender.com";

let panel = null;
let debounceTimer = null;
let detectedUserId = "unknown_user";
let lastAnalyzedText = "";
let lastPreviewResult = null;

function getInstagramUsernameFromPage() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);

  if (
    parts.length === 1 &&
    !["accounts", "explore", "direct", "reels", "stories", "p"].includes(parts[0])
  ) {
    return parts[0];
  }

  const meta = document.querySelector('meta[property="og:title"]');
  if (meta) {
    const content = meta.getAttribute("content");
    if (content) {
      const candidate = content.split("•")[0].trim();
      if (candidate && !candidate.toLowerCase().includes("instagram")) {
        return candidate;
      }
    }
  }

  detectedUserId = "demo_user";
  return "demo_user";
}

async function getInstagramUsername() {
  const pageUser = getInstagramUsernameFromPage();
  if (pageUser) {
    detectedUserId = pageUser;
    return pageUser;
  }

  detectedUserId = "demo_user";
  return "demo_user";
}

function createPanel() {
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "clarity-ai-panel";
  panel.innerHTML = `
    <div class="clarity-header">Clarity AI</div>
    <div class="clarity-body">
      <div class="clarity-status">Waiting for text...</div>
    </div>
  `;

  document.body.appendChild(panel);
  return panel;
}

function updatePanel(html) {
  const panel = createPanel();
  const body = panel.querySelector(".clarity-body");
  body.innerHTML = html;
}

function findComposer() {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    '[role="textbox"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  return null;
}

function getComposerText(composer) {
  if (!composer) return "";
  if (composer.tagName === "TEXTAREA") return composer.value || "";
  return composer.innerText || composer.textContent || "";
}

function getRiskPercent(points) {
  const maxPoints = 50;
  return Math.min(100, Math.round((points / maxPoints) * 100));
}

function getRiskLabel(percent) {
  if (percent >= 90) return "Critical";
  if (percent >= 70) return "High";
  if (percent >= 40) return "Moderate";
  if (percent >= 15) return "Low";
  return "Minimal";
}

function getRiskClass(percent) {
  if (percent >= 90) return "critical";
  if (percent >= 70) return "high";
  if (percent >= 40) return "moderate";
  if (percent >= 15) return "low";
  return "minimal";
}

function formatCategoryName(name) {
  return String(name || "").replaceAll("_", " ");
}

function getCategoryChipClass(severity) {
  if (severity >= 9) return "critical";
  if (severity >= 7) return "high";
  if (severity >= 4) return "medium";
  return "low";
}

async function previewText(text) {
  const userId = await getInstagramUsername();

  const response = await fetch(`${API_URL}/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      post: text,
      user_id: userId
    })
  });

  if (!response.ok) {
    throw new Error(`Preview error: ${response.status}`);
  }

  return response.json();
}

async function commitText(text) {
  const userId = await getInstagramUsername();

  const response = await fetch(`${API_URL}/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      post: text,
      user_id: userId
    })
  });

  if (!response.ok) {
    throw new Error(`Commit error: ${response.status}`);
  }

  return response.json();
}

function renderResult(result, mode = "preview") {
  const moderation = result.moderation_status || {};
  const categories = result.moderation_categories || [];
  const totalPoints = moderation.total_points || 0;
  const riskPercent = getRiskPercent(totalPoints);
  const riskLabel = getRiskLabel(riskPercent);
  const riskClass = getRiskClass(riskPercent);

  const categoriesHtml = categories.length
    ? categories.map((cat) => `
        <div class="clarity-category-card">
          <div class="clarity-category-header">
            <span class="clarity-category-type">${formatCategoryName(cat.type)}</span>
            <span class="clarity-category-severity">Severity ${cat.severity}/10</span>
          </div>
          <div class="clarity-category-bar">
            <div class="clarity-category-bar-fill" style="width:${cat.severity * 10}%"></div>
          </div>
          <div class="clarity-category-points">Weight ${cat.weight} • ${cat.points} pts</div>
          <div class="clarity-category-details">${cat.details}</div>
        </div>
      `).join("")
    : `<div class="clarity-empty">No moderation categories triggered.</div>`;

  const chipsHtml = categories.length
    ? categories.map((cat) => `
        <span class="clarity-chip ${getCategoryChipClass(cat.severity)}">
          ${formatCategoryName(cat.type)}
        </span>
      `).join("")
    : "";

  const fallbackHtml = result.used_fallback
    ? `
      <div class="clarity-fallback">
        <strong>AI quota reached</strong><br>
        Using local fallback analysis.
      </div>
    `
    : "";

  const countingStatus =
    mode === "commit" || result.counted_toward_history
      ? `
        <div class="clarity-counted counted-yes">
          ✅ Counted toward user history
        </div>
      `
      : `
        <div class="clarity-counted counted-no">
          👀 Preview only — points are not counted until the user actually posts/comments
        </div>
      `;

  updatePanel(`
    ${fallbackHtml}

    <div class="clarity-top-card">
      <div class="clarity-top-row">
        <div>
          <div class="clarity-small-label">Detected User</div>
          <div class="clarity-user">${result.user_id || detectedUserId}</div>
        </div>
        <div class="clarity-risk-badge ${riskClass}">${riskLabel} Risk</div>
      </div>

      ${countingStatus}

      <div class="clarity-small-label">Moderation Status</div>
      <div class="clarity-status-line">${(moderation.level || "none").replaceAll("_", " ")}</div>
      <div class="clarity-message">${moderation.message || "No message available."}</div>

      <div class="clarity-meta-row">
        <span>Total points: <strong>${totalPoints}</strong></span>
        <span>Posts tracked: <strong>${result.recent_post_count || 0}</strong></span>
      </div>

      <div class="clarity-risk-meter">
        <div class="clarity-risk-meter-header">
          <span>Risk Meter</span>
          <span>${riskPercent}%</span>
        </div>
        <div class="clarity-risk-bar">
          <div class="clarity-risk-fill ${riskClass}" style="width:${riskPercent}%"></div>
        </div>
        <div class="clarity-risk-scale">
          <span>Min</span>
          <span>Low</span>
          <span>Mod</span>
          <span>High</span>
          <span>Crit</span>
        </div>
      </div>
    </div>

    <div class="clarity-score-grid">
      <div class="clarity-score-card">
        <div class="clarity-score-title">🔒 Privacy</div>
        <div class="clarity-score-value">${result.privacy?.score ?? 0}/10</div>
        <div class="clarity-score-tag">${result.privacy?.tag || "N/A"}</div>
      </div>

      <div class="clarity-score-card">
        <div class="clarity-score-title">⚠️ Truth</div>
        <div class="clarity-score-value">${result.misinformation?.score ?? 0}/10</div>
        <div class="clarity-score-tag">${result.misinformation?.tag || "N/A"}</div>
      </div>

      <div class="clarity-score-card">
        <div class="clarity-score-title">💬 Tone</div>
        <div class="clarity-score-value">${result.tone?.score ?? 0}/10</div>
        <div class="clarity-score-tag">${result.tone?.tag || "N/A"}</div>
      </div>

      <div class="clarity-score-card">
        <div class="clarity-score-title">🧠 Impact</div>
        <div class="clarity-score-value">${result.wellbeing?.score ?? 0}/10</div>
        <div class="clarity-score-tag">${result.wellbeing?.tag || "N/A"}</div>
      </div>
    </div>

    <div class="clarity-section-block">
      <div class="clarity-section-title">Summary</div>
      <div class="clarity-summary-item"><strong>Privacy:</strong> ${(result.privacy?.details || []).join(", ")}</div>
      <div class="clarity-summary-item"><strong>Tone:</strong> ${result.tone?.details || "N/A"}</div>
      <div class="clarity-summary-item"><strong>Misinformation:</strong> ${result.misinformation?.details || "N/A"}</div>
      <div class="clarity-summary-item"><strong>Emotional Impact:</strong> ${result.wellbeing?.details || "N/A"}</div>
    </div>

    <div class="clarity-section-block">
      <div class="clarity-section-title">Moderation Categories</div>
      <div class="clarity-chip-row">${chipsHtml || '<span class="clarity-empty">No categories</span>'}</div>
      <div class="clarity-category-list">${categoriesHtml}</div>
      <div class="clarity-post-points">This post would add <strong>${result.post_points ?? 0}</strong> weighted points.</div>
    </div>

    <div class="clarity-section-block clarity-rewrite-box">
      <div class="clarity-section-title">Better Version</div>
      <div class="clarity-rewrite">${result.rewrite || ""}</div>
    </div>
  `);
}

async function showInitialUser() {
  const userId = await getInstagramUsername();
  updatePanel(`
    <div class="clarity-top-card">
      <div class="clarity-small-label">Detected User</div>
      <div class="clarity-user">${userId}</div>
      <div class="clarity-counted counted-no">
        👀 Preview only — points are not counted until the user actually posts/comments
      </div>
      <div class="clarity-status">Waiting for text...</div>
    </div>
  `);
}

function isSubmitElement(el) {
  if (!el) return false;

  const text = (el.innerText || el.textContent || "").trim().toLowerCase();
  const role = el.getAttribute("role");
  const ariaDisabled = el.getAttribute("aria-disabled");

  // Comments use "Post"
  if (text === "post" && role === "button" && ariaDisabled !== "true") {
    return true;
  }

  // Posts use "Share"
  if (text === "share" && role === "button") {
    return true;
  }

  return false;
}

function isDiscardElement(el) {
  if (!el) return false;
  const text = (el.innerText || el.textContent || "").trim().toLowerCase();
  return text === "discard";
}

function setupClickListener() {
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("div, button");
    if (!el) return;

    if (isDiscardElement(el)) {
      lastAnalyzedText = "";
      lastPreviewResult = null;
      console.log("Clarity AI: draft discarded, nothing counted");
      return;
    }

    if (isSubmitElement(el)) {
      if (!lastAnalyzedText) return;

      try {
        console.log("Clarity AI: committing submitted content");
        const committed = await commitText(lastAnalyzedText);
        lastPreviewResult = committed;
        renderResult(committed, "commit");
        lastAnalyzedText = "";
      } catch (error) {
        console.error("Clarity commit error:", error);
        updatePanel(`
          <div class="clarity-error">
            <strong>Could not commit post/comment.</strong><br>
            ${error.message}
          </div>
        `);
      }
    }
  });
}

function attachListener() {
  const composer = findComposer();
  if (!composer) return false;

  if (composer.dataset.clarityAttached !== "true") {
    composer.dataset.clarityAttached = "true";

    composer.addEventListener("input", () => {
      const text = getComposerText(composer).trim();

      clearTimeout(debounceTimer);

      if (!text) {
        lastAnalyzedText = "";
        lastPreviewResult = null;
        showInitialUser();
        return;
      }

      debounceTimer = setTimeout(async () => {
        updatePanel(`
          <div class="clarity-top-card">
            <div class="clarity-status">Analyzing preview...</div>
          </div>
        `);

        try {
          const result = await previewText(text);
          lastAnalyzedText = text;
          lastPreviewResult = result;
          renderResult(result, "preview");
        } catch (error) {
          console.error("Clarity extension preview error:", error);
          updatePanel(`
            <div class="clarity-error">
              <strong>Could not analyze post.</strong><br>
              ${error.message}
            </div>
          `);
        }
      }, 1000);
    });
  }

  createPanel();
  showInitialUser();
  return true;
}

function boot() {
  attachListener();
  setupClickListener();

  const observer = new MutationObserver(() => {
    attachListener();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

boot();