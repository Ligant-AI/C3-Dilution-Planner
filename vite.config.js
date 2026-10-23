import { defineConfig } from 'vite';
import { CONFIG } from './src/config.js';
import { renderHeader } from './src/ui/chrome.js';
import { renderPageContent } from './src/ui/page-content.js';
import { faqHtml, jsonLdHtml } from './src/ui/seo.js';
const STATIC = [
    ['<header class="masthead" id="site-header"></header>', () => `<header class="masthead" id="site-header">${renderHeader()}</header>`],
    ['<div class="panel-body prose" id="page-content-body"></div>', () => `<div class="panel-body prose" id="page-content-body">${renderPageContent(CONFIG)}</div>`],
    ['<div class="panel-body prose" id="faq-body"></div>', () => `<div class="panel-body prose" id="faq-body">${faqHtml()}</div>`],
    ['</head>', () => `  ${jsonLdHtml()}\n</head>`],
];
const staticPage = () => ({
    name: 'c3-static-page',
    transformIndexHtml(html, ctx) {
        if (!/(^|\/)index\.html$/.test(ctx.filename || ctx.path || ''))
            return html;
        let out = html;
        for (const [marker, content] of STATIC) {
            if (!out.includes(marker))
                throw new Error(`c3-static-page: marker not found in index.html: ${marker}`);
            out = out.replace(marker, content);
        }
        return out;
    },
});
export default defineConfig({
    base: './',
    plugins: [staticPage()],
    build: { modulePreload: { polyfill: false }, target: 'es2022' },
    server: { port: 5173, strictPort: true },
});
