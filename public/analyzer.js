import { cuadCategoryCount, cuadClauseTaxonomy } from "./cuadTaxonomy.js";

export const sampleDocuments = {
  employment: {
    title: "Employment Agreement",
    persona: "employee",
    text: `EMPLOYMENT AGREEMENT

The Employee shall devote full business time and best efforts exclusively to the Company and shall not engage in any outside business, consulting, open-source, teaching, advisory, or creative activity without prior written approval from the Company.

For a period of twenty-four months after termination for any reason, the Employee shall not directly or indirectly work for, advise, consult with, invest in, or assist any business that competes with the Company or any anticipated product line of the Company anywhere in the world.

All inventions, discoveries, works of authorship, developments, improvements, data, prompts, workflows, models, and ideas conceived, reduced to practice, or learned by the Employee during employment, whether on Company time or personal time, shall be the sole and exclusive property of the Company. The Employee irrevocably assigns all rights, title, and interest to the Company.

The Employee shall indemnify and hold harmless the Company for any claim, loss, penalty, investigation cost, attorney fee, or damages arising out of the Employee's conduct, whether or not caused by negligence.

The Company may modify policies, compensation plans, benefits, and bonus criteria at any time in its sole discretion without notice. Continued employment constitutes acceptance of the modified terms.

Any dispute shall be resolved by binding arbitration selected by the Company. The Employee waives the right to participate in a class, collective, or representative action. The Company may seek injunctive relief in any court of its choosing.`
  },
  subscription: {
    title: "Subscription Terms",
    persona: "consumer",
    text: `SUBSCRIPTION TERMS

The membership renews automatically for successive one-year periods unless cancelled at least sixty days before the renewal date. Fees are non-refundable, including where the user does not use the service.

The provider may change features, pricing, data retention practices, or these terms at any time in its sole discretion. Notice may be provided by posting an update on the website.

The user authorizes the provider and its affiliates to collect, combine, sell, license, and share personal data, device identifiers, precise location information, payment metadata, browsing activity, and inferred preferences with partners for analytics, advertising, credit scoring, and product development.

The user shall indemnify the provider for any claim relating to use of the service. The provider's aggregate liability shall not exceed the amount paid by the user in the previous thirty days.

All disputes must be brought individually in binding arbitration in the provider's home county. The user waives jury trial and class action rights.`
  },
  freelance: {
    title: "Freelance Services Agreement",
    persona: "founder",
    text: `FREELANCE SERVICES AGREEMENT

Client owns all deliverables, drafts, pre-existing materials, concepts, methods, templates, know-how, source files, ideas, and improvements created or used by Contractor in connection with the services, whether created before or after the effective date.

Contractor grants Client a perpetual, worldwide, irrevocable, sublicensable license to use Contractor's name, likeness, portfolio, methods, and tools for any purpose without additional payment.

Payment is due only upon Client's final acceptance, which may be withheld in Client's sole discretion. Client may terminate the project at any time without paying for partially completed work.

Contractor must indemnify Client, its affiliates, officers, investors, customers, and partners from any allegation, investigation, loss, fee, penalty, or damage connected to the services.

Confidential information includes all information disclosed by Client, whether marked confidential or not, and remains confidential indefinitely. Contractor may not disclose the existence of the relationship without written permission.`
  },
  vendor: {
    title: "Vendor Master Services Agreement",
    persona: "vendor",
    text: `MASTER SERVICES AGREEMENT

Vendor shall comply with all applicable laws, customer policies, security procedures, audit requests, insurance requirements, and instructions that Customer may issue from time to time.

Customer may audit Vendor's systems, books, personnel, subcontractors, and facilities at any time. Vendor shall remediate findings at Vendor's expense within five business days.

Vendor's liability for confidentiality, data security, privacy, intellectual property, indemnity, fraud, negligence, and service failures is uncapped. Customer's total liability is limited to fees paid in the prior month.

Customer may terminate for convenience immediately. Vendor may terminate only after providing ninety days notice and a thirty day cure period.

Vendor assigns to Customer all rights in any deliverables, improvements, discoveries, derivative works, and feedback related to the services.`
  }
};

const personaProfiles = {
  employee: {
    label: "Employee",
    primaryDimensions: ["mobility", "ip", "dispute", "control"],
    dimensionBoosts: { mobility: 14, ip: 8, dispute: 5, control: 4, financial: 2 },
    dimensionPenalties: { compliance: -4 },
    lens: "career mobility, side projects, post-employment restrictions, dispute fairness, and ownership of personal work",
    topConcern: "future employability and ownership of work created outside the job"
  },
  consumer: {
    label: "Consumer",
    primaryDimensions: ["privacy", "financial", "dispute", "control"],
    dimensionBoosts: { privacy: 14, financial: 9, dispute: 5, control: 5 },
    dimensionPenalties: { mobility: -8, compliance: -4 },
    lens: "billing traps, privacy rights, cancellation, price changes, data sharing, and dispute access",
    topConcern: "unexpected charges, loss of data control, and hard-to-cancel terms"
  },
  founder: {
    label: "Founder / Freelancer",
    primaryDimensions: ["ip", "financial", "control", "mobility", "dispute"],
    dimensionBoosts: { ip: 14, financial: 8, control: 7, mobility: 4, dispute: 3 },
    dimensionPenalties: { privacy: -4 },
    lens: "IP ownership, reusable tools, payment certainty, portfolio rights, exclusivity, and deal control",
    topConcern: "giving away reusable IP or taking financial risk larger than the project value"
  },
  vendor: {
    label: "Vendor",
    primaryDimensions: ["financial", "compliance", "control", "ip", "dispute"],
    dimensionBoosts: { financial: 12, compliance: 12, control: 7, ip: 5, dispute: 4 },
    dimensionPenalties: { mobility: -5 },
    lens: "liability caps, audit burden, compliance obligations, termination rights, and operational cost",
    topConcern: "uncapped downside, broad audits, and obligations that were not priced into the deal"
  },
  individual: {
    label: "Individual",
    primaryDimensions: ["financial", "privacy", "control", "dispute", "ip", "mobility"],
    dimensionBoosts: { financial: 6, privacy: 6, control: 5, dispute: 4, ip: 3, mobility: 3 },
    dimensionPenalties: {},
    lens: "financial exposure, privacy, control, dispute rights, and ownership",
    topConcern: "practical harm after signing"
  }
};

const riskSignals = [
  {
    id: "non-compete",
    title: "Restrictive Non-Compete",
    category: "Employment Mobility",
    dimension: "mobility",
    weight: 82,
    patterns: [/non[-\s]?compete/i, /shall not.*(compete|work for|advise|consult with).*compet/i, /competes with the company/i],
    explanation: "This limits where the affected person can work or contribute after the relationship ends.",
    impact: "It can reduce future employment options, investor flexibility, consulting income, and negotiating leverage.",
    negotiation: "Limit the restriction to named competitors, a narrow role, a short duration, and regions where the company actually operates.",
    benchmark: "A balanced clause is narrow in duration, geography, role, and protected business interest."
  },
  {
    id: "outside-work",
    title: "Outside Work Approval Gate",
    category: "Employment Mobility",
    dimension: "mobility",
    weight: 55,
    patterns: [/outside (business|work|activity)/i, /exclusively to the company/i, /without prior written (approval|consent)/i],
    explanation: "The clause can restrict teaching, consulting, open-source, creative, advisory, or side-project activity.",
    impact: "A broad approval gate can chill harmless work and create leverage over personal projects.",
    negotiation: "Carve out passive investments, prior projects, open-source work, teaching, and activities that do not use confidential information.",
    benchmark: "Commonly negotiated language focuses only on conflicts of interest and confidential information."
  },
  {
    id: "ip-assignment",
    title: "Broad IP Assignment",
    category: "Intellectual Property",
    dimension: "ip",
    weight: 76,
    patterns: [/all (inventions|discoveries|works|developments|improvements|ideas)/i, /sole and exclusive property/i, /irrevocably assigns/i, /work made for hire/i, /rights, title, and interest/i],
    explanation: "This can transfer ownership of ideas, tools, prompts, workflows, or inventions beyond the core deliverable.",
    impact: "The affected person may lose ownership of pre-existing methods, side inventions, reusable templates, or portfolio assets.",
    negotiation: "Exclude prior inventions, general know-how, open-source contributions, portfolio material, and anything created outside the scope of work.",
    benchmark: "Balanced IP terms distinguish assigned deliverables from background IP and general skills."
  },
  {
    id: "perpetual-license",
    title: "Perpetual Sublicensable License",
    category: "Intellectual Property",
    dimension: "ip",
    weight: 68,
    patterns: [/perpetual.*worldwide.*irrevocable/i, /sublicensable license/i, /for any purpose without additional payment/i],
    explanation: "A permanent broad license can outlive the project and spread rights to unknown third parties.",
    impact: "It can prevent future monetization of reusable assets and can expose likeness or portfolio material.",
    negotiation: "Limit the license to the paid deliverables, client internal use, and the term required for the project.",
    benchmark: "Licenses should be scoped by asset, purpose, geography, duration, and sublicensing rights."
  },
  {
    id: "indemnity",
    title: "One-Sided Indemnity",
    category: "Financial Liability",
    dimension: "financial",
    weight: 72,
    patterns: [/indemnif(y|ies|ication)/i, /hold harmless/i, /any claim, loss, penalty/i, /attorney fee/i],
    explanation: "Indemnity shifts legal defense costs and losses to one side, often before fault is proven.",
    impact: "A small mistake or allegation can create outsized financial exposure.",
    negotiation: "Limit indemnity to third-party claims caused by breach, negligence, willful misconduct, or IP infringement, with notice and defense control.",
    benchmark: "Balanced indemnity is mutual, fault-based, procedurally clear, and excludes indirect losses."
  },
  {
    id: "uncapped-liability",
    title: "Uncapped Liability Carveouts",
    category: "Financial Liability",
    dimension: "financial",
    weight: 80,
    patterns: [/uncapped/i, /liability.*not.*(limited|cap)/i, /aggregate liability shall not exceed/i, /total liability is limited/i],
    explanation: "The clause may leave one party exposed to unlimited losses while tightly limiting the other party's liability.",
    impact: "This asymmetry can make the deal economically unsafe, especially for privacy, security, IP, or indemnity claims.",
    negotiation: "Create a reasonable mutual cap, define super-cap categories, and exclude only intentional misconduct where needed.",
    benchmark: "Commercial contracts usually use reciprocal caps with carefully defined exceptions."
  },
  {
    id: "auto-renewal",
    title: "Hidden Auto-Renewal Burden",
    category: "Payments & Renewal",
    dimension: "financial",
    weight: 58,
    patterns: [/renew(s|al)? automatically/i, /successive .* periods/i, /cancelled? at least \w+ days before/i],
    explanation: "Automatic renewal with a long notice window can lock users into another paid term.",
    impact: "The user can miss a cancellation window and owe fees even after the service is no longer useful.",
    negotiation: "Ask for renewal reminders, a short cancellation window, prorated refunds, and month-to-month renewal after the first term.",
    benchmark: "Fair renewal terms provide conspicuous notice and simple cancellation."
  },
  {
    id: "non-refundable",
    title: "No Refund Escape Hatch",
    category: "Payments & Renewal",
    dimension: "financial",
    weight: 46,
    patterns: [/non[-\s]?refundable/i, /no refunds?/i, /including where .* does not use/i],
    explanation: "The user may owe or lose fees even when value is not delivered or the service is unused.",
    impact: "This can convert a low-risk subscription into a sunk-cost obligation.",
    negotiation: "Request prorated refunds for unused periods, service failures, duplicate billing, and cancellation within a grace period.",
    benchmark: "Consumer-friendly terms include refund exceptions for non-delivery or early cancellation."
  },
  {
    id: "privacy-broad-sharing",
    title: "Excessive Data Sharing",
    category: "Privacy & Data",
    dimension: "privacy",
    weight: 75,
    patterns: [/collect, combine, sell, license, and share/i, /precise location/i, /device identifiers/i, /inferred preferences/i, /credit scoring/i],
    explanation: "The data rights are broad and include sensitive behavioral or inferred data.",
    impact: "The affected person may lose control over profiling, resale, advertising, or downstream partner use.",
    negotiation: "Limit collection to necessary data, remove sale/license rights, require opt-in for sensitive data, and add deletion/export rights.",
    benchmark: "Privacy-aware agreements use purpose limitation, minimization, retention limits, and consent controls."
  },
  {
    id: "unilateral-change",
    title: "Unilateral Change Power",
    category: "Ambiguity & Control",
    dimension: "control",
    weight: 62,
    patterns: [/sole discretion/i, /may modify/i, /may change/i, /at any time/i, /without notice/i],
    explanation: "One party can alter important terms without meaningful negotiation or advance notice.",
    impact: "A user may accept one deal and later face different prices, benefits, obligations, or privacy practices.",
    negotiation: "Require advance written notice, a right to reject material changes, and no retroactive application.",
    benchmark: "Fair modification clauses give notice and allow termination before material changes take effect."
  },
  {
    id: "arbitration-waiver",
    title: "Arbitration and Class Waiver",
    category: "Dispute Resolution",
    dimension: "dispute",
    weight: 66,
    patterns: [/binding arbitration/i, /waives? .*class/i, /class, collective, or representative action/i, /waives? jury trial/i],
    explanation: "This changes how disputes can be brought and may remove collective pressure for small claims.",
    impact: "The affected person may face higher friction, private proceedings, limited discovery, and no class remedy.",
    negotiation: "Add small-claims access, mutual forum rules, fee fairness, opt-out rights, and preserve public injunctive relief where relevant.",
    benchmark: "Balanced dispute terms are mutual, accessible, and do not make low-value claims impractical."
  },
  {
    id: "forum-asymmetry",
    title: "Forum Advantage",
    category: "Dispute Resolution",
    dimension: "dispute",
    weight: 50,
    patterns: [/home county/i, /court of its choosing/i, /selected by the company/i, /venue.*(provider|company|customer)/i],
    explanation: "The forum may be chosen to favor one side geographically or procedurally.",
    impact: "Travel, local rules, and familiar courts can make enforcement more expensive for the weaker party.",
    negotiation: "Use a neutral forum, remote proceedings, or the affected person's county for consumer and employment claims.",
    benchmark: "Neutral venue language avoids forcing the weaker party into a distant forum."
  },
  {
    id: "termination-asymmetry",
    title: "Asymmetric Termination Rights",
    category: "Termination",
    dimension: "control",
    weight: 58,
    patterns: [/terminate for convenience/i, /may terminate .* at any time/i, /terminate only after/i, /without paying for partially completed work/i],
    explanation: "One party can exit freely while the other remains locked into notice, cure, or non-payment conditions.",
    impact: "The affected party may invest time or money without reliable payment or continuity.",
    negotiation: "Make termination rights mutual and require payment for completed work, transition assistance, and reasonable notice.",
    benchmark: "Balanced termination clauses protect work already performed and avoid one-way exit rights."
  },
  {
    id: "audit-burden",
    title: "Open-Ended Audit Burden",
    category: "Compliance",
    dimension: "compliance",
    weight: 57,
    patterns: [/audit .* at any time/i, /books, personnel, subcontractors, and facilities/i, /remediate .* at .* expense/i],
    explanation: "Audit rights can be operationally disruptive and costly when not scoped.",
    impact: "The vendor may absorb unpredictable remediation costs and expose sensitive systems or third-party data.",
    negotiation: "Limit audits to reasonable notice, business hours, relevant records, confidentiality, and once per year unless a breach is suspected.",
    benchmark: "Audit clauses usually include notice, frequency, scope, confidentiality, and cost allocation."
  },
  {
    id: "indefinite-confidentiality",
    title: "Indefinite Confidentiality",
    category: "Confidentiality",
    dimension: "control",
    weight: 42,
    patterns: [/confidential indefinitely/i, /remains confidential indefinitely/i, /whether marked confidential or not/i],
    explanation: "Confidentiality can become too broad when it covers unmarked information forever.",
    impact: "The affected person may be unable to discuss ordinary experience, portfolio work, or independently known information.",
    negotiation: "Add exclusions for public information, independently developed knowledge, prior knowledge, and a fixed term for non-trade-secret information.",
    benchmark: "Confidentiality usually has standard exclusions and separates trade secrets from ordinary confidential information."
  },
  {
    id: "acceptance-discretion",
    title: "Payment Subject to Sole Acceptance",
    category: "Payments & Renewal",
    dimension: "financial",
    weight: 64,
    patterns: [/payment is due only upon .* final acceptance/i, /acceptance.*sole discretion/i, /withheld in .* sole discretion/i],
    explanation: "Payment depends on subjective acceptance controlled by the paying party.",
    impact: "The worker or vendor can complete meaningful work and still face delayed or denied payment.",
    negotiation: "Define objective acceptance criteria, deemed acceptance after a review period, and milestone payments.",
    benchmark: "Healthy acceptance language uses objective standards and clear review timelines."
  },
  {
    id: "compliance-catchall",
    title: "Catch-All Compliance Obligation",
    category: "Compliance",
    dimension: "compliance",
    weight: 45,
    patterns: [/comply with all applicable laws/i, /customer policies/i, /instructions .* from time to time/i],
    explanation: "A broad compliance catch-all may import unknown future policies or instructions.",
    impact: "The affected party may become responsible for requirements they have not seen or priced.",
    negotiation: "Attach current policies, require reasonable written changes, and allow fee or timeline adjustments for new obligations.",
    benchmark: "Compliance obligations should be knowable, relevant, and change-controlled."
  }
];

const intensifiers = [
  { label: "worldwide scope", pattern: /worldwide|anywhere in the world|global/i, value: 7 },
  { label: "long duration", pattern: /twenty[-\s]?four months|two years|perpetual|indefinitely|forever/i, value: 8 },
  { label: "irrevocable terms", pattern: /irrevocable|waives?|without additional payment/i, value: 6 },
  { label: "unilateral control", pattern: /sole discretion|at any time|without notice|court of its choosing/i, value: 8 },
  { label: "broad scope", pattern: /all|any|including but not limited|anticipated product line|affiliates|partners/i, value: 4 }
];

const mitigators = [
  { label: "mutuality", pattern: /mutual|both parties|reciprocal/i, value: -8 },
  { label: "notice", pattern: /written notice|advance notice|thirty days notice|30 days notice/i, value: -5 },
  { label: "reasonableness", pattern: /reasonable|commercially reasonable|material/i, value: -4 },
  { label: "carveout", pattern: /except|excluding|carve[-\s]?out|prior inventions|public information/i, value: -8 },
  { label: "cap", pattern: /liability cap|aggregate cap|not exceed/i, value: -4 }
];

const vagueTerms = [
  "reasonable",
  "material",
  "sole discretion",
  "including but not limited to",
  "from time to time",
  "substantially similar",
  "anticipated product line",
  "any purpose",
  "as determined by",
  "all applicable"
];

const dimensionLabels = {
  financial: "Financial Exposure",
  privacy: "Privacy & Data",
  mobility: "Career Mobility",
  ip: "IP Ownership",
  dispute: "Dispute Power",
  compliance: "Compliance Burden",
  control: "Unilateral Control"
};

export function analyzeContract(rawText, options = {}) {
  const text = normalizeText(rawText);
  const clauses = extractClauses(text);
  const detectedType = inferContractType(text, options.contractType);
  const persona = options.persona || samplePersonaForType(detectedType);
  const findings = [];

  for (const clause of clauses) {
    for (const signal of riskSignals) {
      const evidence = findEvidence(clause.text, signal.patterns);
      if (!evidence) {
        continue;
      }

      const score = scoreSignal(signal, clause.text, detectedType, persona);
      findings.push(buildFinding({ signal, clause, score, evidence, detectedType, persona }));
    }
  }

  const crossClauseFindings = detectCrossClauseRisks(text, clauses, detectedType, persona);
  const deduped = dedupeFindings([...findings, ...crossClauseFindings])
    .sort((a, b) => b.score - a.score || a.clauseId.localeCompare(b.clauseId));

  const dimensions = scoreDimensions(deduped);
  const cuadReview = buildCuadReview(clauses, deduped);
  const metrics = buildMetrics(deduped, clauses, dimensions, text);
  const obligations = extractObligations(clauses);
  const ambiguity = analyzeAmbiguity(text, clauses);
  const personaProfile = buildPersonaProfile(persona, deduped, dimensions);

  return {
    meta: {
      documentName: options.documentName || "Untitled document",
      detectedType,
      persona,
      personaLabel: personaProfile.label,
      clauseCount: clauses.length,
      wordCount: countWords(text),
      generatedAt: new Date().toISOString()
    },
    metrics,
    summary: buildSummary(metrics, deduped, detectedType, persona),
    dimensions,
    findings: deduped,
    clauses: clauses.map((clause) => ({
      ...clause,
      riskScore: clauseRiskScore(clause.id, deduped),
      tags: [...new Set(deduped.filter((finding) => finding.clauseId === clause.id).map((finding) => finding.category))]
    })),
    obligations,
    ambiguity,
    cuadReview,
    personaProfile,
    agentPanel: buildAgentPanel(deduped, dimensions, persona),
    negotiationPlan: buildNegotiationPlan(deduped),
    scenarioSimulation: buildScenarioSimulation(deduped, persona),
    benchmarks: buildBenchmarks(deduped)
  };
}

function buildCuadReview(clauses, findings) {
  const labels = [];

  for (const clause of clauses) {
    for (const category of cuadClauseTaxonomy) {
      if (category.group === "Metadata" && clause.id !== "C01") {
        continue;
      }

      const evidence = findEvidence(clause.text, category.patterns);
      if (!evidence) {
        continue;
      }

      labels.push({
        id: `${category.id}-${clause.id}`,
        categoryId: category.id,
        category: category.label,
        group: category.group,
        dimension: category.dimension,
        answerFormat: category.answerFormat,
        clauseId: clause.id,
        clauseHeading: clause.heading,
        evidence,
        confidence: cuadConfidence(category, clause.text),
        reviewUse: category.reviewUse,
        description: category.description
      });
    }
  }

  const dedupedLabels = dedupeCuadLabels(labels);
  const coverageByGroup = groupCuadCoverage(dedupedLabels);
  const riskAlignedCategories = new Set(findings.map((finding) => finding.category));

  return {
    source: "CUAD v1 inspired 41-clause taxonomy",
    categoryCount: cuadCategoryCount,
    detectedCategoryCount: new Set(dedupedLabels.map((label) => label.categoryId)).size,
    detectedLabels: dedupedLabels.sort((a, b) => b.confidence - a.confidence || a.category.localeCompare(b.category)),
    coverageByGroup,
    benchmarkUse: "Use CUAD to evaluate clause extraction recall before asking Gemini for legal reasoning.",
    riskAlignment: [...riskAlignedCategories].slice(0, 8)
  };
}

function cuadConfidence(category, text) {
  const directHits = category.patterns.filter((pattern) => pattern.test(text)).length;
  const intensity = intensifiers.filter((item) => item.pattern.test(text)).length;
  return clamp(62 + directHits * 9 + intensity * 3, 55, 94);
}

function dedupeCuadLabels(labels) {
  const best = new Map();
  for (const label of labels) {
    const key = `${label.categoryId}-${label.clauseId}`;
    const previous = best.get(key);
    if (!previous || label.confidence > previous.confidence) {
      best.set(key, label);
    }
  }
  return [...best.values()];
}

function groupCuadCoverage(labels) {
  const groups = new Map();
  for (const item of cuadClauseTaxonomy) {
    if (!groups.has(item.group)) {
      groups.set(item.group, { group: item.group, possible: 0, detected: 0, categories: [] });
    }
    groups.get(item.group).possible += 1;
  }

  const detectedByGroup = new Map();
  for (const label of labels) {
    if (!detectedByGroup.has(label.group)) {
      detectedByGroup.set(label.group, new Set());
    }
    detectedByGroup.get(label.group).add(label.category);
  }

  for (const [group, categories] of detectedByGroup.entries()) {
    const entry = groups.get(group);
    entry.detected = categories.size;
    entry.categories = [...categories].sort();
  }

  return [...groups.values()]
    .filter((entry) => entry.detected > 0)
    .sort((a, b) => b.detected - a.detected || a.group.localeCompare(b.group));
}

function normalizeText(rawText) {
  return String(rawText || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractClauses(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates = paragraphs.length > 1 ? paragraphs : text.split(/(?<=[.;:])\s+(?=[A-Z])/);
  const clauses = candidates
    .map((part) => part.replace(/^\d+(\.\d+)*\s+/, "").trim())
    .filter((part) => countWords(part) >= 7)
    .map((part, index) => ({
      id: `C${String(index + 1).padStart(2, "0")}`,
      heading: inferClauseHeading(part),
      text: part,
      wordCount: countWords(part)
    }));

  return clauses.length ? clauses : [{ id: "C01", heading: "Document Text", text, wordCount: countWords(text) }];
}

function inferClauseHeading(text) {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length < 56 && /^[A-Z][A-Z\s&-]+$/.test(firstLine)) {
    return titleCase(firstLine);
  }

  const lower = text.toLowerCase();
  if (lower.includes("arbitration") || lower.includes("dispute")) return "Dispute Resolution";
  if (lower.includes("indemn")) return "Indemnity";
  if (lower.includes("confidential")) return "Confidentiality";
  if (lower.includes("renew")) return "Renewal";
  if (lower.includes("terminate")) return "Termination";
  if (lower.includes("personal data") || lower.includes("privacy")) return "Privacy";
  if (lower.includes("invention") || lower.includes("intellectual") || lower.includes("assign")) return "Intellectual Property";
  if (lower.includes("payment") || lower.includes("fee")) return "Payment";
  return "General Terms";
}

function inferContractType(text, explicitType) {
  if (explicitType && explicitType !== "auto") {
    return explicitType;
  }

  const lower = text.toLowerCase();
  const scores = {
    employment: scoreKeywords(lower, ["employee", "employment", "company", "non-compete", "termination for any reason", "business time"]),
    subscription: scoreKeywords(lower, ["subscription", "membership", "auto", "renew", "provider", "user", "non-refundable"]),
    freelance: scoreKeywords(lower, ["contractor", "freelance", "deliverables", "client", "portfolio", "acceptance"]),
    vendor: scoreKeywords(lower, ["vendor", "master services", "customer", "audit", "subcontractors", "service failures"]),
    privacy: scoreKeywords(lower, ["personal data", "privacy", "device identifiers", "location", "advertising", "retention"])
  };

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "general";
}

function samplePersonaForType(type) {
  return {
    employment: "employee",
    subscription: "consumer",
    privacy: "consumer",
    freelance: "founder",
    vendor: "vendor"
  }[type] || "individual";
}

function scoreKeywords(text, keywords) {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function findEvidence(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return snippetAround(text, match.index || 0, match[0].length);
    }
  }
  return null;
}

function scoreSignal(signal, text, detectedType, persona) {
  let score = signal.weight;
  const lowerPersona = String(persona || "").toLowerCase();
  const profile = personaProfiles[lowerPersona] || personaProfiles.individual;

  if (detectedType === "employment" && signal.dimension === "mobility") score += 7;
  if (detectedType === "freelance" && signal.dimension === "ip") score += 7;
  if (detectedType === "subscription" && signal.dimension === "privacy") score += 6;
  if (detectedType === "vendor" && signal.dimension === "compliance") score += 6;
  score += profile.dimensionBoosts[signal.dimension] || 0;
  score += profile.dimensionPenalties[signal.dimension] || 0;

  for (const item of intensifiers) {
    if (item.pattern.test(text)) score += item.value;
  }
  for (const item of mitigators) {
    if (item.pattern.test(text)) score += item.value;
  }

  return clamp(Math.round(score), 15, 100);
}

function buildFinding({ signal, clause, score, evidence, detectedType, persona }) {
  const activeIntensifiers = intensifiers
    .filter((item) => item.pattern.test(clause.text))
    .map((item) => item.label);
  const activeMitigators = mitigators
    .filter((item) => item.pattern.test(clause.text))
    .map((item) => item.label);
  const profile = personaProfiles[persona] || personaProfiles.individual;
  const personaPriority = profile.primaryDimensions.includes(signal.dimension) ? "High" : "Normal";

  return {
    id: `${signal.id}-${clause.id}`,
    title: signal.title,
    category: signal.category,
    dimension: signal.dimension,
    dimensionLabel: dimensionLabels[signal.dimension],
    severity: severityFromScore(score),
    score,
    confidence: confidenceFromEvidence(signal, clause.text),
    clauseId: clause.id,
    clauseHeading: clause.heading,
    evidence,
    explanation: signal.explanation,
    realWorldImpact: personalizeImpact(signal.impact, persona, detectedType),
    negotiationAsk: signal.negotiation,
    benchmark: signal.benchmark,
    whyFlagged: [
      ...activeIntensifiers,
      ...activeMitigators.map((item) => `mitigator: ${item}`),
      ...(personaPriority === "High" ? [`${profile.label} priority`] : [])
    ],
    personaPriority,
    affectedParty: persona
  };
}

function detectCrossClauseRisks(text, clauses, detectedType, persona) {
  const findings = [];
  const lower = text.toLowerCase();

  if (/indemn/i.test(text) && /aggregate liability shall not exceed|total liability is limited/i.test(text)) {
    findings.push(crossFinding({
      id: "liability-asymmetry",
      title: "Liability Stack Asymmetry",
      category: "Financial Liability",
      dimension: "financial",
      score: 86,
      clause: nearestClause(clauses, /indemn|liability/i),
      evidence: "Indemnity and liability-limit language appear together, creating a possible one-way exposure stack.",
      explanation: "The contract may require one side to cover broad claims while the other side caps its own responsibility.",
      impact: "This can make the downside much larger than the value of the deal.",
      negotiation: "Align liability caps and indemnity carveouts so both sides carry proportionate risk.",
      benchmark: "Risk allocation should be reciprocal and economically connected to contract value.",
      persona
    }));
  }

  if (/may modify|may change/i.test(text) && /continued .* constitutes acceptance|posting .* website/i.test(lower)) {
    findings.push(crossFinding({
      id: "silent-change-acceptance",
      title: "Silent Acceptance of Future Changes",
      category: "Ambiguity & Control",
      dimension: "control",
      score: 74,
      clause: nearestClause(clauses, /modify|change|continued|posting/i),
      evidence: "Modification language is paired with passive acceptance through continued use or employment.",
      explanation: "The affected party may become bound to future terms without active consent.",
      impact: "Important economics, privacy rights, or working conditions can shift after signature.",
      negotiation: "Require clear notice and affirmative consent for material changes.",
      benchmark: "Material changes should be conspicuous and prospective.",
      persona
    }));
  }

  if (/automatic|automatically/i.test(lower) && /non[-\s]?refundable|no refunds?/i.test(lower)) {
    findings.push(crossFinding({
      id: "renewal-no-refund",
      title: "Renewal Lock-In With No Refund",
      category: "Payments & Renewal",
      dimension: "financial",
      score: 71,
      clause: nearestClause(clauses, /renew|refund/i),
      evidence: "Auto-renewal and no-refund language combine into a lock-in risk.",
      explanation: "Missing one notice date can trigger a new term with little practical exit.",
      impact: "The affected person may pay for a service they no longer want or use.",
      negotiation: "Add renewal reminders, one-click cancellation, and prorated refunds.",
      benchmark: "Fair subscription terms make cancellation visible and reversible before renewal.",
      persona
    }));
  }

  return findings;
}

function crossFinding({ id, title, category, dimension, score, clause, evidence, explanation, impact, negotiation, benchmark, persona }) {
  const profile = personaProfiles[persona] || personaProfiles.individual;
  const adjustedScore = clamp(score + (profile.dimensionBoosts[dimension] || 0) + (profile.dimensionPenalties[dimension] || 0), 15, 100);
  const personaPriority = profile.primaryDimensions.includes(dimension) ? "High" : "Normal";

  return {
    id,
    title,
    category,
    dimension,
    dimensionLabel: dimensionLabels[dimension],
    severity: severityFromScore(adjustedScore),
    score: adjustedScore,
    confidence: 78,
    clauseId: clause?.id || "C01",
    clauseHeading: clause?.heading || "Cross-Clause Reasoning",
    evidence,
    explanation,
    realWorldImpact: personalizeImpact(impact, persona),
    negotiationAsk: negotiation,
    benchmark,
    whyFlagged: ["cross-clause pattern", ...(personaPriority === "High" ? [`${profile.label} priority`] : [])],
    personaPriority,
    affectedParty: persona
  };
}

function nearestClause(clauses, pattern) {
  return clauses.find((clause) => pattern.test(clause.text)) || clauses[0];
}

function dedupeFindings(findings) {
  const best = new Map();
  for (const finding of findings) {
    const key = `${finding.title}-${finding.clauseId}`;
    const previous = best.get(key);
    if (!previous || finding.score > previous.score) {
      best.set(key, finding);
    }
  }
  return [...best.values()];
}

function scoreDimensions(findings) {
  const dimensions = Object.entries(dimensionLabels).map(([key, label]) => {
    const related = findings.filter((finding) => finding.dimension === key);
    const score = related.length ? Math.round(Math.min(100, related.reduce((sum, finding) => sum + finding.score, 0) / Math.max(1, related.length) + related.length * 3)) : 0;
    return {
      id: key,
      label,
      score,
      findingCount: related.length,
      severity: severityFromScore(score)
    };
  });

  return dimensions.sort((a, b) => b.score - a.score);
}

function buildMetrics(findings, clauses, dimensions, text) {
  const weighted = findings.reduce((sum, finding, index) => sum + finding.score * (index < 3 ? 1.05 : 0.82), 0);
  const density = findings.length / Math.max(1, clauses.length);
  const severeCount = findings.filter((finding) => ["High", "Critical"].includes(finding.severity)).length;
  const riskScore = clamp(Math.round(weighted / Math.max(1, findings.length) + Math.min(16, density * 7) + Math.min(10, severeCount * 2)), 0, 100);
  const topCategory = findings[0]?.category || "No major risk category";
  const ambiguityScore = Math.min(100, vagueTerms.reduce((sum, term) => sum + occurrences(text.toLowerCase(), term), 0) * 8);

  return {
    riskScore,
    riskLevel: severityFromScore(riskScore),
    topCategory,
    highRiskFindings: severeCount,
    totalFindings: findings.length,
    averageConfidence: findings.length ? Math.round(findings.reduce((sum, finding) => sum + finding.confidence, 0) / findings.length) : 0,
    highestDimension: dimensions[0] || null,
    ambiguityScore,
    reviewDepth: clauses.length > 4 ? "clause-level" : "excerpt-level"
  };
}

function buildSummary(metrics, findings, detectedType, persona) {
  if (!findings.length) {
    return `This ${detectedType} document did not trigger major risk patterns for the ${persona} profile. A legal review should still check jurisdiction-specific enforceability and missing clauses.`;
  }

  const profile = personaProfiles[persona] || personaProfiles.individual;
  const top = findings.slice(0, 3).map((finding) => finding.title).join(", ");
  return `For the ${profile.label} profile, this ${detectedType} document scores ${metrics.riskScore}/100 (${metrics.riskLevel}). The main pressure points are ${top}. The role lens focuses on ${profile.lens}.`;
}

function buildPersonaProfile(persona, findings, dimensions) {
  const profile = personaProfiles[persona] || personaProfiles.individual;
  const priorityFindings = findings.filter((finding) => profile.primaryDimensions.includes(finding.dimension));
  const topPriority = priorityFindings[0] || findings[0] || null;
  const dimensionFocus = profile.primaryDimensions
    .map((dimension) => dimensions.find((item) => item.id === dimension))
    .filter(Boolean)
    .slice(0, 4);

  return {
    id: persona,
    label: profile.label,
    lens: profile.lens,
    topConcern: profile.topConcern,
    primaryDimensions: profile.primaryDimensions,
    priorityFindingCount: priorityFindings.length,
    topPriorityFinding: topPriority
      ? {
          title: topPriority.title,
          clauseId: topPriority.clauseId,
          score: topPriority.score,
          severity: topPriority.severity
        }
      : null,
    dimensionFocus
  };
}

function extractObligations(clauses) {
  const obligationPatterns = [
    /shall\s+[^.]+/gi,
    /must\s+[^.]+/gi,
    /is required to\s+[^.]+/gi,
    /agrees to\s+[^.]+/gi
  ];
  const obligations = [];

  for (const clause of clauses) {
    for (const pattern of obligationPatterns) {
      const matches = clause.text.match(pattern) || [];
      for (const match of matches.slice(0, 2)) {
        obligations.push({
          clauseId: clause.id,
          text: trimSentence(match),
          burden: burdenLabel(match),
          category: obligationCategory(match)
        });
      }
    }
  }

  return obligations.slice(0, 8);
}

function burdenLabel(text) {
  if (/indemn|pay|fee|expense|remediate/i.test(text)) return "Financial";
  if (/not|without|waive|confidential|compete/i.test(text)) return "Restriction";
  if (/comply|audit|provide|cooperate/i.test(text)) return "Operational";
  return "General";
}

function obligationCategory(text) {
  if (/data|privacy|security/i.test(text)) return "Privacy";
  if (/invent|deliver|assign|license/i.test(text)) return "IP";
  if (/arbitr|waive|court|dispute/i.test(text)) return "Dispute";
  if (/pay|fee|refund|expense/i.test(text)) return "Payment";
  return "Performance";
}

function analyzeAmbiguity(text, clauses) {
  const terms = vagueTerms
    .map((term) => ({
      term,
      count: occurrences(text.toLowerCase(), term),
      clauses: clauses.filter((clause) => clause.text.toLowerCase().includes(term)).map((clause) => clause.id)
    }))
    .filter((entry) => entry.count > 0);

  const score = Math.min(100, terms.reduce((sum, entry) => sum + entry.count, 0) * 8);
  return {
    score,
    level: severityFromScore(score),
    terms,
    note: terms.length
      ? "Ambiguous language should be converted into objective standards, timelines, notice rules, and measurable triggers."
      : "Few common ambiguity markers were detected."
  };
}

function buildAgentPanel(findings, dimensions, persona) {
  const top = findings[0];
  const topDimension = dimensions[0];

  return [
    {
      role: "Rights Advocate",
      stance: top ? `Push back first on ${top.title.toLowerCase()} because it creates the clearest practical harm for the ${persona}.` : "No major pressure point detected.",
      focus: "Personal impact"
    },
    {
      role: "Contract Counsel",
      stance: top ? `Tie edits to narrow definitions, mutuality, notice, and objective triggers around ${top.category.toLowerCase()}.` : "Confirm enforceability and missing protective clauses.",
      focus: "Clause drafting"
    },
    {
      role: "Risk Officer",
      stance: topDimension ? `${topDimension.label} is the highest risk dimension at ${topDimension.score}/100 and should drive approval conditions.` : "No risk dimension dominates.",
      focus: "Operational exposure"
    },
    {
      role: "Negotiation Coach",
      stance: top ? `Open with this ask: ${top.negotiationAsk}` : "Use a light clarification memo before signature.",
      focus: "Next best ask"
    }
  ];
}

function buildNegotiationPlan(findings) {
  return [...findings]
    .sort((a, b) => priorityRank(b) - priorityRank(a) || b.score - a.score)
    .slice(0, 6)
    .map((finding, index) => ({
    priority: index + 1,
    severity: finding.severity,
    title: finding.title,
    ask: finding.negotiationAsk,
    fallback: fallbackFor(finding),
    clauseId: finding.clauseId,
    personaPriority: finding.personaPriority || "Normal"
  }));
}

function priorityRank(finding) {
  return finding.personaPriority === "High" ? 1 : 0;
}

function fallbackFor(finding) {
  if (finding.dimension === "financial") return "If the other side refuses, require a liability cap, notice process, and insurance-backed limit.";
  if (finding.dimension === "ip") return "If assignment stays broad, attach a schedule of excluded background IP and portfolio rights.";
  if (finding.dimension === "privacy") return "If data sharing remains, require opt-out, deletion, retention limits, and no sale of sensitive data.";
  if (finding.dimension === "mobility") return "If the restriction remains, reduce geography, duration, covered roles, and competitor scope.";
  if (finding.dimension === "dispute") return "If arbitration remains, preserve small-claims court and make fees/forum mutual.";
  return "If the clause remains, require written notice, objective criteria, and a right to terminate.";
}

function buildScenarioSimulation(findings, persona) {
  const scenarios = [
    {
      trigger: "You leave, cancel, or the project ends.",
      consequence: consequenceFor(findings, ["mobility", "financial", "control"], persona),
      severity: maxSeverity(findings, ["mobility", "financial", "control"])
    },
    {
      trigger: "A dispute or customer complaint occurs.",
      consequence: consequenceFor(findings, ["dispute", "financial"], persona),
      severity: maxSeverity(findings, ["dispute", "financial"])
    },
    {
      trigger: "Your data, work product, or tools become valuable.",
      consequence: consequenceFor(findings, ["privacy", "ip"], persona),
      severity: maxSeverity(findings, ["privacy", "ip"])
    }
  ];

  return scenarios;
}

function consequenceFor(findings, dimensions, persona) {
  const related = findings.filter((finding) => dimensions.includes(finding.dimension));
  if (!related.length) return `No major ${dimensions.map((item) => dimensionLabels[item]).join(" or ")} risk was detected for the ${persona}.`;
  const top = related.sort((a, b) => b.score - a.score)[0];
  return `${top.title}: ${top.realWorldImpact}`;
}

function maxSeverity(findings, dimensions) {
  const max = findings.filter((finding) => dimensions.includes(finding.dimension)).reduce((score, finding) => Math.max(score, finding.score), 0);
  return severityFromScore(max);
}

function buildBenchmarks(findings) {
  const byCategory = new Map();
  for (const finding of findings) {
    if (!byCategory.has(finding.category)) {
      byCategory.set(finding.category, finding.benchmark);
    }
  }
  return [...byCategory.entries()].map(([category, benchmark]) => ({ category, benchmark })).slice(0, 6);
}

function clauseRiskScore(clauseId, findings) {
  const related = findings.filter((finding) => finding.clauseId === clauseId);
  return related.length ? Math.max(...related.map((finding) => finding.score)) : 0;
}

function severityFromScore(score) {
  if (score >= 80) return "Critical";
  if (score >= 62) return "High";
  if (score >= 38) return "Medium";
  if (score > 0) return "Low";
  return "Clear";
}

function confidenceFromEvidence(signal, text) {
  const matches = signal.patterns.filter((pattern) => pattern.test(text)).length;
  const boost = intensifiers.filter((item) => item.pattern.test(text)).length * 3;
  return clamp(68 + matches * 8 + boost, 55, 96);
}

function personalizeImpact(impact, persona, detectedType = "contract") {
  const rolePhrase = {
    employee: "For an employee,",
    consumer: "For a consumer,",
    founder: "For a founder or contractor,",
    vendor: "For a vendor,"
  }[persona] || "For the affected party,";
  return `${rolePhrase} ${impact.charAt(0).toLowerCase()}${impact.slice(1)} (${detectedType} context).`;
}

function snippetAround(text, index, length) {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length + 130);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function trimSentence(text) {
  return text.replace(/\s+/g, " ").replace(/[.;:,]$/, "").trim();
}

function countWords(text) {
  return (String(text).match(/\b[\w'-]+\b/g) || []).length;
}

function occurrences(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(escaped, "g")) || []).length;
}

function titleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
