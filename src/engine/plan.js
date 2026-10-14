import * as Dec from './decimal.js';
import { unitInfo, dimensionOf, toInternal, scaleExponent, canonicalSymbol, isConcentrationUnit, isVolumeUnit, DIMENSION, } from './units.js';
import { ENGINE_VERSION, URS_VERSION, TOOL_ID } from './version.js';
import { vesselDepartureBound, compoundBound, ROUND_TRIP_ULP_PER_STEP, ACHIEVED_BOUND_PER_STEP_WORST, ACHIEVED_BOUND_PER_STEP_EXACT_CLOSURE, TOLERANCE_REGISTRATION } from './tolerances.js';
export const VOLUME_SF = 3;
export const CONCENTRATION_SF = 6;
export const SUGGESTED_MIN_TRANSFER_UL = 2;
export const INTERMEDIATE_SERIES = 'decade';
export const INTERMEDIATE_RULE_STEPS = Object.freeze([
    'For a step from a source at concentration cₐ — the stock, or the preceding vessel in serial mode — to a point b with factor f = cₐ/cᵦ whose direct transfer, as displayed, falls below the declared minimum m:',
    'Let Tᵦ(g) be the transfer into vessel b at the remaining factor f/g under the declared basis: F·g/f (final volume); D·g/(f − g) (diluent volume); Vᵦ·g/f with Vᵦ the backward-solved total of b (volume available after onward transfer). Each is increasing in g.',
    'Take the smallest g from the series {10, 100, 1000, …} with g < f such that (i) Tᵦ(g) ≥ m and, under the final-volume and available-volume bases, Tᵦ(g) ≤ Vᵦ − m, so that the destination holds at least the minimum of both the transfer and its derived diluent — under the diluent-volume basis the destination\'s diluent is the stated D, checked once by C3-HI-10, and (i) keeps only its lower bound; (iii) where a capacity C is declared, the intermediate\'s total ≤ C; and, in serial mode, (iv) the intermediate\'s transfer from its source does not exceed the source vessel\'s total.',
    'Size the intermediate as max(g·m, the sum of every onward transfer taken from it). Its own transfer from its source is then at or above m by construction.',
    'In serial mode the intermediate sits between the source and b; the source\'s onward transfer is to the intermediate. In independent mode every point requiring the same g shares one intermediate, sized over all of them, and each such point is recorded as drawn from it.',
    'If no g satisfies these conditions the plan is rejected naming the bound that failed; a second intermediate is never chained.',
    'Every comparison with the minimum uses the displayed volume, the volume the bench sets.',
]);
export const INTERMEDIATE_CONSEQUENCE = 'Under the final-volume and available-volume bases no intermediate exists for a step with f ≤ 11: for f ≤ 10 the intermediate would be the point itself (the series floor), and for 10 < f ≤ 11 the destination cannot hold at least the minimum of both the transfer and its diluent while the direct transfer is below the minimum (the destination diluent bound). Under the diluent-volume basis the destination\'s diluent is the stated volume, the second case does not arise, and the floor is f ≤ 10. In every case the step is rejected under C3-HI-09 naming the bound that failed — the series floor and the destination diluent bound are named differently — and the remedy is the stated volume, not an intermediate. No value is recommended.';
export const ROUNDING_RULE = 'half away from zero, applied to the exact binary value';
export const FACTOR_CONVENTION = 'dilution factor = final volume ÷ stock volume; 1:100 is a factor of 100';
export const ORDER_OF_ADDITION = 'The receiving vessel holds the diluent — or, for a C4 point, the stain — and the stock or intermediate is added to it.';
export const LABEL_SCHEME = 'S is the stock; I1, I2, … are intermediates in execution order; P1, P2, … are the requested points in the order entered.';
export const BASIS = Object.freeze({
    final: {
        key: 'final',
        label: 'final volume — the sum of the diluent and the stock pipetted into each vessel',
        short: 'final volume',
        symbol: 'F',
    },
    diluent: {
        key: 'diluent',
        label: 'diluent volume — the diluent pipetted into each vessel; the stock is added to it, and the final volume is the sum',
        short: 'diluent volume',
        symbol: 'D',
    },
    available: {
        key: 'available',
        label: 'volume available after onward transfer — the volume that remains in each vessel once the transfer to the next point has been taken',
        short: 'volume available after onward transfer',
        symbol: 'A',
    },
});
export const STOCK_PROVENANCE = Object.freeze({
    'coa': 'certificate of analysis',
    'vendor-datasheet': 'vendor datasheet',
    'measured': 'measured',
    'c1': 'computed by C1',
    'c7': 'computed by C7',
    'not-recorded': 'not recorded',
});
export const TARGET_PROVENANCE = Object.freeze({
    'user': 'user-specified',
    'c4': 'imported from C4',
    'other': 'imported from another tool',
});
export const ADDITIVITY = Object.freeze({
    statement: 'Volumes are computed under additivity of liquid volumes.',
    scope: [
        'aqueous stock and diluent',
        'any co-solvent (glycerol, DMSO, ethanol) below about 5% v/v after mixing',
        'cell suspensions treated as liquid',
    ],
    statedVolumeIs: {
        final: 'a volume of solution',
        diluent: 'a volume of diluent',
        available: 'a volume of solution',
    },
    status: 'disclosed',
});
function isBlank(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}
function parseQuantity(q, kind, field) {
    if (!q || isBlank(q.value))
        return { error: `${field} is required` };
    if (isBlank(q.unit))
        return { error: `${field}: a unit must be selected` };
    const unitOk = kind === 'volume' ? isVolumeUnit(q.unit) : isConcentrationUnit(q.unit);
    if (!unitOk)
        return { error: `${field}: "${q.unit}" is not a ${kind} unit` };
    const entered = typeof q.value === 'number' ? numberToPlain(q.value) : String(q.value).trim();
    let dec;
    try {
        dec = Dec.fromString(entered);
    }
    catch {
        return { error: `${field}: "${entered}" is not a number` };
    }
    const unit = canonicalSymbol(q.unit);
    const num = Dec.toNumber(dec);
    return { entered, num, dec, unit };
}
function numberToPlain(x) {
    if (!Number.isFinite(x))
        return String(x);
    return Dec.toString(Dec.fromNumberExact(x));
}
function volumeInternal(pq) {
    const k = scaleExponent(pq.unit);
    return {
        entered: pq.entered,
        unit: pq.unit,
        dec: Dec.shift(pq.dec, k),
        num: toInternal(pq.num, pq.unit),
    };
}
function concentrationInternal(pq) {
    return {
        entered: pq.entered,
        unit: pq.unit,
        num: toInternal(pq.num, pq.unit),
        dimension: dimensionOf(pq.unit),
    };
}
function round3(x) {
    return Dec.roundSig(Dec.isDec(x) ? x : Dec.fromNumberExact(x), VOLUME_SF);
}
function belowMinimum(x, m) {
    return Dec.cmp(round3(x), m.dec) < 0;
}
function* decadeCandidates(f) {
    for (let k = 1; k <= 18; k++) {
        const g = 10 ** k;
        if (!(g < f))
            return;
        yield g;
    }
}
function transferInto(basis, stated, cSrc, cB) {
    if (cB === 0)
        return 0;
    switch (basis) {
        case 'final': return (stated * cB) / cSrc;
        case 'diluent': return (stated * cB) / (cSrc - cB);
        case 'available': return (stated * cB) / cSrc;
        default: throw new Error(`unknown basis ${basis}`);
    }
}
function buildFinalVolumeVessel(Fdec, Fnum, T) {
    const Td = round3(T);
    const Dderived = Dec.sub(Fdec, Td);
    const Dd = round3(Dderived);
    const total = Dec.add(Td, Dd);
    const residual = Dec.sub(Dd, Dderived);
    return {
        T, Td,
        D: Fnum - T, Dd, derived: 'diluent', derivedFrom: Dderived,
        total, totalUnrounded: Fnum,
        closureTarget: Fdec,
        residual,
    };
}
function buildDiluentVolumeVessel(Ddec, Dnum, T) {
    const Td = round3(T);
    const total = Dec.add(Ddec, Td);
    return {
        T, Td,
        D: Dnum, Dd: Ddec, derived: 'none', derivedFrom: null,
        total, totalUnrounded: Dnum + T,
        closureTarget: null,
        residual: null,
    };
}
function buildAvailableVolumeVessel(Adec, Anum, T, onwardDec, onwardNum) {
    const Td = round3(T);
    const closure = Dec.add(Adec, onwardDec);
    const Dderived = Dec.sub(closure, Td);
    const Dd = round3(Dderived);
    const total = Dec.add(Td, Dd);
    const residual = Dec.sub(Dd, Dderived);
    const Vnum = Anum + onwardNum;
    return {
        T, Td,
        D: Vnum - T, Dd, derived: 'diluent', derivedFrom: Dderived,
        total, totalUnrounded: Vnum,
        closureTarget: closure,
        residual,
    };
}
function buildUndilutedVessel(basis, statedDec, statedNum, onwardDec, onwardNum) {
    const Vdec = basis === 'available' ? Dec.add(statedDec, onwardDec) : statedDec;
    const Vnum = basis === 'available' ? statedNum + onwardNum : statedNum;
    const Td = round3(Vdec);
    return {
        T: Vnum, Td,
        D: 0, Dd: Dec.ZERO, derived: 'none', derivedFrom: null,
        total: Td, totalUnrounded: Vnum,
        closureTarget: null,
        residual: null,
    };
}
function buildZeroVessel(statedDec, statedNum) {
    const Dd = round3(statedDec);
    return {
        T: 0, Td: Dec.ZERO,
        D: statedNum, Dd, derived: 'none', derivedFrom: null,
        total: Dd, totalUnrounded: statedNum,
        closureTarget: null,
        residual: null,
    };
}
function buildIntermediate(g, mDec, onwardUnrounded, cSrc) {
    const k = Math.round(Math.log10(g));
    const sumOnward = onwardUnrounded.reduce((a, b) => a + b, 0);
    const gm = Dec.shift(mDec, k);
    const Fint = Dec.max(gm, round3(sumOnward));
    const Tint = Dec.shift(Fint, -k);
    const Fnum = Dec.toNumber(Fint);
    const Tnum = Dec.toNumber(Tint);
    const vol = buildFinalVolumeVessel(Fint, Fnum, Tnum);
    vol.Td = round3(Tint);
    const Dderived = Dec.sub(Fint, vol.Td);
    vol.Dd = round3(Dderived);
    vol.derivedFrom = Dderived;
    vol.total = Dec.add(vol.Td, vol.Dd);
    vol.residual = Dec.sub(vol.Dd, Dderived);
    return {
        g, k, Fint, Tint, sizedBy: Dec.cmp(gm, round3(sumOnward)) >= 0 ? 'g·m' : 'Σ onward',
        cNominal: cSrc / g,
        vol,
    };
}
export function planDilution(input, options = {}) {
    const defect = options.defect || null;
    const ctx = {
        incomplete: [],
        rejections: [],
        flags: [],
        notes: [],
        input,
    };
    const n = normalise(input, ctx);
    if (ctx.incomplete.length) {
        return assemble(ctx, n, null);
    }
    preComputeRejects(n, ctx);
    const onlyUnpipettable = ctx.rejections.length > 0 && ctx.rejections.every((x) => x.code === 'C3-HI-10');
    if (ctx.rejections.length && !onlyUnpipettable) {
        return assemble(ctx, n, null);
    }
    const plan = computeVessels(n, ctx, defect);
    postComputeRejects(n, ctx, plan);
    if (ctx.rejections.length) {
        return assemble(ctx, n, null);
    }
    evaluateFlags(n, ctx, plan);
    return assemble(ctx, n, plan);
}
function normalise(input, ctx) {
    const n = { display: {} };
    const inc = (field, message) => ctx.incomplete.push({ field, message });
    const stock = parseQuantity(input.stock, 'concentration', 'stock concentration');
    if (stock.error)
        inc('stock', stock.error);
    else
        n.stock = concentrationInternal(stock);
    if (isBlank(input.stockProvenance))
        inc('stockProvenance', 'stock provenance is required');
    else if (!(input.stockProvenance in STOCK_PROVENANCE))
        inc('stockProvenance', `stock provenance "${input.stockProvenance}" is not one of the accepted answers`);
    else
        n.stockProvenance = input.stockProvenance;
    if (input.stockAvailable && !isBlank(input.stockAvailable.value)) {
        const q = parseQuantity(input.stockAvailable, 'volume', 'available stock volume');
        if (q.error)
            inc('stockAvailable', q.error);
        else
            n.stockAvailable = volumeInternal(q);
    }
    else
        n.stockAvailable = null;
    n.stockFormulation = isBlank(input.stockFormulation) ? null : String(input.stockFormulation).trim();
    const t = input.target;
    if (!t || !t.form)
        inc('target', 'a target is required: a single concentration, a list, or a top concentration with factor and count');
    else if (t.form === 'single') {
        const q = parseQuantity({ value: t.value, unit: t.unit }, 'concentration', 'target concentration');
        if (q.error)
            inc('target', q.error);
        else
            n.targets = [concentrationInternal(q)];
        n.targetForm = 'single';
    }
    else if (t.form === 'list') {
        const vals = Array.isArray(t.values) ? t.values : [];
        if (vals.length === 0)
            inc('target', 'the target list is empty');
        else {
            n.targets = [];
            vals.forEach((v, i) => {
                const q = parseQuantity({ value: v, unit: t.unit }, 'concentration', `target ${i + 1}`);
                if (q.error)
                    inc('target', q.error);
                else
                    n.targets.push(concentrationInternal(q));
            });
        }
        n.targetForm = 'list';
    }
    else if (t.form === 'top-factor-count') {
        const q = parseQuantity({ value: t.top, unit: t.unit }, 'concentration', 'top concentration');
        if (q.error)
            inc('target', q.error);
        const factor = Number(t.factor);
        const count = Number(t.count);
        if (isBlank(t.factor) || !Number.isFinite(factor))
            inc('target', 'the dilution factor is required');
        if (isBlank(t.count) || !Number.isInteger(count) || count < 1)
            inc('target', 'the point count must be a whole number of at least 1');
        if (!q.error && Number.isFinite(factor) && Number.isInteger(count) && count >= 1) {
            const top = concentrationInternal(q);
            n.targets = [];
            let c = top.num;
            for (let i = 0; i < count; i++) {
                n.targets.push({
                    entered: i === 0 ? top.entered : null,
                    unit: top.unit,
                    num: c,
                    dimension: top.dimension,
                    derivedFromTop: i > 0,
                });
                c = c / factor;
            }
            n.declaredFactor = factor;
            n.count = count;
        }
        n.targetForm = 'top-factor-count';
    }
    else
        inc('target', `unknown target form "${t.form}"`);
    if (isBlank(input.targetProvenance))
        inc('targetProvenance', 'target provenance is required');
    else if (!(input.targetProvenance in TARGET_PROVENANCE))
        inc('targetProvenance', `target provenance "${input.targetProvenance}" is not one of the accepted answers`);
    else
        n.targetProvenance = input.targetProvenance;
    n.targetOrigin = input.targetOrigin || null;
    if (n.targetProvenance && n.targetProvenance !== 'user' && !(n.targetOrigin && !isBlank(n.targetOrigin.tool))) {
        inc('targetOrigin', 'an imported target set must name its origin tool and result identifier');
    }
    const v = parseQuantity(input.volume, 'volume', 'stated volume');
    if (v.error)
        inc('volume', v.error);
    else
        n.volume = volumeInternal(v);
    if (isBlank(input.basis))
        inc('basis', 'the volume basis must be declared: what the stated volume is the volume of');
    else if (!(input.basis in BASIS))
        inc('basis', `unknown volume basis "${input.basis}"`);
    else
        n.basis = input.basis;
    const pointCount = n.targets ? n.targets.length : 0;
    n.multiPoint = pointCount > 1;
    if (n.multiPoint) {
        if (isBlank(input.route))
            inc('route', 'more than one point is planned: declare whether the series is prepared serially or independently');
        else if (input.route !== 'serial' && input.route !== 'independent')
            inc('route', `unknown route "${input.route}"`);
        else
            n.route = input.route;
    }
    else {
        n.route = null;
    }
    if (n.basis === 'available' && !(n.multiPoint && n.route === 'serial')) {
        inc('basis', 'the basis "volume available after onward transfer" is available only for a serial route with more than one point (C3-VB-02)');
    }
    const d = input.diluent;
    if (!d || (d.notRecorded !== true && isBlank(d.name)))
        inc('diluent', 'the diluent is required; "not recorded" is an accepted answer');
    else
        n.diluent = d.notRecorded === true ? { notRecorded: true, name: null } : { notRecorded: false, name: String(d.name).trim() };
    const m = parseQuantity(input.minTransfer, 'volume', 'minimum reliable transfer volume');
    if (m.error)
        inc('minTransfer', m.error);
    else if (!(m.num > 0))
        inc('minTransfer', 'the minimum reliable transfer volume must be greater than zero');
    else
        n.minTransfer = volumeInternal(m);
    if (input.maxTransfer && !isBlank(input.maxTransfer.value)) {
        const q = parseQuantity(input.maxTransfer, 'volume', 'maximum single-transfer volume');
        if (q.error)
            inc('maxTransfer', q.error);
        else if (!(q.num > 0))
            inc('maxTransfer', 'the maximum single-transfer volume must be greater than zero');
        else
            n.maxTransfer = volumeInternal(q);
    }
    else
        n.maxTransfer = null;
    if (input.capacity && !isBlank(input.capacity.value)) {
        const q = parseQuantity(input.capacity, 'volume', 'vessel working capacity');
        if (q.error)
            inc('capacity', q.error);
        else if (!(q.num > 0))
            inc('capacity', 'the vessel working capacity must be greater than zero');
        else
            n.capacity = volumeInternal(q);
    }
    else
        n.capacity = null;
    n.imported = input.imported || null;
    n.overrides = Array.isArray(input.overrides) ? input.overrides : [];
    n.display.volumeUnit = n.volume ? n.volume.unit : 'µL';
    n.display.volumeShift = n.volume ? -scaleExponent(n.volume.unit) : 0;
    n.display.concUnit = n.targets && n.targets[0] ? n.targets[0].unit : (n.stock ? n.stock.unit : null);
    return n;
}
function preComputeRejects(n, ctx) {
    const rej = (code, message, quantities, scope) => ctx.rejections.push({ code, message, quantities, scope: scope || { level: 'plan' } });
    const cU = (c) => `${c.entered} ${c.unit}`;
    for (const t of n.targets) {
        if (t.dimension !== n.stock.dimension) {
            rej('C3-HI-08', `The stock is stated in ${n.stock.unit} (${n.stock.dimension}) and the target in ${t.unit} (${t.dimension}). Converting between mass and molar concentration requires a molecular weight, which is C1's determination; this tool does not perform it.`, { stockUnit: n.stock.unit, targetUnit: t.unit });
            break;
        }
    }
    if (!(n.stock.num > 0)) {
        rej('C3-HI-01', `The stock concentration is ${cU(n.stock)}. A concentration cannot be zero or negative.`, { stock: cU(n.stock) });
    }
    n.targets.forEach((t, i) => {
        const label = `P${i + 1}`;
        const shown = t.entered !== null ? cU(t) : `${concDisplayString(t.num, t.unit)} ${t.unit} (derived from the top concentration)`;
        if (t.num < 0) {
            rej('C3-HI-02', `Target ${label} is ${shown}. A concentration cannot be negative.`, { target: shown }, { level: 'vessel', vessel: label });
        }
        else if (n.stock.num > 0 && t.num > n.stock.num && t.dimension === n.stock.dimension) {
            rej('C3-HI-03', `Target ${label} is ${shown}, above the stock at ${cU(n.stock)}. Dilution cannot raise a concentration above its stock.`, { target: shown, stock: cU(n.stock) }, { level: 'vessel', vessel: label });
        }
    });
    if (!(n.volume.num > 0)) {
        rej('C3-HI-04', `The stated volume is ${n.volume.entered} ${n.volume.unit}, declared as the ${BASIS[n.basis].short}. A preparation cannot have zero volume.`, { volume: `${n.volume.entered} ${n.volume.unit}`, basis: n.basis });
    }
    const someDilutedPoint = n.targets.some((t) => t.num !== 0 && t.num !== n.stock.num);
    if (someDilutedPoint && n.basis === 'diluent' && n.volume.num > 0 && n.minTransfer && belowMinimum(n.volume.num, n.minTransfer)) {
        const shown = `${n.volume.entered} ${n.volume.unit}`;
        rej('C3-HI-10', `The stated diluent volume is ${shown}, below the declared minimum reliable transfer volume of ${entered(n.minTransfer)}. Every volume in this plan is pipetted, the diluent included, so no plan under this declaration is preparable. The remedy is the stated diluent volume.`, { statedDiluent: n.volume.entered, unit: n.volume.unit, minimum: n.minTransfer.entered, minimumUnit: n.minTransfer.unit });
    }
    if (n.targetForm === 'top-factor-count' && !(n.declaredFactor > 1)) {
        rej('C3-HI-05', `The dilution factor is ${n.declaredFactor}. Under the stated convention — ${FACTOR_CONVENTION} — a factor of 1 or below is not a dilution; a factor below 1 indicates the inverse convention was used.`, { factor: n.declaredFactor });
    }
    if (n.route === 'serial' && n.targetForm !== 'top-factor-count') {
        const chain = n.targets.map((t, i) => ({ t, i })).filter((x) => x.t.num !== 0);
        for (let k = 1; k < chain.length; k++) {
            const a = chain[k - 1], b = chain[k];
            if (!(b.t.num < a.t.num)) {
                const sa = a.t.entered !== null ? cU(a.t) : `${concDisplayString(a.t.num, a.t.unit)} ${a.t.unit}`;
                const sb = b.t.entered !== null ? cU(b.t) : `${concDisplayString(b.t.num, b.t.unit)} ${b.t.unit}`;
                rej('C3-HI-07', `Points P${a.i + 1} (${sa}) and P${b.i + 1} (${sb}) do not decrease. A serial chain cannot hold or increase concentration between steps.`, { from: sa, to: sb }, { level: 'vessel', vessel: `P${b.i + 1}` });
                break;
            }
        }
    }
}
function concDisplayString(internalNum, unit) {
    const u = unitInfo(unit);
    const v = u.scale === 1 ? internalNum : internalNum / u.scale;
    if (v === 0)
        return '0';
    const r = Dec.roundSig(Dec.fromNumberExact(v), CONCENTRATION_SF);
    const digits = r.mant.toString().replace('-', '');
    const exp = r.exp + digits.length - 1;
    if (exp >= CONCENTRATION_SF) {
        const mant = `${v < 0 ? '-' : ''}${digits[0]}.${digits.slice(1).padEnd(CONCENTRATION_SF - 1, '0')}`;
        const sup = String(exp).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
        return `${mant} × 10${sup}`;
    }
    return Dec.toString(r);
}
function computeVessels(n, ctx, defect) {
    const basis = n.basis;
    const stated = n.volume;
    const m = n.minTransfer;
    const plan = { vessels: [], intermediates: [], labelCounter: 0 };
    const stockVessel = {
        label: 'S', kind: 'stock', sourceLabel: null, stepsFromStock: 0,
        cExact: n.stock.num, cAchieved: n.stock.num, cTargetEntered: n.stock.entered, unit: n.stock.unit,
        vol: null, onward: [], receiving: null, bound: 0,
    };
    plan.vessels.push(stockVessel);
    const points = n.targets.map((t, i) => ({
        index: i, label: `P${i + 1}`, target: t, isZero: t.num === 0, vessel: null,
    }));
    for (const p of points) {
        if (!p.isZero)
            continue;
        p.vessel = {
            label: p.label, kind: 'point', pointIndex: p.index, sourceLabel: null, stepsFromStock: 0,
            cExact: 0, cAchieved: 0, cTargetEntered: p.target.entered, unit: p.target.unit,
            target: p.target, factorFromSource: null, isZero: true, isUndiluted: false,
            vol: buildZeroVessel(stated.dec, stated.num), onward: [],
            receiving: 'diluent', viaIntermediate: null,
        };
    }
    const chainPoints = points.filter((p) => !p.isZero);
    if (chainPoints.length === 0) {
    }
    else if (!n.multiPoint || n.route === 'independent') {
        planIndependent(n, ctx, plan, stockVessel, chainPoints, defect);
    }
    else if (basis === 'available') {
        planSerialBackward(n, ctx, plan, stockVessel, chainPoints, defect);
    }
    else {
        planSerialForward(n, ctx, plan, stockVessel, chainPoints, defect);
    }
    const ordered = [stockVessel];
    const placed = new Set(['S']);
    for (const p of points) {
        const v = p.vessel;
        if (!v)
            continue;
        if (v.viaIntermediate && !placed.has(v.viaIntermediate.label)) {
            ordered.push(v.viaIntermediate);
            placed.add(v.viaIntermediate.label);
        }
        ordered.push(v);
        placed.add(v.label);
    }
    plan.vessels = ordered;
    plan.points = points;
    return plan;
}
function applyDefect(defect, T, n) {
    if (!defect)
        return T;
    if (defect === 'clamp' && n.maxTransfer && T > n.maxTransfer.num)
        return n.maxTransfer.num;
    if (defect === 'floor' && T < n.minTransfer.num)
        return n.minTransfer.num;
    if (defect === 'nudge')
        return T * (1 + 1e-9);
    return T;
}
function feedPoint(n, plan, src, p, T, extra) {
    const basis = n.basis;
    const stated = n.volume;
    let vol;
    const undiluted = p.target.num === src.cExactNominal;
    if (undiluted) {
        vol = buildUndilutedVessel(basis, stated.dec, stated.num, extra?.onwardDec || Dec.ZERO, extra?.onwardNum || 0);
    }
    else if (basis === 'final') {
        vol = buildFinalVolumeVessel(stated.dec, stated.num, T);
    }
    else if (basis === 'diluent') {
        vol = buildDiluentVolumeVessel(stated.dec, stated.num, T);
    }
    else {
        vol = buildAvailableVolumeVessel(stated.dec, stated.num, T, extra.onwardDec, extra.onwardNum);
    }
    const v = {
        label: p.label, kind: 'point', pointIndex: p.index, sourceLabel: src.label,
        stepsFromStock: src.stepsFromStock + 1,
        cExactNominal: p.target.num,
        cExact: src.cExact * (vol.T / vol.totalUnrounded),
        cAchieved: src.cAchieved * (Dec.toNumber(vol.Td) / Dec.toNumber(vol.total)),
        cTargetEntered: p.target.entered, unit: p.target.unit, target: p.target,
        factorFromSource: src.cExactNominal / p.target.num,
        isZero: false, isUndiluted: undiluted,
        vol, onward: [], receiving: n.imported && n.imported.tool === 'C4' ? 'stain' : 'diluent',
        viaIntermediate: src.kind === 'intermediate' ? src : null,
    };
    if (undiluted)
        v.cExact = src.cExact;
    v.boundOwn = vesselDepartureBound({ Td: vol.Td, Dd: vol.Dd, closure: vol.closureTarget, basis, undiluted, zero: false });
    v.bound = compoundBound(src.bound, v.boundOwn);
    src.onward.push({ to: v.label, Td: vol.Td, T: vol.T });
    p.vessel = v;
    return v;
}
function newIntermediateVessel(plan, src, inter, destLabels) {
    plan.labelCounter += 1;
    const label = `I${plan.labelCounter}`;
    const v = {
        label, kind: 'intermediate', sourceLabel: src.label, stepsFromStock: src.stepsFromStock + 1,
        g: inter.g, sizedBy: inter.sizedBy, Fint: inter.Fint,
        cExactNominal: inter.cNominal,
        cExact: src.cExact * (inter.vol.T / inter.vol.totalUnrounded),
        cAchieved: src.cAchieved * (Dec.toNumber(inter.vol.Td) / Dec.toNumber(inter.vol.total)),
        cTargetEntered: null, unit: null,
        factorFromSource: inter.g,
        vol: inter.vol, onward: [], receiving: 'diluent', destinations: destLabels,
    };
    v.boundOwn = vesselDepartureBound({ Td: inter.vol.Td, Dd: inter.vol.Dd, closure: inter.vol.closureTarget, basis: 'final', undiluted: false, zero: false });
    v.bound = compoundBound(src.bound, v.boundOwn);
    src.onward.push({ to: label, Td: inter.vol.Td, T: inter.vol.T });
    plan.intermediates.push(v);
    return v;
}
function evaluateCandidates(n, basis, statedOrV, src, cB, extraOnward, sourceTotalDec, serial, closureDec = null) {
    const f = src.cExactNominal / cB;
    const m = n.minTransfer;
    const out = [];
    for (const g of decadeCandidates(f)) {
        const cInt = src.cExactNominal / g;
        if (!(cInt > cB))
            continue;
        const Tb = transferInto(basis, statedOrV, cInt, cB);
        const inter = buildIntermediate(g, m.dec, [Tb, ...extraOnward], src.cExactNominal);
        const rec = { g, Tb, inter, failed: null, value: null };
        const TbD = round3(Tb);
        const destDiluent = closureDec ? Dec.sub(closureDec, TbD) : null;
        if (belowMinimum(Tb, m)) {
            rec.failed = 'minimum';
            rec.value = Tb;
        }
        else if (destDiluent && belowMinimum(destDiluent, m)) {
            rec.failed = 'destination diluent';
            rec.value = destDiluent;
        }
        else if (n.capacity && Dec.cmp(inter.vol.total, n.capacity.dec) > 0) {
            rec.failed = 'capacity';
            rec.value = inter.vol.total;
        }
        else if (serial && sourceTotalDec && Dec.cmp(inter.vol.Td, sourceTotalDec) > 0) {
            rec.failed = 'source total';
            rec.value = inter.vol.Td;
            rec.sourceTotal = sourceTotalDec;
        }
        out.push(rec);
    }
    return { f, candidates: out };
}
function entered(x) {
    return `${x.entered} ${x.unit}`;
}
function rejectUndilutedBelowMinimum(n, ctx, srcLabel, p, transfer, stepDescription) {
    rejectNoIntermediate(n, ctx, srcLabel, p, { f: 1, candidates: [] }, stepDescription);
}
function rejectNoIntermediate(n, ctx, srcLabel, p, evalResult, stepDescription) {
    const { f, candidates } = evalResult;
    const vu = n.display.volumeUnit;
    const dispV = (x) => Dec.toString(Dec.padSig(Dec.shift(Dec.isDec(x) ? x : round3(x), n.display.volumeShift), VOLUME_SF));
    const fmtV = (x) => `${dispV(x)} ${vu}`;
    const fStr = Dec.toString(Dec.roundSig(Dec.fromNumberExact(f), CONCENTRATION_SF));
    let bound, value, message;
    if (candidates.length === 0) {
        bound = 'series floor';
        value = 10;
        message = f <= 1
            ? `Step ${stepDescription} is undiluted stock (factor ${fStr}), and the volume it asks for is below the declared minimum of ${entered(n.minTransfer)}. No intermediate exists for a step that does not dilute, so the bound that failed is the series floor, 10. The remedy is the stated volume.`
            : `Step ${stepDescription} has factor ${fStr}, which does not exceed the smallest value of the intermediate series (10). The intermediate would be the point itself, so no intermediate exists for this step. The bound that failed is the series floor, 10. The remedy is the stated volume.`;
    }
    else {
        const last = candidates[candidates.length - 1];
        bound = last.failed;
        value = last.value;
        const detail = candidates.map((c) => {
            if (c.failed === 'minimum')
                return `g = ${c.g}: transfer ${fmtV(c.Tb)} is below the minimum ${entered(n.minTransfer)}`;
            if (c.failed === 'destination diluent')
                return `g = ${c.g}: transfer ${fmtV(c.Tb)} leaves ${fmtV(c.value)} of diluent in the destination, below the minimum ${entered(n.minTransfer)}`;
            if (c.failed === 'capacity')
                return `g = ${c.g}: intermediate total ${fmtV(c.value)} exceeds the declared capacity ${entered(n.capacity)}`;
            return `g = ${c.g}: transfer into the intermediate ${fmtV(c.value)} exceeds the source vessel's total of ${fmtV(c.sourceTotal)}`;
        }).join('; ');
        if (bound === 'minimum') {
            message = `Step ${stepDescription} (factor ${fStr}) requires a transfer below the declared minimum, and no intermediate in the series satisfies the minimum transfer of ${entered(n.minTransfer)}: ${detail}. The bound that failed is the minimum transfer volume, ${entered(n.minTransfer)}.`;
        }
        else if (bound === 'destination diluent') {
            message = `Step ${stepDescription} (factor ${fStr}) requires a transfer below the declared minimum, and the intermediate that would make the transfer pipettable leaves the destination with less diluent than the declared minimum of ${entered(n.minTransfer)}: ${detail}. The bound that failed is the destination diluent bound, ${entered(n.minTransfer)}. The remedy is the stated volume.`;
        }
        else if (bound === 'capacity') {
            message = `Step ${stepDescription} (factor ${fStr}) requires a transfer below the declared minimum, and no intermediate in the series fits the declared vessel capacity of ${entered(n.capacity)}: ${detail}. The bound that failed is the declared capacity, ${entered(n.capacity)}.`;
        }
        else {
            const st = candidates.find((c) => c.failed === 'source total');
            message = `Step ${stepDescription} (factor ${fStr}) requires a transfer below the declared minimum, and no intermediate in the series can be drawn from the source vessel ${srcLabel}: ${detail}. The bound that failed is the source vessel's total, ${fmtV(st.sourceTotal)}.`;
            value = st.sourceTotal;
        }
    }
    ctx.rejections.push({
        code: 'C3-HI-09',
        message,
        quantities: bound === 'series floor'
            ? { step: stepDescription, factor: f, bound, value, unit: null }
            : { step: stepDescription, factor: f, bound, value: dispV(value), unit: vu },
        scope: { level: 'step', vessel: p.label, from: srcLabel },
    });
}
function planSerialForward(n, ctx, plan, stockVessel, chainPoints, defect) {
    const basis = n.basis;
    const stated = n.volume;
    let src = stockVessel;
    stockVessel.cExactNominal = n.stock.num;
    for (const p of chainPoints) {
        const cB = p.target.num;
        let T = transferInto(basis, stated.num, src.cExactNominal, cB);
        T = applyDefect(defect, T, n);
        const undiluted = cB === src.cExactNominal;
        if (undiluted && belowMinimum(stated.num, n.minTransfer)) {
            rejectUndilutedBelowMinimum(n, ctx, src.label, p, stated.num, `${src.label} → ${p.label}`);
            return;
        }
        if (!undiluted && belowMinimum(T, n.minTransfer)) {
            const sourceTotal = src.kind === 'stock' ? null : src.vol.total;
            const ev = evaluateCandidates(n, basis, stated.num, src, cB, [], sourceTotal, true, basis === 'final' ? stated.dec : null);
            const pick = ev.candidates.find((c) => !c.failed);
            if (!pick) {
                rejectNoIntermediate(n, ctx, src.label, p, ev, `${src.label} → ${p.label}`);
                return;
            }
            p.directTransfer = T;
            const inter = newIntermediateVessel(plan, src, pick.inter, [p.label]);
            feedPoint(n, plan, inter, p, pick.Tb);
        }
        else {
            feedPoint(n, plan, src, p, T);
        }
        src = p.vessel;
    }
}
function planSerialBackward(n, ctx, plan, stockVessel, chainPoints, defect) {
    const basis = 'available';
    const A = n.volume;
    stockVessel.cExactNominal = n.stock.num;
    const feeds = new Array(chainPoints.length);
    let onwardDec = Dec.ZERO;
    let onwardNum = 0;
    let pendingCheckIV = [];
    for (let i = chainPoints.length - 1; i >= 0; i--) {
        const p = chainPoints[i];
        const prev = i === 0 ? stockVessel : chainPoints[i - 1];
        const cSrc = i === 0 ? n.stock.num : chainPoints[i - 1].target.num;
        const cB = p.target.num;
        const V = A.num + onwardNum;
        let T = transferInto(basis, V, cSrc, cB);
        T = applyDefect(defect, T, n);
        const undiluted = cB === cSrc;
        const srcStub = { cExactNominal: cSrc, label: i === 0 ? 'S' : chainPoints[i - 1].label };
        if (undiluted && belowMinimum(V, n.minTransfer)) {
            rejectUndilutedBelowMinimum(n, ctx, srcStub.label, p, V, `${srcStub.label} → ${p.label}`);
            return;
        }
        if (!undiluted && belowMinimum(T, n.minTransfer)) {
            const ev = evaluateCandidates(n, basis, V, srcStub, cB, [], null, false, Dec.add(A.dec, onwardDec));
            const pick = ev.candidates.find((c) => !c.failed);
            if (!pick) {
                rejectNoIntermediate(n, ctx, srcStub.label, p, ev, `${srcStub.label} → ${p.label}`);
                return;
            }
            feeds[i] = { via: pick, T: pick.Tb, directTransfer: T, onwardDec, onwardNum };
            onwardDec = pick.inter.vol.Td;
            onwardNum = pick.inter.vol.T;
            pendingCheckIV.push(i);
        }
        else {
            feeds[i] = { via: null, T, onwardDec, onwardNum };
            if (undiluted) {
                const Vdec = Dec.add(A.dec, onwardDec);
                onwardDec = round3(Vdec);
                onwardNum = V;
            }
            else {
                onwardDec = round3(T);
                onwardNum = T;
            }
        }
    }
    let src = stockVessel;
    for (let i = 0; i < chainPoints.length; i++) {
        const p = chainPoints[i];
        const fd = feeds[i];
        if (fd.via) {
            p.directTransfer = fd.directTransfer;
            const inter = newIntermediateVessel(plan, src, fd.via.inter, [p.label]);
            feedPoint(n, plan, inter, p, fd.T, { onwardDec: fd.onwardDec, onwardNum: fd.onwardNum });
        }
        else {
            feedPoint(n, plan, src, p, fd.T, { onwardDec: fd.onwardDec, onwardNum: fd.onwardNum });
        }
        src = p.vessel;
    }
    for (const i of pendingCheckIV) {
        const p = chainPoints[i];
        const inter = p.vessel.viaIntermediate;
        const source = i === 0 ? null : chainPoints[i - 1].vessel;
        if (source && Dec.cmp(inter.vol.Td, source.vol.total) > 0) {
            const ev = { f: source.cExactNominal / p.target.num, candidates: [{ g: inter.g, Tb: p.vessel.vol.T, inter: null, failed: 'source total', value: inter.vol.Td, sourceTotal: source.vol.total }] };
            rejectNoIntermediate(n, ctx, source.label, p, ev, `${source.label} → ${p.label}`);
        }
    }
}
function planIndependent(n, ctx, plan, stockVessel, chainPoints, defect) {
    const basis = n.basis;
    const stated = n.volume;
    stockVessel.cExactNominal = n.stock.num;
    const needs = [];
    for (const p of chainPoints) {
        const cB = p.target.num;
        let T = transferInto(basis, stated.num, n.stock.num, cB);
        T = applyDefect(defect, T, n);
        const undiluted = cB === n.stock.num;
        if (undiluted && belowMinimum(stated.num, n.minTransfer)) {
            rejectUndilutedBelowMinimum(n, ctx, 'S', p, stated.num, `S → ${p.label}`);
            continue;
        }
        if (!undiluted && belowMinimum(T, n.minTransfer)) {
            const ev = evaluateCandidates(n, basis, stated.num, stockVessel, cB, [], null, false, basis === 'final' ? stated.dec : null);
            const usable = ev.candidates.filter((c) => !c.failed);
            if (usable.length === 0) {
                rejectNoIntermediate(n, ctx, 'S', p, ev, `S → ${p.label}`);
                continue;
            }
            needs.push({ p, T, ev, usable, pos: 0 });
        }
        else {
            feedPoint(n, plan, stockVessel, p, T);
        }
    }
    if (ctx.rejections.length)
        return;
    let groups;
    for (;;) {
        groups = new Map();
        for (const nd of needs) {
            const g = nd.usable[nd.pos].g;
            if (!groups.has(g))
                groups.set(g, []);
            groups.get(g).push(nd);
        }
        let changed = false;
        for (const [g, members] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
            const onward = members.map((nd) => nd.usable[nd.pos].Tb);
            const inter = buildIntermediate(g, n.minTransfer.dec, onward, n.stock.num);
            if (n.capacity && Dec.cmp(inter.vol.total, n.capacity.dec) > 0) {
                for (const nd of members) {
                    nd.pos += 1;
                    if (nd.pos >= nd.usable.length) {
                        const ev = { f: nd.ev.f, candidates: nd.ev.candidates.map((c) => (c.failed ? c : { ...c, failed: 'capacity', value: inter.vol.total })) };
                        rejectNoIntermediate(n, ctx, 'S', nd.p, ev, `S → ${nd.p.label}`);
                        return;
                    }
                }
                changed = true;
                break;
            }
            members.forEach((nd) => { nd.sharedInter = inter; });
        }
        if (!changed)
            break;
    }
    const built = new Map();
    for (const p of chainPoints) {
        const nd = needs.find((x) => x.p === p);
        if (!nd)
            continue;
        const g = nd.usable[nd.pos].g;
        let inter = built.get(g);
        if (!inter) {
            const members = groups.get(g);
            inter = newIntermediateVessel(plan, stockVessel, nd.sharedInter, members.map((x) => x.p.label));
            built.set(g, inter);
        }
        p.directTransfer = nd.T;
        feedPoint(n, plan, inter, p, nd.usable[nd.pos].Tb);
    }
}
function postComputeRejects(n, ctx, plan) {
    dilluentMinimumRejects(n, ctx, plan);
    const vu = n.display.volumeUnit;
    const fmtV = (d) => `${Dec.toString(Dec.padSig(Dec.shift(d, n.display.volumeShift), VOLUME_SF))} ${vu}`;
    for (const v of plan.vessels) {
        if (v.kind === 'stock')
            continue;
        for (const o of v.onward) {
            if (Dec.cmp(o.Td, v.vol.total) > 0) {
                ctx.rejections.push({
                    code: 'C3-HI-06',
                    message: `The transfer of ${fmtV(o.Td)} from ${v.label} to ${o.to} exceeds the ${fmtV(v.vol.total)} that ${v.label} holds (its total as ${totalDescription(n, v)}). A vessel cannot donate more than it holds.`,
                    quantities: { transfer: Dec.toString(Dec.padSig(Dec.shift(o.Td, n.display.volumeShift), VOLUME_SF)), total: Dec.toString(Dec.padSig(Dec.shift(v.vol.total, n.display.volumeShift), VOLUME_SF)), unit: vu, vessel: v.label, to: o.to },
                    scope: { level: 'step', vessel: o.to, from: v.label },
                });
            }
        }
    }
}
function dilluentMinimumRejects(n, ctx, plan) {
    const m = n.minTransfer;
    const statedDiluentReported = ctx.rejections.some((x) => x.code === 'C3-HI-10' && x.quantities && x.quantities.statedDiluent !== undefined);
    const vu = n.display.volumeUnit;
    const fmtV = (d) => `${Dec.toString(Dec.padSig(Dec.shift(d, n.display.volumeShift), VOLUME_SF))} ${vu}`;
    const remedy = n.basis === 'diluent'
        ? 'The remedy is the stated diluent volume.'
        : 'The remedy is the stated volume.';
    for (const v of plan.vessels) {
        if (v.kind === 'stock' || v.receiving === 'stain')
            continue;
        if (n.basis === 'diluent' && v.kind !== 'intermediate' && statedDiluentReported)
            continue;
        const Dd = v.vol.Dd;
        if (!Dd || Dec.cmp(Dd, Dec.ZERO) === 0)
            continue;
        if (Dec.cmp(Dd, m.dec) >= 0)
            continue;
        ctx.rejections.push({
            code: 'C3-HI-10',
            message: `${v.label} is planned with ${fmtV(Dd)} of diluent, below the declared minimum reliable transfer volume of ${entered(m)}. Every volume in this plan is pipetted, the diluent included, so the plan is not preparable as stated. ${remedy}`,
            quantities: { vessel: v.label, diluent: Dec.toString(Dec.padSig(Dec.shift(Dd, n.display.volumeShift), VOLUME_SF)), unit: vu, minimum: m.entered, minimumUnit: m.unit },
            scope: { level: 'step', vessel: v.label },
        });
    }
}
function totalDescription(n, v) {
    if (v.kind === 'intermediate' || n.basis === 'final' || n.basis === 'available')
        return `T + D of its displayed volumes, ${Dec.toString(Dec.shift(v.vol.Td, n.display.volumeShift))} + ${Dec.toString(Dec.shift(v.vol.Dd, n.display.volumeShift))}`;
    return `D + T of its displayed volumes, ${Dec.toString(Dec.shift(v.vol.Dd, n.display.volumeShift))} + ${Dec.toString(Dec.shift(v.vol.Td, n.display.volumeShift))}`;
}
function evaluateFlags(n, ctx, plan) {
    const vu = n.display.volumeUnit;
    const fmtV = (d) => `${Dec.toString(Dec.padSig(Dec.shift(Dec.isDec(d) ? d : round3(d), n.display.volumeShift), VOLUME_SF))} ${vu}`;
    const flag = (code, scope, message, extra) => ctx.flags.push({ code, scope, message, ...(extra || {}) });
    for (const p of plan.points) {
        const v = p.vessel;
        if (v && v.viaIntermediate) {
            const inter = v.viaIntermediate;
            flag('C3-FL-01', { level: 'step', vessel: v.label, from: inter.sourceLabel }, `Step ${inter.sourceLabel} → ${v.label}: the direct transfer of ${fmtV(p.directTransfer)} cannot be pipetted at the declared minimum of ${entered(n.minTransfer)}; an intermediate, ${inter.label}, at 1/${inter.g} of ${inter.sourceLabel} has been planned. ${v.label} is drawn from ${inter.label}.`);
        }
    }
    if (n.maxTransfer) {
        for (const v of plan.vessels) {
            if (v.kind === 'stock' || v.isZero)
                continue;
            if (v.vol.T > n.maxTransfer.num) {
                flag('C3-FL-02', { level: 'step', vessel: v.label, from: v.sourceLabel }, `Step ${v.sourceLabel} → ${v.label}: the transfer of ${fmtV(v.vol.Td)} exceeds the declared single-transfer maximum of ${entered(n.maxTransfer)} and must be split or performed in a larger vessel.`);
            }
        }
    }
    else {
        ctx.notes.push('No maximum single-transfer volume was declared; C3-FL-02 was not evaluated.');
    }
    if (n.capacity) {
        for (const v of plan.vessels) {
            if (v.kind === 'stock')
                continue;
            if (Dec.cmp(v.vol.total, n.capacity.dec) > 0) {
                flag('C3-FL-03', { level: 'vessel', vessel: v.label }, `${v.label}: the total of ${fmtV(v.vol.total)} exceeds the declared vessel capacity of ${entered(n.capacity)}.`);
            }
        }
    }
    else {
        ctx.notes.push('No vessel working capacity was declared; C3-FL-03 was not evaluated and C3-DT-06 condition (iii) did not apply.');
    }
    if (n.stockProvenance === 'not-recorded') {
        flag('C3-FL-04', { level: 'plan' }, 'Stock provenance not recorded; the plan cannot be traced to a source and should not be carried into a method record without one.');
    }
    if (n.basis === 'diluent') {
        flag('C3-FL-05', { level: 'plan' }, 'The stated volume is diluent only; the final volume of each diluted vessel exceeds it by the transfer and is as stated on the output. Two points are not diluted and do not: an undiluted point (target = stock) is the stated volume of stock, and a zero point the stated volume of diluent.');
    }
    const consumed = stockConsumed(plan);
    if (n.stockAvailable) {
        if (Dec.cmp(consumed, n.stockAvailable.dec) > 0) {
            const excess = Dec.sub(consumed, n.stockAvailable.dec);
            flag('C3-FL-06', { level: 'plan' }, `The plan requires ${fmtV(consumed)} of stock, more than the ${entered(n.stockAvailable)} declared available, by ${Dec.toString(Dec.trimZeros(Dec.shift(excess, n.display.volumeShift)))} ${vu}.`);
        }
    }
    else {
        ctx.notes.push('No available stock volume was declared; C3-FL-06 was not evaluated.');
    }
    if (n.imported && Array.isArray(n.imported.flags) && n.imported.flags.length) {
        for (const f of n.imported.flags) {
            flag('C3-FL-07', { level: 'plan', imported: f.scope || null }, `Imported from ${n.imported.tool}${n.imported.resultId ? ` (result ${n.imported.resultId})` : ''}: [${f.code || 'flag'}] ${f.message || ''}`.trim(), { origin: { tool: n.imported.tool, resultId: n.imported.resultId || null, code: f.code || null } });
        }
    }
    for (const p of plan.points) {
        const v = p.vessel;
        if (!v)
            continue;
        if (v.isZero)
            flag('C3-FL-08', { level: 'vessel', vessel: v.label }, `${v.label} is diluent alone and contains none of the stock. It is prepared independently of the chain.`);
        if (v.isUndiluted) {
            flag('C3-FL-09', { level: 'vessel', vessel: v.label }, n.basis === 'diluent'
                ? `${v.label} is undiluted stock; the stated diluent volume is taken as the volume of stock for this point, and no diluent is added.`
                : `${v.label} is undiluted stock; no diluent is added.`);
        }
    }
    if (n.diluent.notRecorded) {
        flag('C3-FL-10', { level: 'plan' }, 'Diluent not recorded; a concentration in an unrecorded diluent cannot be carried into a method record.');
    }
    if (!n.stockFormulation)
        ctx.notes.push('Stock formulation not recorded.');
}
function stockConsumed(plan) {
    const stock = plan.vessels.find((v) => v.kind === 'stock');
    return stock.onward.reduce((acc, o) => Dec.add(acc, o.Td), Dec.ZERO);
}
function buildRegister(n) {
    const declared = (x, fallback) => (x ? `${x.entered} ${x.unit}` : fallback);
    const t = TOLERANCE_REGISTRATION;
    return [
        {
            threshold: 'Achieved-concentration bound',
            value: t.achievedBound === 'derived'
                ? `Per vessel (1 + h(T)/(Tᵈ − h(T)))/(1 − h(D)/V) − 1, compounded Π(1 + bᵢ) − 1. Worst-case bound ${sf3sci(ACHIEVED_BOUND_PER_STEP_WORST)} per step at leading digit 1; ${sf3sci(ACHIEVED_BOUND_PER_STEP_EXACT_CLOSURE)} where closure is exact or under the diluent-volume basis`
                : null,
            basis: 'Analytic and exact over the displayed-precision rounding of the operation set, including the C3-IV-01 residual. Observed maximum 8.06 × 10⁻³, evidence only. Memo signed 21 September 2026',
            status: t.achievedBound,
        },
        {
            threshold: 'Round-trip tolerance, exact concentration',
            value: t.roundTrip === 'derived'
                ? `${ROUND_TRIP_ULP_PER_STEP} ULP of the target per step from stock (${ROUND_TRIP_ULP_PER_STEP}k at k steps), a planned intermediate counting as a step. Reference value: the target in the engine's internal unit`
                : null,
            basis: 'Analytic over the operation set, rounding count checked basis by basis. Not assumed from C1. Memo signed 21 September 2026',
            status: t.roundTrip,
        },
        {
            threshold: 'Closure residual, displayed volumes',
            value: '±½ unit in the last displayed place of the one derived volume per vessel; zero under the diluent-volume basis',
            basis: 'Analytic, from C3-DT-04; derivation recorded in the tolerance memo',
            status: 'derived',
        },
        {
            threshold: 'Minimum reliable transfer volume',
            value: declared(n.minTransfer, `user-declared, ${SUGGESTED_MIN_TRANSFER_UL} µL suggested`),
            basis: `Disclosed default of ${SUGGESTED_MIN_TRANSFER_UL} µL, carried from C4. Applies to every pipetted volume, diluent included (C3-VB-06, C3-HI-10), and every comparison uses the displayed volume (C3-PC-01)`,
            status: 'disclosed',
        },
        {
            threshold: 'Maximum single-transfer volume',
            value: declared(n.maxTransfer, 'user-declared, optional, no default; not declared for this plan'),
            basis: 'Disclosed. Never alters a planned volume (C3-IV-08 a)',
            status: 'disclosed',
        },
        {
            threshold: 'Vessel working capacity',
            value: declared(n.capacity, 'user-declared, optional, no default; not declared for this plan'),
            basis: 'Disclosed',
            status: 'disclosed',
        },
        {
            threshold: 'Intermediate factor series',
            value: '{10, 100, 1000, …}',
            basis: 'Inspection: checkable by eye. Consequence published per C3-DT-06 step 5: no intermediate for f ≤ 11 under the final-volume and available-volume bases, f ≤ 10 under the diluent-volume basis',
            status: 'disclosed',
        },
        {
            threshold: 'Displayed precision, volumes',
            value: `${VOLUME_SF} significant figures`,
            basis: 'Tool-set principle: precision matches the resolution of the physical act the number drives',
            status: 'disclosed',
        },
        {
            threshold: 'Displayed precision, concentrations',
            value: `${CONCENTRATION_SF} significant figures, on values that carry information`,
            basis: 'Matches C1; a concentration drives a record, not an act',
            status: 'disclosed',
        },
    ];
}
function assemble(ctx, n, plan) {
    const shift = n.display ? n.display.volumeShift : 0;
    const vu = n.display ? n.display.volumeUnit : null;
    const q = (dec, unrounded) => (dec === null || dec === undefined ? null : {
        display: Dec.toString(Dec.shift(dec, shift)),
        unit: vu,
        unrounded: unrounded === undefined ? null : unrounded / (10 ** -shift),
        internalUnrounded: unrounded === undefined ? null : unrounded,
    });
    const qs = (dec, unrounded) => (dec === null || dec === undefined ? null : {
        display: Dec.toString(Dec.padSig(Dec.shift(dec, shift), VOLUME_SF)),
        unit: vu,
        unrounded: unrounded === undefined ? null : unrounded / (10 ** -shift),
        internalUnrounded: unrounded === undefined ? null : unrounded,
    });
    const echoQ = (x) => (x ? { value: x.entered, unit: x.unit } : null);
    const status = ctx.incomplete.length ? 'incomplete' : ctx.rejections.length ? 'rejected' : 'plan';
    const declarations = n.stock ? {
        stock: { concentration: echoQ(n.stock), provenance: n.stockProvenance ? { key: n.stockProvenance, label: STOCK_PROVENANCE[n.stockProvenance] } : null,
            availableVolume: n.stockAvailable ? { value: n.stockAvailable.entered, unit: n.stockAvailable.unit, declared: true } : { declared: false },
            formulation: n.stockFormulation ? { recorded: true, text: n.stockFormulation } : { recorded: false, text: null } },
        target: { form: n.targetForm, provenance: n.targetProvenance ? { key: n.targetProvenance, label: TARGET_PROVENANCE[n.targetProvenance] } : null,
            origin: n.targetOrigin, declaredFactor: n.declaredFactor ?? null, count: n.count ?? null,
            values: (n.targets || []).map((t, i) => ({ label: `P${i + 1}`, value: t.entered, unit: t.unit, derivedFromTop: !!t.derivedFromTop, internal: t.num })) },
        volume: n.volume ? { value: n.volume.entered, unit: n.volume.unit } : null,
        basis: n.basis ? { key: n.basis, label: BASIS[n.basis].label, short: BASIS[n.basis].short, statedVolumeIs: ADDITIVITY.statedVolumeIs[n.basis], fixedByImport: !!(n.imported && n.imported.fixed && n.imported.fixed.includes('basis') && !n.overrides.some((o) => o.field === 'basis')) } : null,
        route: n.multiPoint ? (n.route ? { key: n.route, label: n.route === 'serial' ? 'serial — each point from the previous' : 'independent — each point from stock' } : null) : { key: null, label: 'not applicable — a single point is planned', notApplicable: true },
        diluent: n.diluent || null,
        capability: {
            minTransfer: n.minTransfer ? { value: n.minTransfer.entered, unit: n.minTransfer.unit, declared: true } : null,
            maxTransfer: n.maxTransfer ? { value: n.maxTransfer.entered, unit: n.maxTransfer.unit, declared: true } : { declared: false, statement: 'no maximum single-transfer volume declared' },
            capacity: n.capacity ? { value: n.capacity.entered, unit: n.capacity.unit, declared: true } : { declared: false, statement: 'no vessel working capacity declared' },
        },
        imported: n.imported ? { tool: n.imported.tool, resultId: n.imported.resultId || null, fixed: n.imported.fixed || [], stainingVolume: n.imported.stainingVolume || null, cellNumber: n.imported.cellNumber || null, vendorBasis: n.imported.vendorBasis || null } : null,
        overrides: n.overrides || [],
    } : null;
    const result = {
        schema: 'ligant.bench-tools.result',
        schemaVersion: '1-c3',
        tool: TOOL_ID,
        engineVersion: ENGINE_VERSION,
        ursVersion: URS_VERSION,
        status,
        incomplete: ctx.incomplete,
        rejections: ctx.rejections,
        flags: ctx.flags,
        notes: ctx.notes,
        inputs: ctx.input,
        declarations,
        precision: { volumes: VOLUME_SF, concentrations: CONCENTRATION_SF, rounding: ROUNDING_RULE },
        register: buildRegister(n),
        factorConvention: FACTOR_CONVENTION,
        orderOfAddition: ORDER_OF_ADDITION,
        labelScheme: LABEL_SCHEME,
        additivity: ADDITIVITY,
        relations: n.basis ? relationsFor(n.basis) : [],
        intermediateRule: {
            series: INTERMEDIATE_SERIES,
            candidates: '{10, 100, 1000, …}, g < f',
            consequence: INTERMEDIATE_CONSEQUENCE,
            steps: INTERMEDIATE_RULE_STEPS,
        },
        scope: 'Research use. Not qualified for GxP decision-making.',
        plansNotVerifies: 'This tool plans preparation. It does not verify what was prepared.',
        tolerances: {
            roundTrip: TOLERANCE_REGISTRATION.roundTrip === 'derived'
                ? { status: 'derived', ulpPerStep: ROUND_TRIP_ULP_PER_STEP, statement: `Round-trip tolerance, exact concentration: ${ROUND_TRIP_ULP_PER_STEP} ULP of the target per step from stock (${ROUND_TRIP_ULP_PER_STEP}k at k steps), a planned intermediate counting as a step. The reference value is the target in the engine's internal unit. Derived analytically over the stated operation set; signed 21 September 2026.` }
                : { status: 'open', ulpPerStep: null, statement: 'Round-trip tolerance, exact concentration: open. Its derivation is not registered, so no value is stated here.' },
            achievedBound: TOLERANCE_REGISTRATION.achievedBound === 'derived'
                ? { status: 'derived', perStepWorst: ACHIEVED_BOUND_PER_STEP_WORST, perStepExactClosure: ACHIEVED_BOUND_PER_STEP_EXACT_CLOSURE, statement: 'Achieved-concentration bound: per vessel (1 + h_T/(Tᵈ − h_T))/(1 − h_D/V) − 1 with h the half-unit of the last displayed place, compounded along the chain as Π(1 + bᵢ) − 1 and stated at every point. Worst-case bound 1.01 × 10⁻² per step at leading digit 1; 5.03 × 10⁻³ where closure is exact or under the diluent-volume basis. Derived analytically; signed 21 September 2026.' }
                : { status: 'open', perStepWorst: null, perStepExactClosure: null, statement: 'Achieved-concentration bound: open. Every point carries the bound computed from its own displayed values; no worst case is registered while the derivation is unsigned.' },
            closureResidual: { status: 'derived', statement: '±½ unit in the last displayed place of the one derived volume per vessel; zero under the diluent-volume basis.' },
        },
        vessels: [],
        steps: [],
        stockConsumed: null,
        displayUnits: n.display ? { volume: n.display.volumeUnit, concentration: n.display.concUnit } : null,
    };
    if (!plan)
        return result;
    const concDisp = (internal) => concDisplayString(internal, n.display.concUnit);
    const concScale = n.display.concUnit ? unitInfo(n.display.concUnit).scale : 1;
    const cq = (internal) => (internal === null || internal === undefined ? null : {
        value: internal / concScale,
        unit: n.display.concUnit,
        display: internal === 0 ? '0' : concDisp(internal),
        internalUnrounded: internal,
    });
    const sf6 = (x) => Dec.toString(Dec.roundSig(Dec.fromNumberExact(x), CONCENTRATION_SF));
    const flagsFor = (label) => ctx.flags.filter((f) => f.scope && f.scope.vessel === label).map((f) => f.code);
    for (const v of plan.vessels) {
        const rec = {
            label: v.label,
            kind: v.kind,
            pointIndex: v.kind === 'point' ? v.pointIndex : null,
            sourceLabel: v.sourceLabel,
            stepsFromStock: v.stepsFromStock,
            receiving: v.receiving,
            isZero: !!v.isZero,
            isUndiluted: !!v.isUndiluted,
            intermediateFactor: v.kind === 'intermediate' ? v.g : null,
            sizedBy: v.kind === 'intermediate' ? v.sizedBy : null,
            destinations: v.kind === 'intermediate' ? v.destinations : null,
            concentration: null,
            volumes: null,
            flags: flagsFor(v.label),
        };
        if (v.kind === 'stock') {
            rec.concentration = { exact: cq(v.cExact), entered: { value: n.stock.entered, unit: n.stock.unit } };
            rec.volumes = { onward: v.onward.map((o) => ({ to: o.to, transfer: q(o.Td, o.T) })) };
        }
        else {
            const vol = v.vol;
            rec.concentration = {
                target: v.kind === 'point' ? (v.cTargetEntered !== null ? { value: v.cTargetEntered, unit: v.unit, asEntered: true } : { value: concDisp(v.cExactNominal), unit: n.display.concUnit, asEntered: false, derivedFromTop: true }) : null,
                nominal: v.kind === 'intermediate' ? { value: concDisp(v.cExactNominal), unit: n.display.concUnit } : null,
                exact: cq(v.isZero ? 0 : v.cExact),
                achieved: cq(v.isZero ? 0 : v.cAchieved),
                achievedDeparture: v.isZero || v.cExactNominal === 0 ? null : { relative: v.cAchieved / v.cExactNominal - 1 },
                bound: boundFor(v),
            };
            rec.factorFromSource = v.isZero ? null : { value: v.factorFromSource, display: sf6(v.factorFromSource), exact: vol.totalUnrounded / vol.T, exactDisplay: vol.T === 0 ? null : sf6(vol.totalUnrounded / vol.T) };
            const onwardTotalDec = v.onward.reduce((acc, o) => Dec.add(acc, o.Td), Dec.ZERO);
            const onwardTotalNum = v.onward.reduce((acc, o) => acc + o.T, 0);
            rec.volumes = {
                transferIn: q(vol.Td, vol.T),
                diluent: { ...q(vol.Dd, vol.D), derived: vol.derived === 'diluent', derivedFrom: vol.derivedFrom ? Dec.toString(Dec.shift(vol.derivedFrom, shift)) : null },
                total: { ...qs(vol.total, vol.totalUnrounded), neverRounded: true },
                closureTarget: vol.closureTarget ? Dec.toString(Dec.padSig(Dec.shift(vol.closureTarget, shift), VOLUME_SF)) : null,
                residual: vol.residual && !Dec.isZero(vol.residual) ? Dec.toString(Dec.trimZeros(Dec.shift(vol.residual, shift))) : (vol.residual ? '0' : null),
                closes: vol.residual ? Dec.isZero(vol.residual) : null,
                onward: v.onward.map((o) => ({ to: o.to, transfer: q(o.Td, o.T) })),
                onwardTotal: v.onward.length ? qs(onwardTotalDec, onwardTotalNum) : null,
                remaining: { ...qs(Dec.sub(vol.total, onwardTotalDec), vol.totalUnrounded - onwardTotalNum), neverRounded: true },
                finalVolume: n.basis === 'diluent' && v.kind === 'point' ? { ...qs(vol.total, vol.totalUnrounded), neverRounded: true } : null,
                mustAlreadyHold: v.receiving === 'stain' ? q(vol.Dd, vol.D) : null,
            };
            if (v.kind === 'point' && n.targetForm === 'top-factor-count' && !v.isZero) {
                const via = v.viaIntermediate;
                const exactFromPrev = via ? (via.vol.totalUnrounded / via.vol.T) * (vol.totalUnrounded / vol.T) : vol.totalUnrounded / vol.T;
                rec.factorFromPreviousPoint = { declared: v.pointIndex === 0 ? null : n.declaredFactor, exact: exactFromPrev, exactDisplay: sf6(exactFromPrev), isStockToTop: v.pointIndex === 0 };
                if (n.route === 'independent' && v.pointIndex > 0) {
                    const prev = plan.points[v.pointIndex - 1].vessel;
                    const prevVia = prev.viaIntermediate;
                    const prevExact = prevVia ? (prevVia.vol.totalUnrounded / prevVia.vol.T) * (prev.vol.totalUnrounded / prev.vol.T) : prev.vol.totalUnrounded / prev.vol.T;
                    rec.factorFromPreviousPoint.exact = exactFromPrev / prevExact;
                    rec.factorFromPreviousPoint.exactDisplay = sf6(exactFromPrev / prevExact);
                }
            }
        }
        result.vessels.push(rec);
    }
    result.steps = result.vessels.filter((v) => v.kind !== 'stock' && !v.isZero).map((v, i) => ({
        index: i + 1, from: v.sourceLabel, to: v.label, transfer: v.volumes.transferIn, factor: v.factorFromSource, flags: v.flags,
    }));
    result.stockConsumed = { ...qs(stockConsumed(plan), plan.vessels[0].onward.reduce((a, o) => a + o.T, 0)), neverRounded: true };
    return result;
}
export function boundFor(v, status = TOLERANCE_REGISTRATION.achievedBound) {
    if (status !== 'derived') {
        return { status, relative: null, own: null, display: null, withheld: 'derivation memo unsigned' };
    }
    if (v.isZero)
        return { status, relative: null, own: null, display: null };
    return { status, relative: v.bound, own: v.boundOwn, display: sf3sci(v.bound) };
}
function sf3sci(x) {
    if (x === 0)
        return '0';
    const r = Dec.roundSig(Dec.fromNumberExact(x), 3);
    const digits = r.mant.toString();
    const exp = r.exp + digits.length - 1;
    const mant = `${digits[0]}.${digits.slice(1)}`;
    const sup = String(exp).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return `${mant} × 10${sup}`;
}
function relationsFor(basis) {
    switch (basis) {
        case 'final': return [
            'T = F × c_target / c_source — the transfer into the vessel, rounded to 3 significant figures for display (Tᵈ)',
            'D = F − Tᵈ — the diluent, derived from displayed values and rounded once (Dᵈ)',
            'total = Tᵈ + Dᵈ; remaining = total − onwardᵈ — reported as arithmetic on displayed values, never rounded',
            'ρ = Dᵈ − (F − Tᵈ) — the closure residual, ±½ unit in the last displayed place of D',
        ];
        case 'diluent': return [
            'T = D × c_target / (c_source − c_target) — the transfer into the vessel, rounded to 3 significant figures for display (Tᵈ)',
            'final volume = D + Tᵈ — reported as arithmetic on displayed values, never rounded; nothing is derived and there is no residual',
            'remaining = (D + Tᵈ) − onwardᵈ',
        ];
        case 'available': return [
            'Vᵢ = A + Tᵢ₊₁ — each vessel other than the last is prepared to the available volume plus its onward transfer; the last to A alone; solved from the last point backward',
            'Tᵢ = Vᵢ × c_target / c_source — the transfer into the vessel, rounded to 3 significant figures for display (Tᵢᵈ)',
            'Dᵢ = A + Tᵢ₊₁ᵈ − Tᵢᵈ — the diluent, derived from displayed values and rounded once (Dᵢᵈ)',
            'Vᵢ = Tᵢᵈ + Dᵢᵈ; remaining = Vᵢ − Tᵢ₊₁ᵈ — reported as arithmetic on displayed values, never rounded; the remaining volume differs from the declared A by the residual ρ',
        ];
        default: return [];
    }
}
export { concDisplayString, decadeCandidates, transferInto };
