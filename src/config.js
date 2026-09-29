// Page-level configuration. Single strings, sourced here and nowhere else.
// The header and footer are the suite's, from @ligant/bench-chrome (see
// src/ui/chrome.js); what is here is what this tool supplies to them.
export const CONFIG = Object.freeze({
  toolTitle: 'Dilution Planner',
  toolId: 'C3',
  productLine: 'Ligant Bench Tools',
  publisher: 'Ligant',
  legalEntity: 'Ligant AI Incorporated',
  version: '1.1.1', // moves with the engine
  slug: 'dilution-planner',
  publicBase: 'https://benchtools.ligant.ai/',
  repositoryUrl: 'https://github.com/Ligant-AI/C3-Dilution-Planner',
  repositoryLabel: 'github.com/Ligant-AI/C3-Dilution-Planner',
  // The DOI is minted at release; until then the citation carries no DOI rather
  // than a placeholder that would read as a record.
  doi: null,
  citationAuthor: 'Modi, A.B.',
  citationYear: '2026',
  // The one-line summary under the title, and the paragraph that follows it.
  tagline: 'Plans the volumes to combine to reach a stated target concentration, or an ordered set of them, from a stated stock, including any single intermediate dilution a step needs to be pipettable. Every value is computed deterministically by arithmetic you can read. No model and no inference is applied to any reported number.',
  standfirst: 'A dilution is arithmetic a spreadsheet performs correctly and records incompletely. What the stated volume is the volume of, whether the series was prepared serially or independently and from which vessel, and whether the plan is preparable at all are invisible in the resulting numbers. This tool asks for all three and puts them in the result.',
  // The scope statement, in this tool's own terms (the house callout).
  scopeNote: 'This tool plans the preparation of a dilution or a dilution series. It does not prepare it, does not observe what was pipetted, does not analyse the resulting data, and cannot detect a stock concentration that is wrong. All computation is performed locally in this browser. Nothing you enter is transmitted.',
});

