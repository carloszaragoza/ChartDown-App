import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { barAt, chartClicks, sectionAt, videoSections } from "./sections";

const SONG = "---\ntempo: 120\n---\n## Intro\n1 | 4\n## Verse\n|: 1 | 5 :|\n## Chorus\n4 | 1\n";

describe("T-2502 where each section falls in the video", () => {
  it("R-03.11 sections in play order, timed by tempo and bars, from where the music starts", () => {
    // 120 bpm in 4/4: two seconds a bar; the verse repeats, so it lasts four bars.
    const sections = videoSections(parse(SONG), 7);
    expect(sections?.map(({ name, start, end }) => [name, start, end])).toEqual([
      ["Intro", 7, 11],
      ["Verse", 11, 19],
      ["Chorus", 19, 23],
    ]);
  });

  it("R-03.11 a slower tempo spreads them out", () => {
    const slow = videoSections(parse(SONG.replace("tempo: 120", "tempo: 72")), 0);
    // 72 bpm: 60/72 s a beat, 10/3 s a bar.
    expect(slow?.[1]?.start).toBeCloseTo(20 / 3);
    expect(slow?.[2]?.end).toBeCloseTo(80 / 3);
  });

  it("R-03.11 a section the chart plays again comes again in the bar, twice as long with 2x", () => {
    const again = `${SONG}## Bridge\n6m | 5\n## Last chorus\n@use Chorus 2x\n`;
    const sections = videoSections(parse(again), 0);
    expect(sections?.map(({ name, start, end }) => [name, start, end]).slice(3)).toEqual([
      ["Bridge", 16, 20],
      ["Last chorus", 20, 28],
    ]);
  });

  it("R-03.11 a chart with no tempo can't be placed", () => {
    expect(videoSections(parse("## Verse\n1 | 4\n"), 0)).toBeNull();
  });

  it("R-03.11 the section playing at a time", () => {
    const sections = videoSections(parse(SONG), 7) ?? [];
    expect(sectionAt(sections, 3)).toBe(-1);
    expect(sectionAt(sections, 12)).toBe(1);
    expect(sectionAt(sections, 23)).toBe(-1);
  });

  it("R-03.11 the bar the video is playing, with repeats, at 72 bpm from 7 s", () => {
    const placed = chartClicks(parse(SONG.replace("tempo: 120", "tempo: 72")));
    if (!placed) throw new Error("no tempo");
    const at = (seconds: number) => barAt(placed.bars, placed.list, seconds, 7);
    const bar = 10 / 3; // 4 beats at 72 bpm
    expect(at(6)).toBeNull();
    expect(at(7)).toMatchObject({ section: 0, row: 0, index: 0, progress: 0, downbeat: true });
    expect(at(7 + bar * 1.5)).toMatchObject({ section: 0, index: 1 });
    expect(at(7 + bar * 1.5)?.progress).toBeCloseTo(0.5);
    // The verse's second pass: its first bar again.
    expect(at(7 + bar * 4.25)).toMatchObject({ section: 1, index: 0 });
    expect(at(7 + bar * 4.25)?.progress).toBeCloseTo(0.25);
    expect(at(7 + bar * 7.9)).toMatchObject({ section: 2, index: 1 });
    expect(at(7 + bar * 8)).toBeNull();
  });
});
