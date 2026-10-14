export const TOLERANCE_REGISTRATION = Object.freeze({
    roundTrip: 'derived',
    achievedBound: 'derived',
});
import * as Dec from './decimal.js';
export const ROUND_TRIP_ULP_PER_STEP = 6;
export function roundTripToleranceUlp(stepsFromStock) {
    return ROUND_TRIP_ULP_PER_STEP * stepsFromStock;
}
const A1 = 0.005 / 0.995;
export const ACHIEVED_BOUND_PER_STEP_WORST = (1 + A1) / (1 - A1) - 1;
export const ACHIEVED_BOUND_PER_STEP_EXACT_CLOSURE = A1;
export function vesselDepartureBound({ Td, Dd, closure, basis, undiluted, zero }) {
    if (zero || undiluted)
        return 0;
    const hT = Dec.toNumber(Dec.halfUlp(Td));
    const tdn = Dec.toNumber(Td);
    const bT = tdn > hT ? hT / (tdn - hT) : 1;
    if (basis === 'diluent' || !closure) {
        return bT;
    }
    const hD = Dec.toNumber(Dec.halfUlp(Dd));
    const V = Dec.toNumber(closure);
    return (1 + bT) / (1 - hD / V) - 1;
}
export function compoundBound(sourceBound, own) {
    return (1 + sourceBound) * (1 + own) - 1;
}
export function worstCaseChain(n) {
    return (1 + ACHIEVED_BOUND_PER_STEP_WORST) ** n - 1;
}
