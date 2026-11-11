// Value-axis scale for the hand-built charts (Epic 21 gave them a real
// y-axis). Rounds the data range out to "nice" tick steps (1, 2, 2.5, 5 ×
// 10^n) so labels read 0 / 500 / 1,000 / 1,500 rather than 0 / 437 / 875.

const NICE_STEPS = [1, 2, 2.5, 5, 10];

function NiceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const step = NICE_STEPS.find((candidate) => candidate >= fraction) ?? 10;
  return step * magnitude;
}

export interface LinearScale {
  min: number;
  max: number;
  ticks: number[];
  // 0 at `min`, 1 at `max`.
  toFraction: (value: number) => number;
}

export function BuildLinearScale(
  values: number[],
  { tickCount = 4, includeZero = true } = {},
): LinearScale {
  const finite = values.filter((value) => Number.isFinite(value));
  let low = finite.length ? Math.min(...finite) : 0;
  let high = finite.length ? Math.max(...finite) : 0;
  if (includeZero) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (low === high) {
    high = low === 0 ? 1 : high + Math.abs(high) * 0.5;
  }

  const step = NiceStep((high - low) / tickCount);
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) {
    // Strip float noise (0.30000000000000004).
    ticks.push(Number(tick.toPrecision(12)));
  }

  return {
    min,
    max,
    ticks,
    toFraction: (value) => (value - min) / (max - min),
  };
}

// Indices of the x labels to print under a chart with `count` points —
// first, last, and evenly spaced ones between, so labels never collide.
export function XLabelIndices(count: number, maxLabels = 5): number[] {
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const indices = new Set<number>();
  for (let i = 0; i < maxLabels; i++) {
    indices.add(Math.round((i * (count - 1)) / (maxLabels - 1)));
  }
  return [...indices];
}
