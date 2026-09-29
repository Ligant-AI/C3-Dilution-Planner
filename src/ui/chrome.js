// The suite's header and footer come from @ligant/bench-chrome, shared by every
// Ligant Bench Tool. This file supplies only what is this tool's own: its path,
// title and description, its repository, its citation and its disclaimer.
import { renderHeader as suiteHeader, renderFooter as suiteFooter, markSvg } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
import { escapeHtml as esc } from './page-content.js';

const RESEARCH_USE = 'Research use only. Not qualified for GxP decision-making.';

export function renderHeader() {
  return suiteHeader({ path: `/${CONFIG.slug}/`, title: CONFIG.toolTitle, description: CONFIG.tagline });
}

/** The software citation, in the pieces the footer shows and copies. */
function citation() {
  const tail = ` (v${CONFIG.version}) [Computer software]. ${CONFIG.legalEntity}. ${CONFIG.publicBase.replace('https://', '')}${CONFIG.slug}/`;
  return {
    lead: `${CONFIG.citationAuthor} (${CONFIG.citationYear}). `,
    title: CONFIG.toolTitle,
    tail: CONFIG.doi ? `${tail} doi:${CONFIG.doi}` : tail,
  };
}

export function renderFooter() {
  return suiteFooter({
    repoUrl: CONFIG.repositoryUrl,
    citations: [citation()],
    citationFootnote: CONFIG.doi
      ? 'The identifier is given as text, not as a link: a link that navigated to a publisher would disclose a visit that the rest of the tool is built to prevent.'
      : 'No identifier is stated: one is minted when the tool is released, and a placeholder would read as a record that does not exist.',
    disclaimer: RESEARCH_USE,
  });
}

/** The scope statement under the footer, in this tool's own terms. */
export function renderDisclaimer() {
  return `<strong>${RESEARCH_USE}</strong> ${esc(CONFIG.scopeNote)}`;
}

export function renderColophon() {
  return `${markSvg({ size: 16 })}<span>${esc(CONFIG.publisher)} · ${esc(CONFIG.toolTitle)} v${esc(CONFIG.version)}</span>`;
}
