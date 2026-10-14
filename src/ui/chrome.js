import { renderHeader as suiteHeader, renderFooter as suiteFooter, markSvg } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
import { escapeHtml as esc } from './page-content.js';
const RESEARCH_USE = 'Research use only. Not qualified for GxP decision-making.';
export function renderHeader() {
    return suiteHeader({ path: `/${CONFIG.slug}/`, title: CONFIG.toolTitle, description: CONFIG.tagline });
}
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
            ? 'References are given as text rather than links, so the page itself sends no visit to a publisher.'
            : 'No identifier is stated: one is minted when the tool is released, and a placeholder would read as a record that does not exist.',
        disclaimer: RESEARCH_USE,
    });
}
export function renderDisclaimer() {
    return `<strong>${RESEARCH_USE}</strong> ${esc(CONFIG.scopeNote)}`;
}
export function renderColophon() {
    return `${markSvg({ size: 16 })}<span>${esc(CONFIG.publisher)} · ${esc(CONFIG.toolTitle)} v${esc(CONFIG.version)}</span>`;
}
