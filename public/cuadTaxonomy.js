export const cuadClauseTaxonomy = [
  {
    id: "document-name",
    label: "Document Name",
    group: "Metadata",
    dimension: "control",
    answerFormat: "Contract name",
    description: "The name of the contract.",
    patterns: [/agreement|contract|terms|policy|schedule/i],
    reviewUse: "Metadata extraction"
  },
  {
    id: "parties",
    label: "Parties",
    group: "Metadata",
    dimension: "control",
    answerFormat: "Entity or individual names",
    description: "The two or more parties who signed the contract.",
    patterns: [/between .* and |party|parties|client|vendor|company|employee|contractor/i],
    reviewUse: "Metadata extraction"
  },
  {
    id: "agreement-date",
    label: "Agreement Date",
    group: "Timeline",
    dimension: "control",
    answerFormat: "Date",
    description: "The date of the contract.",
    patterns: [/agreement date|dated as of|entered into/i],
    reviewUse: "Timeline review"
  },
  {
    id: "effective-date",
    label: "Effective Date",
    group: "Timeline",
    dimension: "control",
    answerFormat: "Date",
    description: "The date when the contract becomes effective.",
    patterns: [/effective date|becomes effective|commence/i],
    reviewUse: "Timeline review"
  },
  {
    id: "expiration-date",
    label: "Expiration Date",
    group: "Timeline",
    dimension: "control",
    answerFormat: "Date or perpetual",
    description: "The date when the initial term expires.",
    patterns: [/expire|expiration|initial term|perpetual/i],
    reviewUse: "Timeline review"
  },
  {
    id: "renewal-term",
    label: "Renewal Term",
    group: "Timeline",
    dimension: "financial",
    answerFormat: "Renewal period",
    description: "The renewal term after the initial term expires, including automatic extensions.",
    patterns: [/renew|renewal|successive|automatic extension|automatically/i],
    reviewUse: "Commercial lock-in"
  },
  {
    id: "notice-period-to-terminate-renewal",
    label: "Notice Period to Terminate Renewal",
    group: "Timeline",
    dimension: "financial",
    answerFormat: "Notice period",
    description: "The notice period required to terminate renewal.",
    patterns: [/notice period|days before|months before|terminate renewal|cancelled? at least/i],
    reviewUse: "Commercial lock-in"
  },
  {
    id: "governing-law",
    label: "Governing Law",
    group: "Disputes",
    dimension: "dispute",
    answerFormat: "State, province, or country",
    description: "Which jurisdiction's law governs the interpretation of the contract.",
    patterns: [/governed by|governing law|laws of the|jurisdiction/i],
    reviewUse: "Dispute planning"
  },
  {
    id: "most-favored-nation",
    label: "Most Favored Nation",
    group: "Commercial Terms",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "Whether better third-party terms must be extended to the counterparty.",
    patterns: [/most favored|most favoured|better terms|no less favorable|no less favourable/i],
    reviewUse: "Pricing and margin risk"
  },
  {
    id: "non-compete",
    label: "Non-Compete",
    group: "Restrictive Covenants",
    dimension: "mobility",
    answerFormat: "Yes or no",
    description: "A restriction on a party competing with the counterparty or operating in a geography, business, or technology sector.",
    patterns: [/non[-\s]?compete|shall not.*compete|competes with|competitive business|anticipated product line/i],
    reviewUse: "Mobility and market access"
  },
  {
    id: "exclusivity",
    label: "Exclusivity",
    group: "Restrictive Covenants",
    dimension: "mobility",
    answerFormat: "Yes or no",
    description: "An exclusive dealing commitment or restriction on licensing, selling, collaborating, or working with others.",
    patterns: [/exclusive|exclusively|requirements from|not.*(license|sell|collaborate|work).*third/i],
    reviewUse: "Market access"
  },
  {
    id: "no-solicit-of-customers",
    label: "No-Solicit of Customers",
    group: "Restrictive Covenants",
    dimension: "mobility",
    answerFormat: "Yes or no",
    description: "A restriction on contracting with or soliciting customers or partners of the counterparty.",
    patterns: [/solicit.*(customer|client|partner)|customers.*counterparty|clients.*counterparty/i],
    reviewUse: "Revenue mobility"
  },
  {
    id: "competitive-restriction-exception",
    label: "Competitive Restriction Exception",
    group: "Restrictive Covenants",
    dimension: "mobility",
    answerFormat: "Yes or no",
    description: "Exceptions or carveouts to non-compete, exclusivity, or no-solicit restrictions.",
    patterns: [/except|carve[-\s]?out|shall not apply|permitted|passive investment/i],
    reviewUse: "Restriction mitigation"
  },
  {
    id: "no-solicit-of-employees",
    label: "No-Solicit of Employees",
    group: "Restrictive Covenants",
    dimension: "mobility",
    answerFormat: "Yes or no",
    description: "A restriction on soliciting or hiring employees or contractors of the counterparty.",
    patterns: [/solicit.*(employee|contractor)|hire.*(employee|contractor)|non[-\s]?solicitation/i],
    reviewUse: "Hiring restriction"
  },
  {
    id: "non-disparagement",
    label: "Non-Disparagement",
    group: "Restrictive Covenants",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "A requirement not to disparage the counterparty.",
    patterns: [/disparage|non[-\s]?disparagement|negative statement/i],
    reviewUse: "Speech restriction"
  },
  {
    id: "termination-for-convenience",
    label: "Termination for Convenience",
    group: "Termination",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "Whether a party can terminate without cause by giving notice and waiting for a period to expire.",
    patterns: [/terminate for convenience|terminate .* without cause|may terminate .* at any time/i],
    reviewUse: "Exit rights"
  },
  {
    id: "rofr-rofo-rofn",
    label: "Rofr/Rofo/Rofn",
    group: "Commercial Terms",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "A right of first refusal, first offer, or first negotiation.",
    patterns: [/right of first refusal|right of first offer|right of first negotiation|rofr|rofo|rofn/i],
    reviewUse: "Strategic control"
  },
  {
    id: "change-of-control",
    label: "Change of Control",
    group: "Assignment",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "Rights triggered if a party undergoes merger, stock sale, asset transfer, or assignment by operation of law.",
    patterns: [/change of control|merger|stock sale|substantially all.*assets|assignment by operation of law/i],
    reviewUse: "Transaction readiness"
  },
  {
    id: "anti-assignment",
    label: "Anti-Assignment",
    group: "Assignment",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "Consent or notice required before assigning the contract to a third party.",
    patterns: [/anti[-\s]?assignment|may not assign|shall not assign|assignment of this agreement|assign this agreement|consent.*assignment|notice.*assignment|may not transfer.*agreement/i],
    reviewUse: "Transferability"
  },
  {
    id: "revenue-profit-sharing",
    label: "Revenue/Profit Sharing",
    group: "Commercial Terms",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A requirement to share revenue or profit with the counterparty.",
    patterns: [/revenue share|profit share|share.*revenue|share.*profit|royalty/i],
    reviewUse: "Economics"
  },
  {
    id: "price-restrictions",
    label: "Price Restrictions",
    group: "Commercial Terms",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A restriction on raising or reducing prices.",
    patterns: [/price restriction|pricing restriction|may not.*(raise|reduce).*price|price increase/i],
    reviewUse: "Pricing flexibility"
  },
  {
    id: "minimum-commitment",
    label: "Minimum Commitment",
    group: "Commercial Terms",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A minimum order size, minimum spend, or minimum unit commitment.",
    patterns: [/minimum (commitment|order|purchase|spend)|minimum amount|minimum units/i],
    reviewUse: "Spend obligation"
  },
  {
    id: "volume-restriction",
    label: "Volume Restriction",
    group: "Commercial Terms",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A fee increase, consent requirement, or similar trigger when use exceeds a threshold.",
    patterns: [/volume restriction|exceeds .* threshold|usage.*threshold|overage|fee increase/i],
    reviewUse: "Scale cost"
  },
  {
    id: "ip-ownership-assignment",
    label: "IP Ownership Assignment",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "Intellectual property created by one party becomes property of the counterparty.",
    patterns: [/ip ownership|intellectual property.*(assign|own)|sole and exclusive property|rights, title, and interest|irrevocably assigns/i],
    reviewUse: "Ownership transfer"
  },
  {
    id: "joint-ip-ownership",
    label: "Joint IP Ownership",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "Joint or shared ownership of intellectual property.",
    patterns: [/joint.*(ownership|own)|shared.*(ownership|own)|co[-\s]?own/i],
    reviewUse: "Ownership ambiguity"
  },
  {
    id: "license-grant",
    label: "License Grant",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A license granted by one party to its counterparty.",
    patterns: [/grants?.*license|license.*granted|licensed to|right to use/i],
    reviewUse: "Use rights"
  },
  {
    id: "non-transferable-license",
    label: "Non-Transferable License",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A limit on transferring the license to a third party.",
    patterns: [/non[-\s]?transferable license|license.*non[-\s]?transferable|may not transfer.*license/i],
    reviewUse: "Transferability"
  },
  {
    id: "affiliate-license-licensor",
    label: "Affiliate License-Licensor",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A license grant by affiliates of the licensor or including affiliate IP.",
    patterns: [/affiliates? of the licensor|licensor.*affiliates?|affiliate.*intellectual property/i],
    reviewUse: "Affiliate scope"
  },
  {
    id: "affiliate-license-licensee",
    label: "Affiliate License-Licensee",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A license grant to a licensee and its affiliates or sublicensor.",
    patterns: [/licensee.*affiliates?|sublicensor.*affiliates?|affiliates?.*right to use/i],
    reviewUse: "Affiliate scope"
  },
  {
    id: "unlimited-all-you-can-eat-license",
    label: "Unlimited/All-You-Can-Eat License",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "An enterprise, all-you-can-eat, or unlimited usage license.",
    patterns: [/unlimited.*license|enterprise.*license|all[-\s]?you[-\s]?can[-\s]?eat|unlimited usage/i],
    reviewUse: "Usage scope"
  },
  {
    id: "irrevocable-or-perpetual-license",
    label: "Irrevocable or Perpetual License",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A license grant that is irrevocable or perpetual.",
    patterns: [/irrevocable.*license|perpetual.*license|perpetual.*worldwide.*irrevocable/i],
    reviewUse: "License duration"
  },
  {
    id: "source-code-escrow",
    label: "Source Code Escrow",
    group: "Intellectual Property",
    dimension: "ip",
    answerFormat: "Yes or no",
    description: "A requirement to deposit source code into escrow for release after trigger events.",
    patterns: [/source code escrow|deposit.*source code|escrow.*source code/i],
    reviewUse: "Technology control"
  },
  {
    id: "post-termination-services",
    label: "Post-Termination Services",
    group: "Termination",
    dimension: "control",
    answerFormat: "Yes or no",
    description: "Obligations after termination or expiration, including transition, payment, transfer of IP, wind-down, or last-buy commitments.",
    patterns: [/post[-\s]?termination|after termination|survive termination|transition services|wind[-\s]?down|last[-\s]?buy/i],
    reviewUse: "Residual obligations"
  },
  {
    id: "audit-rights",
    label: "Audit Rights",
    group: "Compliance",
    dimension: "compliance",
    answerFormat: "Yes or no",
    description: "A right to audit books, records, or physical locations for compliance.",
    patterns: [/audit right|may audit|audit .* records|books.*records|physical locations/i],
    reviewUse: "Operational burden"
  },
  {
    id: "uncapped-liability",
    label: "Uncapped Liability",
    group: "Liability",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A party's liability is uncapped for breach or specified categories such as IP or confidentiality.",
    patterns: [/uncapped liability|liability.*uncapped|not subject to.*cap|excluded from.*limitation/i],
    reviewUse: "Loss exposure"
  },
  {
    id: "cap-on-liability",
    label: "Cap on Liability",
    group: "Liability",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A cap on liability, claim timing, or maximum recovery.",
    patterns: [/cap on liability|liability.*limited|aggregate liability|total liability|not exceed/i],
    reviewUse: "Loss allocation"
  },
  {
    id: "liquidated-damages",
    label: "Liquidated Damages",
    group: "Liability",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A fixed damages award or termination fee for breach or termination.",
    patterns: [/liquidated damages|termination fee|break[-\s]?up fee|fixed damages/i],
    reviewUse: "Preset penalties"
  },
  {
    id: "warranty-duration",
    label: "Warranty Duration",
    group: "Warranty",
    dimension: "financial",
    answerFormat: "Warranty period",
    description: "Duration of warranty against defects or errors in products or services.",
    patterns: [/warranty.*(days|months|years|period)|warrants for|warranty duration/i],
    reviewUse: "Defect coverage"
  },
  {
    id: "insurance",
    label: "Insurance",
    group: "Liability",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A requirement to maintain insurance for the benefit of the counterparty.",
    patterns: [/insurance|insured|policy limits|commercial general liability|errors and omissions/i],
    reviewUse: "Risk backing"
  },
  {
    id: "covenant-not-to-sue",
    label: "Covenant Not to Sue",
    group: "Disputes",
    dimension: "dispute",
    answerFormat: "Yes or no",
    description: "A restriction on contesting IP validity or bringing unrelated claims against the counterparty.",
    patterns: [/covenant not to sue|not.*contest.*validity|shall not.*bring.*claim|not now or in the future contest/i],
    reviewUse: "Claim waiver"
  },
  {
    id: "third-party-beneficiary",
    label: "Third Party Beneficiary",
    group: "Liability",
    dimension: "financial",
    answerFormat: "Yes or no",
    description: "A non-contracting party can enforce rights under the contract.",
    patterns: [/third[-\s]?party beneficiar|beneficiaries|may enforce.*rights/i],
    reviewUse: "Expanded enforcement"
  }
];

export const cuadCategoryCount = cuadClauseTaxonomy.length;
