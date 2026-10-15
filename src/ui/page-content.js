import { ENGINE_VERSION } from '../engine/version.js';
import { SUGGESTED_MIN_TRANSFER_UL, ADDITIVITY, INTERMEDIATE_RULE_STEPS, INTERMEDIATE_CONSEQUENCE } from '../engine/plan.js';
export const FAILURE_CLASSES = [
    'A stock concentration that is wrong: mislabelled, degraded, from a different lot, or correct for a different formulation.',
    'Incomplete mixing between serial steps. This is the largest real source of serial dilution error and is invisible in every record the tool produces.',
    'Adsorption of protein to vessel surfaces, significant at low concentrations without a carrier, which makes the achieved concentration lower than the planned one by an amount the tool cannot estimate.',
    'Departure from volume additivity outside the stated scope. Two cases are named: a stock in a co-solvent (glycerol, DMSO, ethanol) diluted at a low factor, where the co-solvent fraction after mixing exceeds about 5% v/v and the excess volume of mixing reaches 1–3%; and a dense suspension of large cells, where the cell volume fraction raises the free-solution concentration above nominal by 1–2%. The tool states the assumption and its scope; it cannot verify either.',
    'A pipette out of calibration. The declared minimum and maximum are statements of intent, not measurements of capability.',
    'Precipitation or instability at any concentration in the plan, including at an intermediate the tool itself introduced.',
    'Diluent incompatibility, which is recorded and not assessed.',
    'Any error in the execution of the plan. The tool states what to combine, and in what order; it does not observe what was combined.',
];
export const HI06_SENTENCE = 'Under the diluent-volume basis a step factor close to 1 requires a transfer many times the stated volume: the transfer into a vessel is D/(f − 1), which is unbounded by the stated volume as the step factor approaches 1.';
export { INTERMEDIATE_RULE_STEPS as INTERMEDIATE_RULE, INTERMEDIATE_CONSEQUENCE } from '../engine/plan.js';
export const FLAG_LEGEND = [
    ['FL-01', 'An intermediate dilution was planned for a step whose direct transfer is below your declared minimum.', 'Prepare the intermediate first, in the order shown, and draw the point from it.'],
    ['FL-02', 'A transfer is larger than the maximum single transfer you declared. Checked only if you declared a maximum.', 'Split it into two or more transfers, or use a pipette with a larger maximum and declare that maximum.'],
    ['FL-03', 'A vessel would hold more than the working capacity you declared. Checked only if you declared a capacity.', 'Use a larger vessel or a smaller stated volume.'],
    ['FL-04', 'The source of the stock concentration was recorded as "not recorded".', 'The plan cannot be traced to a source. Record one before the plan goes into a method record.'],
    ['FL-05', 'The stated volume is a volume of diluent, so each diluted vessel ends up larger than the stated volume by the transfer. An undiluted point (target = stock) is the stated volume of stock, and a zero point is the stated volume of diluent.', 'Use the final volume printed for each vessel, not the stated volume.'],
    ['FL-06', 'The plan needs more stock than the available volume you declared. Checked only if you declared an available volume.', 'Reduce the stated volume or the number of points, or get more stock. A serial route usually needs less stock than independent points, at the cost of carrying each step\'s error into the next.'],
    ['FL-07', 'A flag raised by the tool that produced an imported value, restated with that tool named.', 'Read it as the origin tool states it.'],
    ['FL-08', 'A zero-concentration point is diluent alone and contains none of the stock.', 'Prepare it separately from the chain.'],
    ['FL-09', 'A point equal to the stock concentration is undiluted stock; no diluent is added.', 'Use the stock itself for that point.'],
    ['FL-10', 'The diluent was recorded as "not recorded".', 'A concentration in an unrecorded diluent cannot be carried into a method record. Record the diluent.'],
];
export const WITHHELD_REASONS = [
    ['The stock concentration is zero or negative.'],
    ['A target concentration is negative.'],
    ['A target is above the stock concentration; dilution cannot raise a concentration.'],
    ['The stated volume is zero.'],
    ['The dilution factor is 1 or below. A factor below 1 usually means it was entered as a fraction (0.01 for 1:100); enter it as final volume ÷ stock volume (100).'],
    ['A transfer would take more than the donating vessel holds.'],
    ['A serial chain does not decrease from one point to the next.'],
    ['The stock and a target are in different kinds of unit (mass and molar). Converting needs a molecular weight, which this tool does not apply.'],
    ['A step needs a transfer below your minimum, and no intermediate in the series can make it pipettable. The message names the bound that failed.'],
    ['A diluent volume in the plan is below your minimum reliable transfer volume, so it cannot be pipetted as stated.'],
];
export function renderPageContent(config) {
    const esc = escapeHtml;
    const flagRows = FLAG_LEGEND.map(([c, m, a]) => `<tr><td><span class="num">${esc(c)}</span></td><td>${esc(m)}</td><td>${esc(a)}</td></tr>`).join('');
    const withheldRows = WITHHELD_REASONS.map(([m]) => `<li>${esc(m)}</li>`).join('');
    return `
<h3>What it does</h3>
<p class="lede">This tool works out the volumes to combine to reach a target concentration, or an ordered set of them, from a stock of known concentration. Where a step needs a transfer too small to pipette at your declared minimum, it plans one intermediate dilution. It plans the preparation; it does not check what was prepared.</p>

<h3>How to use it</h3>
<ol>
<li><strong>Stock.</strong> Enter the stock concentration and its unit, and choose where that value came from (certificate of analysis, vendor datasheet, measured, computed by another Ligant tool, or not recorded). The source is printed with the plan; "not recorded" raises FL-04. Optionally enter the stock volume you have, which raises FL-06 if the plan needs more, and the stock formulation, which is recorded and not assessed.</li>
<li><strong>Target.</strong> Enter a single concentration, a list in the order you will prepare it, or a top concentration with a dilution factor and a number of points. The factor is final volume ÷ stock volume, so 1:100 (1 part stock in 100 parts total) is 100. Some labs write 1 part stock plus 99 parts diluent as "1:99"; that is also a factor of 100 here. In a serial chain each target must be lower than the one before; 0 is a diluent-only control.</li>
<li><strong>Volume and route.</strong> Enter one preparation volume, applied to every point, and say what it is the volume of: the final volume in each vessel, the diluent pipetted into each vessel, or (serial route only) the volume left in each vessel after the transfer to the next point. If you know how much you want in each tube, choose final volume. With more than one point, say whether each point is made from the previous one (serial) or from the stock (independent).</li>
<li><strong>Diluent.</strong> Enter the diluent, or tick "not recorded" (which raises FL-10). It is recorded, not assessed.</li>
<li><strong>Pipetting capability.</strong> Enter the smallest volume you can pipette reliably. The 2 µL shown is a suggestion; replace it with your pipette's value. Optionally enter the largest single transfer and the working capacity of your vessels; plans that exceed them are flagged.</li>
<li><strong>Read the plan.</strong> Each vessel lists what to add, in order, and its total. Beside each target you see the exact concentration, the achieved concentration the displayed volumes actually make, and the bound on the departure between them. If a flag appears, find its code in the table below. If the plan is withheld, the message says what to change.</li>
<li><strong>Copy the result.</strong> "Copy for notebook" copies the plan with every declaration, the engine version and every flag. "Print bench sheet" prints the same plan for the bench.</li>
</ol>

<h3>How it works</h3>
<p>For each target the tool takes the dilution factor from its source (the stock, or the previous vessel in a serial chain): f = c<sub>source</sub> ÷ c<sub>target</sub>. A transfer T of the source into a vessel with diluent D gives c<sub>target</sub> = c<sub>source</sub> × T ÷ (T + D), so f = (T + D) ÷ T. What you stated as the preparation volume fixes the rest. Under the final-volume basis, T = F ÷ f and D = F − T. Under the diluent-volume basis, T = D ÷ (f − 1). Under the available-volume basis, each vessel is sized backwards from the last point so that the stated volume remains after the transfer to the next. The stated volume is a volume of solution under the final-volume and available-volume bases and a volume of diluent under the diluent-volume basis. Every basis describes pipetted volumes: the tool does not plan volumetric preparation in which the diluent is added to a mark.</p>
<p>${esc(HI06_SENTENCE)}</p>
<p>Volumes are displayed to 3 significant figures, so a plan can carry up to about 1% rounding error per step before any pipetting error. That is larger than most users expect, and it is why the achieved concentration is shown beside every target: it is the concentration the displayed volumes make, and the bound on its departure from the target is computed from those volumes and stated at that point.</p>

<h4>Intermediate selection rule</h4>
<ol>${INTERMEDIATE_RULE_STEPS.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<p><strong>${esc(INTERMEDIATE_CONSEQUENCE)}</strong></p>

<h4>Constants and assumptions</h4>
<table>
<thead><tr><th>Name</th><th>Value</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Volume additivity</td><td>${esc(ADDITIVITY.scope.join('; '))}</td><td>Mixing dilute aqueous buffers changes the total volume by less than 0.1 %, below the display rounding of almost every volume. Cases outside this scope are listed under "What it does not do".</td></tr>
<tr><td>Minimum reliable transfer volume</td><td>declared by you; ${esc(SUGGESTED_MIN_TRANSFER_UL)} µL suggested</td><td>It applies to every pipetted volume, diluent included, and every comparison uses the displayed volume.</td></tr>
<tr><td>Intermediate factor series</td><td>{10, 100, 1000, …}</td><td>The series can be checked by eye.</td></tr>
<tr><td>Displayed precision, volumes</td><td>3 significant figures</td><td>It matches the resolution of the pipetting act the number drives.</td></tr>
<tr><td>Displayed precision, concentrations</td><td>6 significant figures</td><td>A concentration drives a record, not a pipetting act, so it carries more figures.</td></tr>
<tr><td>Achieved-concentration bound</td><td>at most 1.01 × 10⁻² per step; 5.03 × 10⁻³ where closure is exact or under the diluent-volume basis</td><td>Derived analytically from the half-unit rounding of each displayed volume, compounded along the chain.</td></tr>
<tr><td>Closure residual</td><td>±½ unit in the last displayed place of the one derived volume per vessel; zero under the diluent-volume basis</td><td>Under the final-volume and available-volume bases one volume in each vessel is worked out from the others and then rounded for display, so the displayed volumes can add up to the stated volume plus or minus half a unit in the last displayed place. Under the diluent-volume basis the total is not fixed in advance, so there is nothing to close.</td></tr>
<tr><td>Round-trip tolerance, exact concentration</td><td>6 ULP of the target per step from stock</td><td>A check on the arithmetic, not on your pipetting: recomputing each concentration from the unrounded volumes returns the target to within 6 units in the last binary place per step (about 1 part in 10¹⁵ or less), the most the rounding operations in each basis can produce.</td></tr>
</tbody>
</table>
<h4>Precision, rounding and engine version</h4>
<p>Rounding is half away from zero, applied to the exact binary value. Every reported total and remaining volume is a sum or difference of displayed values and is never rounded. The unrounded values are carried in the result object. Every constant and threshold the tool applies also travels in the structured result beside the plan, generated by the same calculation that produced the plan. The source is at <a href="${esc(config.repositoryUrl)}">${esc(config.repositoryLabel)}</a>.</p>
<p>Engine <span class="num">${esc(ENGINE_VERSION)}</span>. The version changes whenever the calculation changes, so two results with the same engine version come from the same arithmetic.</p>

<h4>Flags</h4>
<p>A flag means the plan can be carried out but something needs your attention. Each flag appears beside the vessel or plan it concerns, with its code.</p>
<table>
<thead><tr><th>Code</th><th>What it means</th><th>What to do</th></tr></thead>
<tbody>${flagRows}</tbody>
</table>
<p>When a plan cannot be carried out as stated, the tool withholds it and names every reason, rather than printing a plan with a warning.</p>
<ul>${withheldRows}</ul>

<h3>Why not a spreadsheet?</h3>
<p>${esc(config.standfirst)}</p>
<ul>
<li><strong>Every assumption is a recorded choice.</strong> The basis of the stated volume, the route, the source vessel of each point, the diluent, the source of the stock value and the minimum transfer are asked for and printed with the plan, not left in a hidden cell.</li>
<li><strong>Units are carried and checked.</strong> Results are shown in the unit you entered, and a stock in mass units with a target in molar units is refused rather than silently mixed.</li>
<li><strong>Rounding is stated and bounded.</strong> Volumes are rounded once, to 3 significant figures, from the exact values; the unrounded values travel in the result, and the concentration the displayed volumes actually make is shown beside every target with its bound.</li>
<li><strong>Flags say in words what to check,</strong> and a plan the bench cannot carry out is withheld with the reason, instead of being printed beside a warning. A needed intermediate dilution is planned for you.</li>
<li><strong>The same inputs always give the same output,</strong> and the copy-out records every declaration, the engine version and every flag.</li>
</ul>

<h3>What it does not do</h3>
<p>The tool guarantees that the plan's arithmetic is correct, that every step is preparable within the declared bounds, and that the volume basis, route, source vessel and provenance are recorded. It cannot detect:</p>
<ol>${FAILURE_CLASSES.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<p>Also outside its scope:</p>
<ul>
<li>Mass ↔ molar conversion (Molarity Converter). Titration series design (Antibody Titration Planner). The direct per-point stock volume for a titration point that is already preparable (Antibody Titration Planner). Reconstitution of a dry solute (Reconstitution). Multi-component cocktails with overage (Master Mix).</li>
<li>Per-point stated volumes; volumetric (make-up-to-mark) preparation; plans needing more than one intermediate for a single step; mixing technique, incubation, temperature; diluent formulation or compatibility; carrier protein selection.</li>
</ul>
<p>Entirely client-side: nothing entered into the planner leaves the browser. The newsletter signup in the footer is separate: only an email address you choose to submit there is sent. The page loads Cloudflare Web Analytics, which counts visits and page-load speed and reads nothing you enter. Only if you allow it in the banner, it also loads Google Analytics, which sets cookies and records which pages you visit; it never receives anything you enter either. No account. Nothing you enter persists across a reload.</p>`;
}
export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
