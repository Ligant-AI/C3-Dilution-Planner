import { escapeHtml as esc } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
import { ENGINE_VERSION } from '../engine/version.js';
export const CANONICAL = `${CONFIG.publicBase}${CONFIG.slug}/`;
export const SEO = Object.freeze({
    title: "Ligant · Dilution Planner: Serial Dilution Calculator",
    h1: "Dilution planner: volumes for a target concentration or a serial dilution series",
    lead: "This tool works out the volumes to combine to reach a target concentration, or an ordered set of them, from a stock of known concentration. Where a step needs a transfer too small to pipette at your declared minimum, it plans one intermediate dilution or, if no single intermediate meets every bound, withholds the plan and names the bound that failed. It plans the preparation; it does not check what was prepared, does not convert between mass and molar concentration, and does not plan volumetric preparation in which the diluent is added to a mark.",
    description: "Free dilution planner: volumes for a target or a series, serial or independent. A transfer below your minimum gets one intermediate, or the plan is withheld.",
    related: { text: "Molarity Converter converts between mass and molar concentration for a protein whose molecular weight you declare. To plan a molar target from a mass stock, or the reverse, convert the stock there and enter the result here by hand, with \"computed by the Molarity Converter\" as its source.", name: 'Molarity Converter', href: "/molarity-converter/" },
    faqHeading: 'Questions and answers',
    faq: Object.freeze([
        { q: "How do I plan a serial dilution from a stock concentration?", a: "Enter the stock concentration and its unit, and choose where that value came from (certificate of analysis, vendor datasheet, measured, computed by the Molarity Converter, computed by Reconstitution, or not recorded; \"not recorded\" raises FL-04). Neither the value nor its unit is defaulted or suggested. Enter the target as a single concentration, a list in the order you will prepare it, or a top concentration with a dilution factor and a number of points, with its unit and where the target set came from. Enter one preparation volume, applied to every point, and say what it is the volume of. With more than one point, say whether each point is made from the previous one (serial) or from the stock (independent); a serial route usually needs less stock, at the cost of carrying each step's error into the next. Enter the diluent, or tick \"not recorded\" (which raises FL-10). Enter the smallest volume you can pipette reliably, replacing the 2 µL suggestion with your pipette's value. Optionally enter the stock volume you have, the largest single transfer and the working capacity of your vessels; plans that exceed them are flagged. Then read the plan: each vessel lists what to add, in order, and its total." },
        { q: "What does the volume I enter mean: final volume or diluent volume?", a: "You choose one of three. Final volume is the sum of the diluent and the stock pipetted into each vessel. Diluent volume is the diluent pipetted into each vessel; the stock is added to it, so each diluted vessel ends up larger than the stated volume by the transfer, and the plan says to use the final volume printed for each vessel, not the stated volume (FL-05). Volume available after onward transfer is the volume that remains in each vessel once the transfer to the next point has been taken, and is available only for a serial route with more than one point. If you know how much you want in each tube, choose final volume. Every option describes pipetted volumes; volumetric preparation, with the diluent added to a mark, is out of scope." },
        { q: "Is a 1:100 dilution a factor of 100 or of 99?", a: "In the top concentration, factor and count form, the factor is final volume ÷ stock volume, so 1:100 (1 part stock in 100 parts total) is 100. Some labs write 1 part stock plus 99 parts diluent as \"1:99\"; enter that as 100 too. A factor of 1 or below is refused: a factor below 1 usually means it was entered as a fraction (0.01 for 1:100); enter it as final volume ÷ stock volume (100). In a serial chain each target must be lower than the one before; 0 is a diluent-only control." },
        { q: "What happens when a volume to pipette is too small?", a: "Where a step needs a transfer too small to pipette at your declared minimum, the tool plans one intermediate dilution (FL-01): prepare the intermediate first, in the order shown, and draw the point from it. The minimum is yours to declare; the 2 µL shown is a suggestion, so replace it with your pipette's value. For example, with a 10 mg/mL stock, a 0.01 mg/mL target, a final volume of 1000 µL and a 2 µL minimum, the direct transfer would be 1.00 µL, so the plan makes a 1 in 10 intermediate from 2.00 µL of stock and 18.0 µL of diluent, and draws 10.0 µL from it into 990 µL of diluent. The tool never chains a second intermediate: if no intermediate in the series 10, 100, 1000 and so on meets every bound (your minimum, any vessel capacity you declared and, in a serial chain, the volume in the vessel it is drawn from), the plan is withheld and the message names the bound that failed. A step that dilutes 10-fold or less (11-fold or less under the final-volume and available-volume bases) cannot take an intermediate at all; there the remedy is a larger stated volume." },
        { q: "Why is the achieved concentration different from my target?", a: "Volumes are displayed to 3 significant figures, so a plan can carry up to about 1% rounding error per step before any pipetting error. That is larger than most users expect, and it is why the achieved concentration, the concentration the displayed volumes actually make, is shown beside every target, with the bound on the departure between them. Volumes are rounded once, from the exact values, and the unrounded values travel in the structured result." },
        { q: "Can I dilute a mass-concentration stock to a molar target?", a: "No. A stock and a target in different kinds of unit, mass and molar, are refused, because converting needs a molecular weight, which this tool does not apply. For the stock and for every target, the units it accepts are mg/mL, µg/mL, ng/mL, g/L, mg/L, M, mM, µM, nM and pM; activity units such as IU/mL and U/mL are not among them. Converting between mass and molar is the Molarity Converter's job, for a protein whose molecular weight you declare; give the Dilution Planner a stock and targets in the same kind of unit." },
        { q: "What can go wrong that the planner cannot detect?", a: "It does the arithmetic and records the volume basis, route, source vessel and provenance, but it cannot detect a stock concentration that is wrong (mislabeled, degraded, from a different lot, or correct for a different formulation); incomplete mixing between serial steps, which is the largest real source of serial dilution error; adsorption of protein to vessel surfaces, significant at low concentrations without a carrier, which makes the achieved concentration lower than the planned one by an amount the tool cannot estimate; a pipette out of calibration, because the declared minimum and maximum are statements of intent, not measurements of capability; precipitation or instability at any concentration in the plan, including at an intermediate the tool itself introduced; diluent incompatibility, which is recorded and not assessed; or departure from volume additivity outside its stated scope: a co-solvent (glycerol, DMSO, ethanol) above about 5% v/v after mixing, or a dense suspension of large cells, where the cell volume fraction raises the free-solution concentration above nominal by 1 to 2%. It states what to combine, and in what order; it does not observe what was combined." },
        { q: "Is my data uploaded anywhere?", a: "No. Calculations run entirely in your browser, and your inputs are never transmitted, stored, or logged. The page sends an email address only if you choose to submit one in the newsletter signup, and its web analytics counts visits and sees how quickly the page loads, with further analytics only if you allow it in the banner; no analytics ever receives anything you type into this tool." },
        { q: "Is it free?", a: "Yes. It is free to use and open source under the Apache 2.0 licence. Its source code is on GitHub, so you can download it and run it on your own computer." },
    ]),
    featureList: Object.freeze([
        "Volumes to combine for a target concentration, or an ordered set of them, from a stock of known concentration",
        "Plans one intermediate dilution where a transfer falls below your declared minimum, and withholds the plan where no single intermediate meets every bound",
        "Records what the stated volume is the volume of, the route, the diluent and the source of the stock value",
        "Shows the concentration the displayed volumes actually make beside every target, with a bound on the departure",
        "Notebook copy with every declaration, the engine version and every flag, and a printable bench sheet",
    ]),
});
export function relatedHtml() {
    const { text, name, href } = SEO.related;
    return `<p class="related">${esc(text).replace(esc(name), `<a href="${href}">${esc(name)}</a>`)}</p>`;
}
export function faqHtml() {
    return SEO.faq.map(({ q, a }) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
}
export function softwareApplication() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `Ligant · ${CONFIG.toolTitle}`,
        url: CANONICAL,
        description: SEO.description,
        applicationCategory: 'ScientificApplication',
        operatingSystem: 'Any (runs in a web browser)',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0' },
        license: `${CANONICAL}LICENSE`,
        softwareVersion: ENGINE_VERSION,
        codeRepository: CONFIG.repositoryUrl,
        featureList: [...SEO.featureList],
    };
}
export function faqPage() {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: SEO.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    };
}
export function breadcrumbs() {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: CONFIG.productLine, item: CONFIG.publicBase },
            { '@type': 'ListItem', position: 2, name: CONFIG.toolTitle, item: CANONICAL },
        ],
    };
}
const block = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
export function jsonLdHtml() {
    return [softwareApplication(), faqPage(), breadcrumbs()].map(block).join('\n  ');
}
