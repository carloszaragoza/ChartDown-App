import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { barAt, chartClicks, sectionAt, sectionLabels, videoSections } from "./sections";

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
    // Beat by beat, as the metronome: the first beat fills a quarter of a 4/4 bar.
    expect(at(7)).toMatchObject({ section: 0, row: 0, index: 0, progress: 0.25, downbeat: true });
    expect(at(7 + bar * 1.5)).toMatchObject({ section: 0, index: 1, progress: 0.75 });
    expect(at(7 + bar * 1.6)).toMatchObject({ progress: 0.75, downbeat: false });
    // The verse's second pass: its first bar again.
    expect(at(7 + bar * 4.3)).toMatchObject({ section: 1, index: 0, progress: 0.5 });
    expect(at(7 + bar * 7.9)).toMatchObject({ section: 2, index: 1 });
    expect(at(7 + bar * 8)).toBeNull();
  });
});

describe("T-2505 the sections bar names sections as the song form does", () => {
  it("R-03.11 abbreviations, and which time a section the chart plays again is", () => {
    const chart = parse(
      "---\ntempo: 120\n---\n## Verse 1\n1 | 4\n## Chorus\n4 | 1\n## Verse 2\n1 | 4\n## Chorus\n4 | 1\n## Bridge\n|: 6m | 5 :|\n## Bridge\n@use Bridge\n",
    );
    const sections = videoSections(chart, 0) ?? [];
    expect(sectionLabels(chart, sections)).toEqual([
      { abbreviation: "V1", time: 1, of: 1 },
      { abbreviation: "C", time: 1, of: 1 },
      { abbreviation: "V2", time: 1, of: 1 },
      { abbreviation: "C2", time: 1, of: 1 },
      { abbreviation: "B", time: 1, of: 1 },
      { abbreviation: "B2", time: 1, of: 1 },
    ]);
  });

  it("R-06.7 a section the chart plays again reads B1, then B1²", () => {
    const chart = parse(
      "---\ntempo: 120\n---\n## Bridge 1\n6m | 5\n## Chorus\n4 | 1\n## Bridge 1\n@use Bridge 1\n",
    );
    const sections = videoSections(chart, 0) ?? [];
    const labels = sectionLabels(chart, sections);
    expect(labels).toEqual([
      { abbreviation: "B1", time: 1, of: 2 },
      { abbreviation: "C", time: 1, of: 1 },
      { abbreviation: "B1", time: 2, of: 2 },
    ]);
  });
});
