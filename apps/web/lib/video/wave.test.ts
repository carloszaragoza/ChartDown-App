import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { chartWave, sectionLoudness, shapedWave, windowWave } from "./wave";

const average = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

describe("T-2829 the waveform under a player's sections", () => {
  it("R-03.11 a video's waveform is drawn from the chart: soft where it says p, loud where ff", () => {
    const chart = parse(
      "---\ntempo: 120\n---\n## Verse\n{p} 1 | 4 | 5 | 1\n## Chorus\n{ff} 4 | 1 | 5 | 1\n",
    );
    const wave = chartWave(chart, 80);
    expect(wave).toHaveLength(80);
    expect(wave.every((height) => height >= 0 && height <= 1)).toBe(true);
    expect(average(wave.slice(40))).toBeGreaterThan(average(wave.slice(0, 40)) * 2);
  });

  it("R-03.11 with no dynamics a chorus is drawn louder than an intro, the same every time", () => {
    const text = "---\ntempo: 100\n---\n## Intro\n1 | 4\n## Chorus\n4 | 1\n";
    const wave = chartWave(parse(text), 40);
    expect(average(wave.slice(20))).toBeGreaterThan(average(wave.slice(0, 20)));
    expect(chartWave(parse(text), 40)).toEqual(wave);
    expect(sectionLoudness("Chorus 2")).toBeGreaterThan(sectionLoudness("Intro"));
  });

  it("R-03.11 a chart with no tempo has no waveform to place", () => {
    expect(chartWave(parse("## Verse\n1 | 4\n"), 40)).toEqual([]);
  });

  it("R-06.7 the band's recording is drawn between where the sections start and end", () => {
    // Ten seconds, quiet for the first half and loud for the second.
    const peaks = [...Array<number>(50).fill(100), ...Array<number>(50).fill(900)];
    expect(windowWave(peaks, 10, 5, 10, 4)).toEqual([0.9, 0.9, 0.9, 0.9]);
    expect(windowWave(peaks, 10, 0, 4, 2)).toEqual([0.1, 0.1]);
  });

  it("R-06.7 T-2835 a loud master's waveform still shows its soft and loud parts; silence stays low", () => {
    const wave = shapedWave([0, 0.9, 0.92, 0.94, 0.96, 0.98, 1, 0.9, 0.01]);
    expect(wave[0]).toBe(0);
    expect(wave[8]).toBeLessThan(0.05);
    expect(wave[1]).toBeCloseTo(0.12);
    expect(wave[6]).toBe(1);
    expect((wave[3] ?? 0) - (wave[1] ?? 0)).toBeGreaterThan(0.3);
    expect(shapedWave([0.5, 0.5])).toEqual([1, 1]);
    expect(shapedWave([0, 0])).toEqual([0, 0]);
  });
});
