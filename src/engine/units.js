export const DIMENSION = Object.freeze({
    MASS_PER_VOLUME: 'mass/volume',
    AMOUNT_PER_VOLUME: 'amount/volume',
    VOLUME: 'volume',
});
export const CONCENTRATION_UNITS = Object.freeze([
    { symbol: 'mg/mL', dimension: DIMENSION.MASS_PER_VOLUME, scale: 1e6 },
    { symbol: 'µg/mL', dimension: DIMENSION.MASS_PER_VOLUME, scale: 1e3 },
    { symbol: 'ng/mL', dimension: DIMENSION.MASS_PER_VOLUME, scale: 1 },
    { symbol: 'g/L', dimension: DIMENSION.MASS_PER_VOLUME, scale: 1e6 },
    { symbol: 'mg/L', dimension: DIMENSION.MASS_PER_VOLUME, scale: 1e3 },
    { symbol: 'M', dimension: DIMENSION.AMOUNT_PER_VOLUME, scale: 1e12 },
    { symbol: 'mM', dimension: DIMENSION.AMOUNT_PER_VOLUME, scale: 1e9 },
    { symbol: 'µM', dimension: DIMENSION.AMOUNT_PER_VOLUME, scale: 1e6 },
    { symbol: 'nM', dimension: DIMENSION.AMOUNT_PER_VOLUME, scale: 1e3 },
    { symbol: 'pM', dimension: DIMENSION.AMOUNT_PER_VOLUME, scale: 1 },
]);
export const VOLUME_UNITS = Object.freeze([
    { symbol: 'µL', dimension: DIMENSION.VOLUME, scale: 1 },
    { symbol: 'mL', dimension: DIMENSION.VOLUME, scale: 1e3 },
    { symbol: 'L', dimension: DIMENSION.VOLUME, scale: 1e6 },
]);
const ALL = [...CONCENTRATION_UNITS, ...VOLUME_UNITS];
const BY_SYMBOL = new Map(ALL.map((u) => [u.symbol, u]));
for (const u of ALL) {
    if (u.symbol.includes('µ'))
        BY_SYMBOL.set(u.symbol.replace('µ', 'u'), u);
}
export function unitInfo(symbol) {
    const u = BY_SYMBOL.get(symbol);
    if (!u)
        throw new Error(`unknown unit: "${symbol}"`);
    return u;
}
export function isConcentrationUnit(symbol) {
    const u = BY_SYMBOL.get(symbol);
    return !!u && u.dimension !== DIMENSION.VOLUME;
}
export function isVolumeUnit(symbol) {
    const u = BY_SYMBOL.get(symbol);
    return !!u && u.dimension === DIMENSION.VOLUME;
}
export function dimensionOf(symbol) {
    return unitInfo(symbol).dimension;
}
export function toInternal(value, symbol) {
    const u = unitInfo(symbol);
    return u.scale === 1 ? value : value * u.scale;
}
export function fromInternal(value, symbol) {
    const u = unitInfo(symbol);
    return u.scale === 1 ? value : value / u.scale;
}
export function scaleExponent(symbol) {
    const u = unitInfo(symbol);
    return Math.round(Math.log10(u.scale));
}
export function canonicalSymbol(symbol) {
    return unitInfo(symbol).symbol;
}
