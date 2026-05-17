import { analyzeContract, sampleDocuments } from "./analyzer.js";

const roleCards = [
  { id: "employee", title: "Employee", icon: "ID", sample: "employment", note: "Offer letters, NDAs, non-competes" },
  { id: "consumer", title: "Consumer", icon: "$", sample: "subscription", note: "Subscriptions, privacy policies, terms" },
  { id: "freelancer", title: "Freelancer", icon: "FR", sample: "freelance", note: "Client work, IP, payment terms" },
  { id: "vendor", title: "Vendor", icon: "VN", sample: "vendor", note: "MSAs, audits, liability exposure" },
  { id: "founder", title: "Founder", icon: "FD", sample: "freelance", note: "Commercial contracts and ownership" }
];

const STORAGE_KEY = "lexguard.session.v1";
const workflowSteps = ["onboarding", "upload", "analysis"];
const workflowHashes = {
  onboarding: "#role",
  upload: "#upload",
  analysis: "#review"
};
const reviewSections = new Set(["summary", "clauses", "negotiate"]);
const themes = new Set(["light", "dark"]);
let isApplyingHistory = false;
let persistTimer = null;

const state = {
  theme: preferredTheme(),
  step: "onboarding",
  selectedRole: "employee",
  selectedSample: "employment",
  contractType: "auto",
  contractText: sampleDocuments.employment.text,
  report: null,
  selectedFindingId: null,
  selectedClauseId: null,
  reviewSection: "summary",
  reasoningTab: "explanation",
  chatOpen: false,
  exportOpen: false,
  dragActive: false,
  fileName: "",
  uploadMessage: "",
  isAnalyzing: false,
  isExtracting: false,
  isChatting: false,
  isRevealingAnswer: false,
  config: {
    aiProvider: "local",
    model: "gemini-2.5-flash",
  documentAIEnabled: false
  },
  chatMessages: initialChatMessages()
};

const app = document.querySelector("#app");

init();

async function init() {
  restoreSavedSession();
  applyTheme();
  installWorkflowHistory();
  await hydrateConfig();
  render();
  window.addEventListener("beforeunload", persistSession);
}

async function hydrateConfig() {
  try {
    const response = await fetch("/api/config");
    state.config = await response.json();
  } catch {
    state.config.aiProvider = "local";
  }
}

function render() {
  app.innerHTML = `
    ${renderTopbar()}
    <main class="app-shell ${state.step === "analysis" ? "analysis-shell" : ""}" aria-busy="${state.isAnalyzing || state.isExtracting ? "true" : "false"}">
      ${state.step === "onboarding" ? renderOnboarding() : ""}
      ${state.step === "upload" ? renderUpload() : ""}
      ${state.step === "analysis" ? renderAnalysis() : ""}
    </main>
    ${state.step === "analysis" && state.report ? renderChat() : ""}
    ${state.exportOpen ? renderExportModal() : ""}
  `;

  bindGlobalEvents();
  scrollChatToLatest();
  persistSession();
}

function restoreSavedSession() {
  const saved = readSavedSession();
  if (!saved) return;
  const selectedRole = roleCards.some((role) => role.id === saved.selectedRole) ? saved.selectedRole : "employee";
  const roleSample = roleCards.find((role) => role.id === selectedRole)?.sample || "employment";
  const selectedSample = sampleDocuments[saved.selectedSample] ? saved.selectedSample : roleSample;

  Object.assign(state, {
    theme: themes.has(saved.theme) ? saved.theme : state.theme,
    step: isWorkflowStep(saved.step) && saved.step !== "analysis" ? saved.step : "onboarding",
    selectedRole,
    selectedSample,
    contractType: saved.contractType || "auto",
    contractText: sampleDocuments[selectedSample]?.text || sampleDocuments.employment.text,
    report: null,
    selectedFindingId: null,
    selectedClauseId: null,
    reviewSection: reviewSections.has(saved.reviewSection) ? saved.reviewSection : "summary",
    reasoningTab: saved.reasoningTab || "explanation",
    chatOpen: false,
    fileName: "",
    uploadMessage: "",
    chatMessages: initialChatMessages()
  });

  state.dragActive = false;
  state.exportOpen = false;
  state.isAnalyzing = false;
  state.isRevealingAnswer = false;
  resetChat();
}

function readSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession() {
  clearTimeout(persistTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: state.theme,
      step: state.step === "analysis" ? "upload" : state.step,
      selectedRole: state.selectedRole,
      selectedSample: sampleDocuments[state.selectedSample] ? state.selectedSample : roleCards.find((role) => role.id === state.selectedRole)?.sample || "employment",
      contractType: state.contractType,
      reviewSection: state.reviewSection,
      reasoningTab: state.reasoningTab
    }));
  } catch {
    // Browser storage can be unavailable. The app still works in memory.
  }
}

function schedulePersistSession() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistSession, 120);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
}

function preferredTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function installWorkflowHistory() {
  if (!history.replaceState || !history.pushState) return;
  window.addEventListener("popstate", handleHistoryChange);

  const targetIndex = Math.max(0, workflowSteps.indexOf(state.step));
  history.replaceState(historyPayload("onboarding"), "", historyUrlFor("onboarding"));

  if (targetIndex === 0) {
    history.pushState(historyPayload("onboarding"), "", historyUrlFor("onboarding"));
    return;
  }

  for (let index = 1; index <= targetIndex; index += 1) {
    const step = workflowSteps[index];
    history.pushState(historyPayload(step), "", historyUrlFor(step));
  }
}

function handleHistoryChange(event) {
  if (!event.state?.lexguard) {
    syncWorkflowHistory();
    return;
  }

  isApplyingHistory = true;
  state.step = isWorkflowStep(event.state.step) ? event.state.step : "onboarding";
  state.reviewSection = reviewSections.has(event.state.reviewSection) ? event.state.reviewSection : state.reviewSection;
  state.dragActive = false;
  state.exportOpen = false;
  state.isAnalyzing = false;
  if (state.step === "analysis" && !state.report) {
    state.step = "upload";
  }
  render();
  isApplyingHistory = false;
}

function goToStep(step, options = {}) {
  if (!isWorkflowStep(step)) return;
  state.step = step;
  state.dragActive = false;
  state.exportOpen = false;
  syncWorkflowHistory(options);
}

function setReviewSection(section, options = {}) {
  if (!reviewSections.has(section)) return;
  state.reviewSection = section;
  if (state.step === "analysis") {
    syncWorkflowHistory(options);
  }
}

function syncWorkflowHistory(options = {}) {
  if (isApplyingHistory || !history.replaceState || !history.pushState) return;

  const payload = historyPayload(state.step);
  const url = historyUrlFor(state.step);
  const current = history.state || {};

  if (options.replace || current.lexguard !== true) {
    history.replaceState(payload, "", url);
    return;
  }

  if (current.step !== payload.step || current.reviewSection !== payload.reviewSection) {
    history.pushState(payload, "", url);
    return;
  }

  history.replaceState(payload, "", url);
}

function historyPayload(step) {
  return {
    lexguard: true,
    step,
    reviewSection: state.reviewSection
  };
}

function historyUrlFor(step) {
  const hash = step === "analysis"
    ? `#review-${state.reviewSection}`
    : workflowHashes[step] || workflowHashes.onboarding;
  return `${location.pathname}${location.search}${hash}`;
}

function isWorkflowStep(step) {
  return workflowSteps.includes(step);
}

function renderTopbar() {
  const scoreBadge = state.report && state.step === "analysis"
    ? `<span class="risk-badge risk-${state.report.metrics.riskLevel}">${state.report.metrics.riskScore}/100 ${state.report.metrics.riskLevel} Risk</span>`
    : "";

  return `
    <header class="topbar">
      <button class="brand-button" type="button" data-action="home" aria-label="Go to onboarding">
        <img class="brand-logo" src="/lexguard-logo.png" alt="LEXGUARD">
      </button>
      ${renderStepProgress()}
      <div class="top-actions">
        <button class="theme-button ${state.theme}" type="button" data-action="toggle-theme" aria-label="${state.theme === "dark" ? "Dark mode active. Switch to light mode" : "Light mode active. Switch to dark mode"}" title="${state.theme === "dark" ? "Dark mode" : "Light mode"}">
          <span class="theme-icon" aria-hidden="true">${renderThemeIcon()}</span>
        </button>
        ${scoreBadge}
        ${state.step === "analysis" ? `<button class="ghost-button compact" type="button" data-action="open-export">Export</button>` : ""}
      </div>
    </header>
  `;
}

function renderThemeIcon() {
  if (state.theme === "dark") {
    return `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M21 14.2A7.8 7.8 0 0 1 9.8 3 8.4 8.4 0 1 0 21 14.2Z"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.9 4.9 1.4 1.4"></path>
      <path d="m17.7 17.7 1.4 1.4"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.3 17.7-1.4 1.4"></path>
      <path d="m19.1 4.9-1.4 1.4"></path>
    </svg>
  `;
}

function renderStepProgress() {
  const currentIndex = { onboarding: 1, upload: 2, analysis: 3 }[state.step] || 1;
  const steps = [
    { id: "onboarding", label: "Role" },
    { id: "upload", label: "Upload" },
    { id: "analysis", label: "Review" }
  ];

  return `
    <nav class="step-progress" aria-label="Workflow progress">
      ${steps.map((step, index) => {
        const stepIndex = index + 1;
        const status = stepIndex < currentIndex ? "complete" : stepIndex === currentIndex ? "current" : "upcoming";
        const connector = index < steps.length - 1
          ? `<span class="step-connector ${stepIndex < currentIndex ? "complete" : ""}" aria-hidden="true"></span>`
          : "";

        return `
          <span class="step-item ${status}" ${status === "current" ? "aria-current=\"step\"" : ""}>
            <span class="step-dot">${stepIndex}</span>
            <span class="step-label">${escapeHtml(step.label)}</span>
          </span>
          ${connector}
        `;
      }).join("")}
    </nav>
  `;
}

function renderOnboarding() {
  return `
    <section class="onboarding-page">
      <div class="intro-copy">
        <span class="eyebrow">Contract intelligence</span>
        <h1>Understand your contract before you sign</h1>
        <p>AI-powered risk detection, explanations, and negotiation insights.</p>
      </div>

      <div class="role-grid" role="list">
        ${roleCards.map((role) => `
          <button class="role-card ${state.selectedRole === role.id && state.selectedSample === role.sample ? "selected" : ""}" type="button" data-role="${role.id}" data-sample="${role.sample}" role="listitem">
            <span class="role-icon">${escapeHtml(role.icon)}</span>
            <strong>${escapeHtml(role.title)}</strong>
            <small>${escapeHtml(role.note)}</small>
          </button>
        `).join("")}
      </div>

      <div class="continue-bar ${state.selectedRole ? "visible" : ""}">
        <span>Reviewing as <strong>${escapeHtml(roleLabel(state.selectedRole))}</strong></span>
        <button class="primary-button" type="button" data-action="continue-upload">Continue</button>
      </div>
    </section>
  `;
}

function renderUpload() {
  const sampleOptions = Object.entries(sampleDocuments).map(([key, sample]) => `
    <option value="${key}" ${key === state.selectedSample ? "selected" : ""}>${escapeHtml(sample.title)}</option>
  `).join("");
  const customOption = state.selectedSample === "custom" ? `<option value="custom" selected>${escapeHtml(state.fileName || "Uploaded contract")}</option>` : "";

  return `
    <section class="upload-page">
      <div class="upload-card">
        <div class="upload-header">
          <span class="eyebrow">Upload</span>
          <h1>Upload your contract</h1>
          <p>Upload TXT, MD, or PDF contracts. PDFs are extracted with Google Document AI OCR.</p>
        </div>

        <div class="upload-dropzone ${state.dragActive ? "drag-active" : ""}" data-dropzone>
          <input id="fileInput" class="visually-hidden" type="file" accept=".txt,.md,.text,.pdf,text/plain,text/markdown,application/pdf">
          <span class="upload-icon">DOC</span>
          <strong>${state.fileName ? escapeHtml(state.fileName) : "Drop a TXT, MD, or PDF contract here"}</strong>
          <p id="uploadStatus" role="status" aria-live="polite">${state.uploadMessage ? escapeHtml(state.uploadMessage) : "PDF extraction uses the connected Google Document AI OCR processor."}</p>
          <button class="ghost-button upload-trigger" type="button" data-action="choose-file" ${state.isExtracting ? "disabled" : ""}>${state.isExtracting ? "Extracting..." : "Choose File"}</button>
        </div>

        <div class="divider"><span>OR</span></div>

        <label class="field-stack">
          <span>Use demo contract</span>
          <select id="sampleSelect">
            ${customOption}
            ${sampleOptions}
          </select>
        </label>

        <label class="field-stack">
          <span>Paste contract text</span>
          <textarea id="contractText" aria-label="Contract text" aria-describedby="uploadStatus" placeholder="Paste agreement, terms, privacy policy, NDA, or MSA text here...">${escapeHtml(state.contractText)}</textarea>
        </label>

        <div class="upload-actions">
          <button class="ghost-button" type="button" data-action="back-onboarding">Back</button>
          <button class="primary-button" type="button" data-action="analyze" ${state.isAnalyzing || state.isExtracting ? "disabled" : ""}>${state.isAnalyzing ? "Analyzing..." : "Analyze Contract"}</button>
        </div>

        ${state.isAnalyzing ? renderAnalysisLoader() : ""}
      </div>
    </section>
  `;
}

function renderAnalysisLoader() {
  return `
    <section class="analysis-loader" role="status" aria-live="polite" aria-label="Analyzing contract">
      <div class="loader-orbit" aria-hidden="true">
        <span></span>
      </div>
      <div class="loader-copy">
        <strong>Analyzing contract</strong>
        <p>Reading clauses, scoring risks, and preparing the report.</p>
      </div>
      <div class="loader-track" aria-hidden="true"><span></span></div>
    </section>
  `;
}

function renderAnalysis() {
  if (!state.report) {
    return `<section class="empty-analysis"><button class="primary-button" data-action="continue-upload">Upload a contract</button></section>`;
  }

  const report = state.report;
  return `
    <section class="review-page">
      ${renderReviewHero(report)}
      ${renderReviewNav()}
      ${state.reviewSection === "summary" ? renderSummarySection(report) : ""}
      ${state.reviewSection === "clauses" ? renderClauseReviewSection(report) : ""}
      ${state.reviewSection === "negotiate" ? renderNegotiationSection(report) : ""}
    </section>
  `;
}

function renderReviewHero(report) {
  const score = clampNumber(report.metrics.riskScore, 0, 100);
  const level = report.metrics.riskLevel;
  const totalFindings = report.metrics.totalFindings || report.findings.length;
  const cuadDetected = report.cuadReview?.detectedCategoryCount || 0;
  const cuadTotal = report.cuadReview?.categoryCount || 41;

  return `
    <section class="review-hero risk-${escapeAttr(level)}">
      <div class="hero-score">
        <span class="eyebrow">Review complete</span>
        <div class="hero-score-number">
          <strong>${score}</strong>
          <span>/100</span>
        </div>
        <h1>${escapeHtml(level)} Risk</h1>
      </div>

      <div class="hero-brief">
        <p>${escapeHtml(report.summary)}</p>
        <div class="hero-stat-grid">
          <span>
            <small>Findings</small>
            <strong>${totalFindings}</strong>
          </span>
          <span>
            <small>High priority</small>
            <strong>${report.metrics.highRiskFindings}</strong>
          </span>
          <span>
            <small>Confidence</small>
            <strong>${report.metrics.averageConfidence || 0}%</strong>
          </span>
          <span>
            <small>CUAD</small>
            <strong>${cuadDetected}/${cuadTotal}</strong>
          </span>
        </div>
      </div>

      <div class="hero-risk-track" aria-hidden="true">
        <span style="width: ${score}%"></span>
      </div>
    </section>
  `;
}

function renderReviewNav() {
  const sections = [
    ["summary", "Summary"],
    ["clauses", "Clause Review"],
    ["negotiate", "Negotiate"]
  ];

  return `
    <nav class="review-nav" aria-label="Review sections">
      ${sections.map(([id, label]) => `
        <button class="${state.reviewSection === id ? "active" : ""}" type="button" data-review-section="${id}">${label}</button>
      `).join("")}
    </nav>
  `;
}

function renderSummarySection(report) {
  return `
    <section class="review-section summary-section">
      <div class="summary-grid">
        ${renderSummaryCard(report.metrics.highRiskFindings, "High risk clauses", "Critical and high severity", "danger")}
        ${renderSummaryCard(countMediumClauses(report), "Medium risk", "Needs clarification", "warning")}
        ${renderSummaryCard(countSafeClauses(report), "Safe clauses", "No major issue found", "safe")}
      </div>

      <div class="summary-main">
        <article class="score-panel">
          <span>Overall risk</span>
          ${renderRiskGauge(report.metrics.riskScore, report.metrics.riskLevel)}
          <p>${escapeHtml(report.metrics.topCategory)} is the biggest pressure point.</p>
          <div class="distribution-legend">
            <span><b class="dot danger"></b>${report.findings.filter((finding) => ["Critical", "High"].includes(finding.severity)).length} high</span>
            <span><b class="dot warning"></b>${report.findings.filter((finding) => finding.severity === "Medium").length} medium</span>
            <span><b class="dot safe"></b>${countSafeClauses(report)} safe</span>
          </div>
        </article>

        <article class="persona-panel">
          <div class="section-title">
            <h3>${escapeHtml(report.personaProfile?.label || roleLabel(state.selectedRole))} Lens</h3>
            <span>${report.personaProfile?.priorityFindingCount || 0} priority</span>
          </div>
          <p>${escapeHtml(report.personaProfile?.lens || "Role-specific contract risks are prioritized here.")}</p>
          <div class="persona-focus">
            ${(report.personaProfile?.dimensionFocus || []).map((item) => `
              <span><strong>${escapeHtml(item.label)}</strong><small>${item.score}/100</small></span>
            `).join("")}
          </div>
          ${report.personaProfile?.topPriorityFinding ? `
            <div class="role-callout">
              <strong>Top role-specific concern</strong>
              <span>${escapeHtml(report.personaProfile.topPriorityFinding.title)} in ${escapeHtml(report.personaProfile.topPriorityFinding.clauseId)}</span>
            </div>
          ` : ""}
        </article>

        <article class="top-issues">
          <div class="section-title">
            <h3>Top Issues</h3>
            <span>${report.findings.length} findings</span>
          </div>
          ${report.findings.slice(0, 6).map((finding) => `
            <button class="issue-row" type="button" data-finding-id="${escapeAttr(finding.id)}" data-open-clauses="true" aria-label="Open ${escapeAttr(finding.title)} in clause review">
              <span>
                <strong>${escapeHtml(finding.title)}</strong>
                <small>${escapeHtml(finding.category)} | ${escapeHtml(finding.clauseId)}${finding.personaPriority === "High" ? " | Role priority" : ""}</small>
              </span>
              <b>${finding.score}</b>
            </button>
          `).join("")}
        </article>

        <article class="cuad-panel">
          <div class="section-title">
            <h3>CUAD Coverage</h3>
            <span>${report.cuadReview?.detectedCategoryCount || 0}/${report.cuadReview?.categoryCount || 41}</span>
          </div>
          <p>Benchmark-aligned clause categories detected in this contract.</p>
          <div class="legal-labels">
            ${uniqueCuadCategories(report).slice(0, 10).map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
          </div>
        </article>
      </div>

      ${report.aiReview ? `
        <article class="ai-review-panel">
          <div class="section-title">
            <h3>GPT Second Review</h3>
            <span>${escapeHtml(report.engine?.model || state.config.openAIModel || "OpenAI")}</span>
          </div>
          <p>${escapeHtml(report.aiReview.executiveTake || "OpenAI reviewed the local risk report.")}</p>
          <div class="ai-review-grid">
            ${(report.aiReview.negotiationPriorities || []).slice(0, 3).map((item) => `
              <div>
                <strong>${escapeHtml(item.priority)}</strong>
                <span>${escapeHtml(item.ask)}</span>
              </div>
            `).join("")}
          </div>
          ${report.aiReview.judgeDemoLine ? `<small>${escapeHtml(report.aiReview.judgeDemoLine)}</small>` : ""}
        </article>
      ` : ""}
    </section>
  `;
}

function renderRiskGauge(score, level) {
  const clampedScore = clampNumber(score, 0, 100);
  const angle = -90 + clampedScore * 1.8;
  const needle = gaugeNeedlePoints(160, 150, 102, angle);
  const segments = [
    { start: -90, end: -76, color: "#16a34a" },
    { start: -72, end: -58, color: "#22c55e" },
    { start: -54, end: -40, color: "#65a30d" },
    { start: -36, end: -22, color: "#a3e635" },
    { start: -18, end: -4, color: "#facc15" },
    { start: 0, end: 14, color: "#f59e0b" },
    { start: 18, end: 32, color: "#f97316" },
    { start: 36, end: 50, color: "#ef4444" },
    { start: 54, end: 68, color: "#dc2626" },
    { start: 72, end: 90, color: "#be123c" }
  ];

  return `
    <div class="risk-gauge" aria-label="Risk speedometer ${score} out of 100">
      <svg viewBox="0 0 320 190" role="img">
        <title>Risk speedometer: ${score}/100 ${escapeHtml(level)}</title>
        ${segments.map((segment) => `
          <path d="${gaugeArcPath(160, 150, 118, segment.start, segment.end)}" stroke="${segment.color}" />
        `).join("")}
        <path class="gauge-inner" d="${gaugeArcPath(160, 150, 78, -90, 90)}" />
        <g class="gauge-needle">
          <line x1="160" y1="150" x2="${needle.stemEnd.x}" y2="${needle.stemEnd.y}" />
          <path d="M ${needle.tip.x} ${needle.tip.y} L ${needle.left.x} ${needle.left.y} L ${needle.right.x} ${needle.right.y} Z" />
        </g>
        <circle class="gauge-hub" cx="160" cy="150" r="11" />
      </svg>
      <div class="gauge-value">
        <strong>${clampedScore}</strong>
        <span>/100 ${escapeHtml(level)}</span>
      </div>
    </div>
  `;
}

function renderClauseReviewSection(report) {
  const selectedFinding = getSelectedFinding();
  const selectedClause = getSelectedClause();

  return `
    <section class="review-section clause-review-grid">
      <aside class="contract-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Contract viewer</span>
            <h2>${escapeHtml(report.meta.documentName || "Contract")}</h2>
          </div>
        </div>
        <div class="document-viewer">
          ${report.clauses.map((clause) => renderClauseBlock(clause)).join("")}
        </div>
      </aside>

      <section class="insights-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Clause insights</span>
            <h2>${escapeHtml(selectedFinding?.title || selectedClause?.heading || "Selected clause")}</h2>
          </div>
          <span class="risk-badge risk-${selectedFinding?.severity || severityFromScore(selectedClause?.riskScore || 0)}">${selectedFinding?.severity || severityFromScore(selectedClause?.riskScore || 0)}</span>
        </div>

        ${renderInsightCard(selectedFinding, selectedClause)}
        ${renderTopIssues(report)}
      </section>

      <aside class="reasoning-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">AI reasoning</span>
            <h2>Scenario and legal view</h2>
          </div>
        </div>
        ${renderTabs()}
        ${renderReasoningBody(selectedFinding, report)}
      </aside>
    </section>
  `;
}

function renderNegotiationSection(report) {
  return `
    <section class="review-section negotiate-grid">
      ${renderNegotiationPanel(report)}
      <article class="reason-card">
        <div class="section-title">
          <h3>Scenario impact</h3>
          <span>${report.metrics.riskLevel}</span>
        </div>
        <ul>
          ${report.scenarioSimulation.map((scenario) => `
            <li><strong>${escapeHtml(scenario.trigger)}</strong><span>${escapeHtml(scenario.consequence)}</span></li>
          `).join("")}
        </ul>
      </article>
      <article class="share-panel">
        <h3>Presenter notes</h3>
        <p>Open with the overall score, click into Clause Review for evidence, then close on negotiation asks. This keeps the demo crisp and avoids dashboard overload.</p>
        <button class="primary-button" type="button" data-action="copy-negotiation">Copy negotiation message</button>
      </article>
    </section>
  `;
}

function renderSummaryCard(value, title, note, tone) {
  return `
    <article class="summary-card ${tone}">
      <span>${escapeHtml(title)}</span>
      <strong>${value}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function renderClauseBlock(clause) {
  const tone = clause.riskScore >= 62 ? "high" : clause.riskScore >= 38 ? "medium" : "safe";
  const isSelected = clause.id === state.selectedClauseId;
  return `
    <button class="clause-block ${tone} ${isSelected ? "selected" : ""}" type="button" data-clause-id="${escapeAttr(clause.id)}" aria-pressed="${isSelected ? "true" : "false"}" aria-label="Select ${escapeAttr(clause.id)} ${escapeAttr(clause.heading)} with risk score ${clause.riskScore}">
      <span class="clause-gutter">${escapeHtml(clause.id)}</span>
      <span class="clause-content">
        <strong>${escapeHtml(clause.heading)}</strong>
        <span>${escapeHtml(clause.text)}</span>
      </span>
      <span class="clause-score">${clause.riskScore}</span>
    </button>
  `;
}

function renderInsightCard(finding, clause) {
  if (!finding && !clause) {
    return `<article class="insight-card empty">Select a clause from the document viewer.</article>`;
  }

  if (!finding) {
    return `
      <article class="insight-card">
        <span class="soft-badge">Clause ${escapeHtml(clause.id)}</span>
        <h3>${escapeHtml(clause.heading)}</h3>
        <p>No major harmful pattern was detected in this clause. Still review jurisdiction-specific enforceability and missing protections.</p>
        <div class="meta-grid">
          <span>Category <strong>Safe / neutral</strong></span>
          <span>Risk <strong>${clause.riskScore}/100</strong></span>
        </div>
      </article>
    `;
  }

  return `
    <article class="insight-card">
      <div class="insight-title">
        <span class="soft-badge">${escapeHtml(finding.clauseId)}</span>
        <span class="soft-badge">${finding.confidence}% confidence</span>
      </div>
      <h3>${escapeHtml(finding.title)}</h3>
      <p>${escapeHtml(finding.explanation)}</p>
      <blockquote>${escapeHtml(finding.evidence)}</blockquote>
      <div class="meta-grid">
        <span>Category <strong>${escapeHtml(finding.category)}</strong></span>
        <span>Risk <strong>${finding.score}/100</strong></span>
      </div>
    </article>
  `;
}

function renderRiskDashboard(report) {
  const high = report.findings.filter((finding) => ["Critical", "High"].includes(finding.severity)).length;
  const medium = report.findings.filter((finding) => finding.severity === "Medium").length;
  const low = Math.max(0, report.meta.clauseCount - high - medium);

  return `
    <article class="mini-dashboard">
      <div class="section-title">
        <h3>Risk dashboard</h3>
        <span>${escapeHtml(report.metrics.riskLevel)}</span>
      </div>
      <canvas id="riskChart" width="360" height="96" aria-label="Risk distribution chart"></canvas>
      <div class="distribution-legend">
        <span><b class="dot danger"></b>${high} high</span>
        <span><b class="dot warning"></b>${medium} medium</span>
        <span><b class="dot safe"></b>${low} safe</span>
      </div>
    </article>
  `;
}

function renderTopIssues(report) {
  return `
    <article class="top-issues">
      <div class="section-title">
        <h3>Top issues</h3>
        <span>${report.findings.length} found</span>
      </div>
      ${report.findings.slice(0, 5).map((finding) => `
        <button class="issue-row" type="button" data-finding-id="${escapeAttr(finding.id)}">
          <span>${escapeHtml(finding.title)}</span>
          <strong>${finding.score}</strong>
        </button>
      `).join("")}
    </article>
  `;
}

function renderTabs() {
  const tabs = [
    ["explanation", "Explanation"],
    ["scenario", "Scenario"],
    ["legal", "Legal view"]
  ];

  return `
    <div class="reason-tabs" role="tablist">
      ${tabs.map(([id, label]) => `
        <button id="reason-tab-${id}" class="${state.reasoningTab === id ? "active" : ""}" type="button" data-tab="${id}" role="tab" aria-selected="${state.reasoningTab === id ? "true" : "false"}" aria-controls="reason-panel-${id}" tabindex="${state.reasoningTab === id ? "0" : "-1"}">${label}</button>
      `).join("")}
    </div>
  `;
}

function renderReasoningBody(finding, report) {
  if (state.reasoningTab === "scenario") {
    return `
      <article class="reason-card" id="reason-panel-scenario" role="tabpanel" aria-labelledby="reason-tab-scenario">
        <h3>If this happens...</h3>
        <ul>
          ${report.scenarioSimulation.map((scenario) => `
            <li><strong>${escapeHtml(scenario.trigger)}</strong><span>${escapeHtml(scenario.consequence)}</span></li>
          `).join("")}
        </ul>
      </article>
    `;
  }

  if (state.reasoningTab === "legal") {
    const labels = uniqueCuadCategories(report);
    return `
      <article class="reason-card" id="reason-panel-legal" role="tabpanel" aria-labelledby="reason-tab-legal">
        <h3>CUAD-aligned review</h3>
        <p>Detected ${report.cuadReview?.detectedCategoryCount || 0} of ${report.cuadReview?.categoryCount || 41} benchmark clause categories.</p>
        <div class="legal-labels">
          ${labels.slice(0, 8).map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
        </div>
      </article>
    `;
  }

  return `
    <article class="reason-card" id="reason-panel-explanation" role="tabpanel" aria-labelledby="reason-tab-explanation">
      <h3>Plain-English impact</h3>
      <p>${escapeHtml(finding?.realWorldImpact || "Select a risky clause to see its practical implication.")}</p>
      <ul>
        <li><strong>Worst case scenario</strong><span>${escapeHtml(finding ? worstCaseFor(finding) : "The client accepts a clause without understanding the downstream cost.")}</span></li>
        <li><strong>Best next step</strong><span>${escapeHtml(finding?.negotiationAsk || "Ask for objective limits, notice, and mutual obligations.")}</span></li>
      </ul>
    </article>
  `;
}

function renderNegotiationPanel(report) {
  return `
    <article class="negotiation-panel">
      <div class="section-title">
        <h3>What you should negotiate</h3>
        <button class="ghost-button compact" type="button" data-action="copy-negotiation">Copy message</button>
      </div>
      <div class="suggestion-list">
        ${report.negotiationPlan.slice(0, 5).map((item) => `
          <label class="suggestion-item">
            <input type="checkbox">
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.ask)}</small>
            </span>
          </label>
        `).join("")}
      </div>
    </article>
  `;
}

function renderChat() {
  return `
    <div class="chat-widget ${state.chatOpen ? "open" : ""}">
      ${state.chatOpen ? `
        <section class="chat-window" aria-label="LEXGUARD Assistant">
          <div class="chat-head">
            <strong>LEXGUARD Assistant</strong>
            <button type="button" data-action="toggle-chat" aria-label="Close chat">x</button>
          </div>
          <div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
            ${state.chatMessages.map((message) => `
              ${renderChatMessage(message)}
            `).join("")}
            ${state.isChatting && !state.isRevealingAnswer ? renderTypingIndicator() : ""}
          </div>
          <form class="chat-form" data-chat-form>
            <input name="message" aria-label="Ask a contract question" placeholder="Ask about Clause 5..." ${state.isChatting ? "disabled" : ""}>
            <button type="submit" ${state.isChatting ? "disabled" : ""}>Send</button>
          </form>
        </section>
      ` : ""}
      <button class="chat-toggle" type="button" data-action="toggle-chat" aria-expanded="${state.chatOpen ? "true" : "false"}">Ask AI</button>
    </div>
  `;
}

function renderChatMessage(message) {
  const from = message.from === "user" ? "user" : "ai";
  const streaming = message.streaming ? " streaming" : "";
  return `<div class="chat-message ${from}${streaming}">${formatChatText(message.text)}</div>`;
}

function renderTypingIndicator() {
  return `
    <div class="chat-message ai typing" aria-live="polite" aria-label="LEXGUARD is typing">
      <span></span><span></span><span></span>
    </div>
  `;
}

function scrollChatToLatest() {
  const messages = app.querySelector(".chat-messages");
  if (!messages) return;
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

function renderExportModal() {
  return `
    <div class="modal-overlay" data-action="close-export">
      <section class="export-modal" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
        <div class="section-title">
          <h2 id="exportTitle">Export Report</h2>
          <button class="ghost-button compact" type="button" data-action="close-export">Close</button>
        </div>
        <div class="export-options">
          <button type="button" data-action="print-report"><strong>Export as PDF</strong><span>Use browser print to save PDF</span></button>
          <button type="button" data-action="export-json"><strong>Export as JSON</strong><span>Download full analysis data</span></button>
          <button type="button" data-action="share-link"><strong>Share link</strong><span>Copy this local demo URL</span></button>
        </div>
      </section>
    </div>
  `;
}

function bindGlobalEvents() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
  });

  app.querySelectorAll("[data-role]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedRole = element.dataset.role;
      state.selectedSample = element.dataset.sample;
      state.contractText = sampleDocuments[state.selectedSample]?.text || state.contractText;
      state.fileName = "";
      state.uploadMessage = "";
      state.report = null;
      resetChat();
      render();
    });
  });

  const sampleSelect = app.querySelector("#sampleSelect");
  if (sampleSelect) {
    sampleSelect.addEventListener("change", () => {
      state.selectedSample = sampleSelect.value;
      if (state.selectedSample !== "custom") {
        state.contractText = sampleDocuments[state.selectedSample]?.text || "";
        state.fileName = "";
        state.uploadMessage = "Sample loaded. You can analyze it or paste your own text.";
      }
      state.report = null;
      resetChat();
      render();
    });
  }

  const textarea = app.querySelector("#contractText");
  if (textarea) {
    textarea.addEventListener("input", () => {
      state.contractText = textarea.value;
      state.selectedSample = "custom";
      state.fileName = state.fileName || "Pasted contract";
      state.report = null;
      resetChat();
      schedulePersistSession();
    });
  }

  const fileInput = app.querySelector("#fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      await loadFile(fileInput.files?.[0]);
    });
  }

  const dropzone = app.querySelector("[data-dropzone]");
  if (dropzone) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        state.dragActive = true;
        render();
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, async (event) => {
        event.preventDefault();
        state.dragActive = false;
        if (eventName === "drop") {
          await loadFile(event.dataTransfer?.files?.[0]);
        } else {
          render();
        }
      });
    });
  }

  app.querySelectorAll("[data-clause-id]").forEach((element) => {
    element.addEventListener("click", () => selectClause(element.dataset.clauseId));
  });

  app.querySelectorAll("[data-finding-id]").forEach((element) => {
    element.addEventListener("click", () => {
      selectFinding(element.dataset.findingId);
      if (element.dataset.openClauses === "true") {
        setReviewSection("clauses");
      }
      render();
    });
  });

  app.querySelectorAll("[data-tab]").forEach((element) => {
    element.addEventListener("click", () => {
      state.reasoningTab = element.dataset.tab;
      schedulePersistSession();
      render();
    });
  });

  app.querySelectorAll("[data-review-section]").forEach((element) => {
    element.addEventListener("click", () => {
      setReviewSection(element.dataset.reviewSection);
      render();
    });
  });

  const chatForm = app.querySelector("[data-chat-form]");
  if (chatForm) {
    chatForm.addEventListener("submit", handleChatSubmit);
  }
}

async function handleAction(event) {
  event.stopPropagation();
  const action = event.currentTarget.dataset.action;

  if (action === "choose-file") {
    app.querySelector("#fileInput")?.click();
    return;
  }
  if (action === "toggle-theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  }
  if (action === "home") {
    goToStep("onboarding");
  }
  if (action === "continue-upload" || action === "back-upload") {
    goToStep("upload");
  }
  if (action === "back-onboarding") {
    goToStep("onboarding");
  }
  if (action === "analyze") {
    await runAnalysis();
    return;
  }
  if (action === "open-export") {
    state.exportOpen = true;
  }
  if (action === "close-export") {
    state.exportOpen = false;
  }
  if (action === "export-json") {
    exportJson();
  }
  if (action === "print-report") {
    window.print();
  }
  if (action === "share-link") {
    await navigator.clipboard?.writeText(location.href);
  }
  if (action === "copy-negotiation") {
    await copyNegotiationMessage();
  }
  if (action === "toggle-chat") {
    state.chatOpen = !state.chatOpen;
  }

  render();
}

async function loadFile(file) {
  if (!file) return;
  const lowerName = file.name.toLowerCase();
  const isTextFile = lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".text") || file.type.startsWith("text/");
  const isPdfFile = lowerName.endsWith(".pdf") || file.type === "application/pdf";

  state.fileName = file.name;
  state.report = null;
  resetChat();

  if (isPdfFile) {
    await extractPdfFile(file);
    return;
  }

  if (!isTextFile) {
    state.uploadMessage = "Use TXT, MD, or PDF files. DOCX support is planned for production.";
    render();
    return;
  }

  const text = await file.text();
  state.selectedSample = "custom";
  state.contractText = text.trim();
  state.uploadMessage = state.contractText
    ? `${file.name} loaded successfully. Ready to analyze.`
    : `${file.name} loaded, but no readable text was found.`;
  render();
}

async function extractPdfFile(file) {
  if (location.protocol === "file:") {
    state.uploadMessage = "PDF extraction needs the local server. Start the app with npm start.";
    render();
    return;
  }

  if (!state.config.documentAIEnabled) {
    state.uploadMessage = "Document AI is not configured yet. Add DOCUMENT_AI_PROCESSOR_ID to .env and restart the server.";
    render();
    return;
  }

  state.isExtracting = true;
  state.uploadMessage = "Extracting PDF text with Google Document AI OCR...";
  render();

  try {
    const contentBase64 = await readFileAsBase64(file);
    const response = await fetchWithTimeout("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        contentBase64
      })
    }, 25000);

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || payload.detail || "Document AI extraction failed.");
    }

    state.selectedSample = "custom";
    state.contractText = String(payload.text || "").trim();
    state.uploadMessage = state.contractText
      ? `${file.name} extracted successfully${payload.pageCount ? ` (${payload.pageCount} page${payload.pageCount === 1 ? "" : "s"})` : ""}. Ready to analyze.`
      : `${file.name} was processed, but no readable text was found.`;
  } catch (error) {
    state.uploadMessage = `PDF extraction failed: ${error.message}`;
  } finally {
    state.isExtracting = false;
    render();
  }
}

async function runAnalysis() {
  const text = state.contractText.trim();
  if (!text) return;

  state.isAnalyzing = true;
  render();

  try {
    const report = await analyzeViaServer(text);
    state.report = report;
    state.selectedFindingId = report.findings[0]?.id || null;
    state.selectedClauseId = report.findings[0]?.clauseId || report.clauses[0]?.id || null;
    resetChat(report);
    setReviewSection("summary", { replace: true });
    goToStep("analysis");
  } finally {
    state.isAnalyzing = false;
  }
  render();
}

function initialChatMessages(report = null) {
  const documentName = report?.meta?.documentName;
  return [
    {
      from: "ai",
      text: documentName
        ? `I am grounded in ${documentName}. Ask me to explain a clause, why a risk was flagged, draft negotiation wording, or compare practical scenarios. I will only answer questions about this contract report.`
        : "After analysis, I can answer questions about the current contract only: clause meaning, risk impact, negotiation wording, scenarios, and legal categories."
    }
  ];
}

function resetChat(report = null) {
  state.chatMessages = initialChatMessages(report);
  state.isChatting = false;
  state.isRevealingAnswer = false;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read file.")));
    reader.readAsDataURL(file);
  });
}

async function analyzeViaServer(text) {
  const options = {
    persona: personaForRole(state.selectedRole),
    contractType: state.contractType,
    documentName: state.fileName || sampleDocuments[state.selectedSample]?.title || "Uploaded contract"
  };

  if (location.protocol === "file:") {
    return analyzeContract(text, options);
  }

  try {
    const response = await fetchWithTimeout("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, ...options })
    }, 15000);
    if (!response.ok) throw new Error("API failed");
    return response.json();
  } catch {
    return {
      ...analyzeContract(text, options),
      engine: {
        mode: "browser-local-fallback",
        provider: "Browser local risk engine",
        warning: "Cloud AI review took too long, so LEXGUARD used the instant local engine."
      }
    };
  }
}

function selectClause(clauseId) {
  state.selectedClauseId = clauseId;
  const finding = state.report?.findings.find((item) => item.clauseId === clauseId);
  state.selectedFindingId = finding?.id || null;
  schedulePersistSession();
  render();
}

function selectFinding(findingId) {
  const finding = state.report?.findings.find((item) => item.id === findingId);
  state.selectedFindingId = findingId;
  state.selectedClauseId = finding?.clauseId || state.selectedClauseId;
}

function getSelectedFinding() {
  return state.report?.findings.find((finding) => finding.id === state.selectedFindingId) || null;
}

function getSelectedClause() {
  return state.report?.clauses.find((clause) => clause.id === state.selectedClauseId) || state.report?.clauses[0] || null;
}

function countMediumClauses(report) {
  return report.clauses.filter((clause) => clause.riskScore >= 38 && clause.riskScore < 62).length;
}

function countSafeClauses(report) {
  return report.clauses.filter((clause) => clause.riskScore < 38).length;
}

function uniqueCuadCategories(report) {
  return [...new Set((report.cuadReview?.detectedLabels || []).map((label) => label.category))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function severityFromScore(score) {
  if (score >= 80) return "Critical";
  if (score >= 62) return "High";
  if (score >= 38) return "Medium";
  if (score > 0) return "Low";
  return "Clear";
}

function worstCaseFor(finding) {
  if (finding.dimension === "mobility") return "The signer loses practical freedom to work, consult, or build in the same market.";
  if (finding.dimension === "financial") return "A small dispute becomes larger than the value of the contract.";
  if (finding.dimension === "ip") return "The signer gives away reusable tools, ideas, or future upside.";
  if (finding.dimension === "privacy") return "Sensitive data can be reused, profiled, or shared beyond the original purpose.";
  if (finding.dimension === "dispute") return "The signer has fewer practical ways to challenge harmful conduct.";
  return "One party controls outcomes without clear limits or notice.";
}

function roleLabel(role) {
  return roleCards.find((card) => card.id === role)?.title || "Client";
}

function personaForRole(role) {
  if (role === "freelancer" || role === "founder") return "founder";
  return role;
}

async function copyNegotiationMessage() {
  if (!state.report) return;
  const message = state.report.negotiationPlan.slice(0, 4).map((item) => `- ${item.title}: ${item.ask}`).join("\n");
  await navigator.clipboard?.writeText(`Please revise the following contract points:\n${message}`);
}

function exportJson() {
  if (!state.report) return;
  const blob = new Blob([JSON.stringify(state.report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lexguard-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const input = event.currentTarget.elements.message;
  const text = input.value.trim();
  if (!text) return;

  const finding = getSelectedFinding();
  state.chatMessages.push({ from: "user", text });
  state.isChatting = true;
  input.value = "";
  render();

  let answer = "";
  try {
    const response = await fetchWithTimeout("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: text,
        report: state.report
          ? {
              ...state.report,
              findings: [
                ...(finding ? [finding] : []),
                ...state.report.findings.filter((item) => item.id !== finding?.id)
              ]
            }
          : null
      })
    }, 12000);
    const payload = await response.json();
    answer = payload.answer || "I could not answer from the current report.";
  } catch {
    answer = finding
      ? `Yes. ${finding.title} is risky because ${finding.explanation.toLowerCase()} Suggested ask: ${finding.negotiationAsk}`
      : "Analyze a contract and select a clause first, then I can answer with clause-specific context.";
  } finally {
    await revealAssistantAnswer(answer);
    state.isChatting = false;
    state.isRevealingAnswer = false;
  }
  render();
}

async function revealAssistantAnswer(answer) {
  const fullText = String(answer || "").trim();
  const message = { from: "ai", text: "", streaming: true };
  state.chatMessages.push(message);
  state.isRevealingAnswer = true;
  render();

  for (const chunk of chunkForReveal(fullText)) {
    message.text += chunk;
    render();
    await wait(22);
  }

  message.text = fullText;
  message.streaming = false;
}

function chunkForReveal(text) {
  const tokens = String(text || "").match(/\S+\s*/g) || [];
  const chunks = [];
  const wordsPerChunk = text.length > 900 ? 4 : 3;

  for (let index = 0; index < tokens.length; index += wordsPerChunk) {
    chunks.push(tokens.slice(index, index + wordsPerChunk).join(""));
  }

  return chunks.length ? chunks : [text];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function formatChatText(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function gaugeArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: roundSvgNumber(cx + radius * Math.cos(angleInRadians)),
    y: roundSvgNumber(cy + radius * Math.sin(angleInRadians))
  };
}

function gaugeNeedlePoints(cx, cy, radius, angleInDegrees) {
  const tip = polarToCartesian(cx, cy, radius, angleInDegrees);
  const stemEnd = polarToCartesian(cx, cy, radius - 16, angleInDegrees);
  const base = polarToCartesian(cx, cy, radius - 20, angleInDegrees);
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  const perpendicularX = -Math.sin(radians);
  const perpendicularY = Math.cos(radians);
  const halfWidth = 7;

  return {
    tip,
    stemEnd,
    left: {
      x: roundSvgNumber(base.x + perpendicularX * halfWidth),
      y: roundSvgNumber(base.y + perpendicularY * halfWidth)
    },
    right: {
      x: roundSvgNumber(base.x - perpendicularX * halfWidth),
      y: roundSvgNumber(base.y - perpendicularY * halfWidth)
    }
  };
}

function roundSvgNumber(value) {
  return Math.round(value * 10) / 10;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
