import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, audioProblem, audioType, peaksFrom } from "./file";

describe("T-2602 the band's recording", () => {
  it("R-06.7 MP3 and M4A are taken, by type or by name", () => {
    expect(audioType({ name: "take.mp3", type: "audio/mpeg" })).toBe("audio/mpeg");
    expect(audioType({ name: "take.m4a", type: "audio/x-m4a" })).toBe("audio/mp4");
    expect(audioType({ name: "take.M4A", type: "" })).toBe("audio/mp4");
    expect(audioType({ name: "take.wav", type: "audio/wav" })).toBeNull();
    expect(audioType({ name: "take.mp4", type: "video/mp4" })).toBeNull();
  });

  it("R-06.7 a file over 15 MB, or of another type, is refused before uploading", () => {
    const mp3 = { name: "take.mp3", type: "audio/mpeg" };
    expect(audioProblem({ ...mp3, size: MAX_AUDIO_BYTES })).toBeNull();
    expect(audioProblem({ ...mp3, size: MAX_AUDIO_BYTES + 1 })).toBe("size");
    expect(audioProblem({ name: "take.flac", type: "audio/flac", size: 10 })).toBe("type");
  });

  it("R-06.7 the waveform is each stretch's loudest sample, over both channels", () => {
    const left = new Float32Array([0, 0.5, -0.25, 0, 1, -0.1]);
    const right = new Float32Array([0.1, 0, 0, -0.75, 0, 0]);
    expect(peaksFrom([left, right], 3)).toEqual([500, 750, 1000]);
    expect(peaksFrom([new Float32Array(0)])).toEqual([]);
    expect(peaksFrom([left], 100)).toHaveLength(6);
  });
});
