// Standard Ligant Bench Tools chrome: the masthead, the footer, the disclaimer
// and the colophon, identical in structure and class names to the shipped
// Antibody Titration Planner and Antigen Density Calculator. Only the strings in
// src/config.js differ between tools.
import { CONFIG, toolUrl, citationText } from '../config.js';
import { markSvg, lockupHtml } from './mark.js';
import { escapeHtml as esc } from './page-content.js';

const RESEARCH_USE = 'Research use only. Not qualified for GxP decision-making.';

export function renderHeader() {
  const nav = CONFIG.tools.map((t) => `<li>${t.slug === CONFIG.slug
    ? `<span aria-current="page">${esc(t.label)}</span>`
    : `<a href="${esc(toolUrl(t.slug))}">${esc(t.label)}</a>`}</li>`).join('');
  return `
    <div>
      <a class="lockup-link" href="${esc(CONFIG.homeUrl)}">${lockupHtml(28)}</a>
      <h1>${esc(CONFIG.toolTitle)}</h1>
      <p>${esc(CONFIG.tagline)}</p>
    </div>
    <nav class="tool-nav" aria-label="Bench tools">
      <ul>${nav}</ul>
      <a class="eyebrow suite-mark" href="${esc(CONFIG.publicBase)}">${esc(CONFIG.suiteLabel)}</a>
    </nav>`;
}

export function renderFooter() {
  const repo = `<a href="${esc(CONFIG.repositoryUrl)}">${esc(CONFIG.repositoryLabel)}</a>`;
  const mail = `<a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>`;
  return `
    <div class="footer-grid">
      <div class="footer-prose">
        <p>Ligant Bench Tools are free and open source under Apache 2.0, for research and educational use. <strong>Privacy.</strong> Everything you enter into this tool stays on your computer. Calculations run entirely in your browser, and your inputs are never transmitted, stored, or logged. We use Cloudflare Web Analytics to count visits and measure how quickly this page loads, so we can see which tools are used and improve them. It sets no cookie, does not identify you, and never reads what you type. <a href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener noreferrer">Privacy Policy</a></p>
        <p>Every figure on this page comes from code you can read, download or run yourself, at ${repo}. Clone it and <code>npm run dev</code> for a local copy.</p>
        <p>These tools are standalone calculators. Ligant's enterprise platform adds reference databases, connected agentic workflows, on-premise language models, and full GxP validation. If your lab needs that, please email us ${mail}.</p>
      </div>
      <address class="footer-address">
        <span class="eyebrow">${esc(CONFIG.legalEntity)}</span>
        ${CONFIG.address.map(esc).join('<br>')}<br>
        ${mail}
      </address>
    </div>

    <div class="footer-citation">
      <span class="eyebrow">How to cite</span>
      <p class="footer-citation-note">Cite the software as below.</p>
      <div class="footer-citation-row">
        <p id="citation-text">${esc(citationText())}</p>
        <button type="button" id="copy-citation" aria-label="Copy the software citation" aria-live="polite">Copy</button>
      </div>
      <p class="footer-citation-note">${CONFIG.doi ? 'The identifier is given as text, not as a link: a link that navigated to a publisher would disclose a visit that the rest of the tool is built to prevent.' : 'No identifier is stated: one is minted when the tool is released, and a placeholder would read as a record that does not exist.'}</p>
    </div>

    <p class="footer-licence">Licensed under the Apache License, Version 2.0. You may obtain a copy of the License in the <a href="./LICENSE"><code>LICENSE</code></a> file served with this page and distributed with the source. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" basis, without warranties or conditions of any kind, either express or implied. <strong>${RESEARCH_USE}</strong></p>`;
}

/** The scope statement under the footer, in this tool's own terms. */
export function renderDisclaimer() {
  return `<strong>${RESEARCH_USE}</strong> ${esc(CONFIG.scopeNote)}`;
}

export function renderColophon() {
  return `${markSvg({ size: 16 })}<span>${esc(CONFIG.publisher)} · ${esc(CONFIG.toolTitle)} v${esc(CONFIG.version)}</span>`;
}
