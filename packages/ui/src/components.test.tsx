import { STANDARD_INSTRUMENTS } from "@chartdown/core";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { ACTION_ICONS, ICONS, INSTRUMENT_ICONS, type IconName } from "./icons";
import { InstrumentTag } from "./InstrumentTag";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("./components.css");
const tokens = read("./tokens.css");
const render = (node: React.ReactElement) => renderToStaticMarkup(node);

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No rule for ${selector}`);
  return source.slice(start, source.indexOf("}", start));
}

describe("Handoff 3 Icon", () => {
  const preview = read("../fixtures/design-system-icon-preview.html");
  const drawn = Object.fromEntries(
    Array.from(
      preview.matchAll(
        /<div class="item(?: inst)?"><svg viewBox="0 0 24 24" aria-hidden="true">(.*?)<\/svg>([\w-]+)<\/div>/g,
      ),
      ([, body, name]) => [name, body],
    ),
  );

  it("draws every icon exactly as the design system does", () => {
    expect(Object.keys(ICONS).sort()).toEqual(Object.keys(drawn).sort());
    for (const name of Object.keys(ICONS) as IconName[]) {
      const inner = /<svg[^>]*>(.*)<\/svg>/.exec(render(<Icon name={name} />))?.[1];
      const asDrawn = inner?.replaceAll("cd-icon-knob", "knob").replaceAll("cd-icon-dot", "dotf");
      expect(asDrawn, name).toBe(drawn[name]);
    }
  });

  it("has the design system's actions and the nine standard instruments", () => {
    expect(Object.keys(ACTION_ICONS)).toEqual([
      "previous",
      "next",
      "view-as",
      "download",
      "atril",
      "edit",
      "share",
      "settings",
      "setlist",
      "add",
    ]);
    expect(Object.keys(INSTRUMENT_ICONS)).toEqual(
      STANDARD_INSTRUMENTS.map((instrument) => instrument.id),
    );
  });

  it("accessible labels: a decorative icon is hidden, a standalone icon is labelled", () => {
    const decorative = render(<Icon name="download" size={20} />);
    expect(decorative).toMatch(/^<svg[^>]*\saria-hidden="true"/);
    expect(decorative).toMatch(/^<svg[^>]*\swidth="20"/);
    const alone = render(<Icon name="atril" label="Full screen" />);
    expect(alone).toContain('role="img"');
    expect(alone).toContain('aria-label="Full screen"');
    expect(alone).not.toContain("aria-hidden");
  });

  it("icons draw in the current text color, never in md or dynamic", () => {
    expect(rule(css, ".cd-icon")).toContain("stroke: currentColor");
    expect(rule(css, ".cd-icon")).toContain("stroke-width: 1.75");
    for (const selector of [".cd-icon", ".cd-icon .cd-icon-dot", ".cd-icon .cd-icon-knob"]) {
      expect(rule(css, selector)).not.toMatch(/--md|--dynamic/);
    }
  });
});

describe("Handoff 3 Button", () => {
  it("44 px buttons: every button is at least the minimum target in both directions", () => {
    expect(rule(css, ".cd-button")).toContain("min-height: var(--target-min)");
    expect(rule(css, ".cd-button")).toContain("min-width: var(--target-min)");
    expect(tokens).toContain("--target-min: 44px");
  });

  it("visible focus: the 2 px focus ring applies and nothing removes it", () => {
    expect(rule(tokens, ":focus-visible")).toContain("outline: 2px solid var(--focus)");
    expect(rule(tokens, ":focus-visible")).toContain("outline-offset: 2px");
    expect(css).not.toMatch(/outline\s*:\s*(none|0)\b/);
  });

  it("renders the three variants with label text", () => {
    expect(render(<Button variant="primary">Next</Button>)).toContain(
      'class="cd-button cd-button--primary"',
    );
    expect(render(<Button>Previous</Button>)).toContain('class="cd-button cd-button--secondary"');
    expect(
      render(
        <Button variant="view-as" icon="view-as">
          Keys
        </Button>,
      ),
    ).toContain("cd-button--view-as");
    expect(rule(css, ".cd-button")).toContain("font: var(--type-label)");
    expect(rule(css, ".cd-button--primary")).toMatch(
      /background: var\(--ink\)[\s\S]*color: var\(--ink-inverse\)/,
    );
    expect(rule(css, ".cd-button--secondary")).toContain("border-color: var(--control-border)");
    expect(rule(css, ".cd-button--view-as")).toContain(
      "border: var(--stroke-emphasis) solid var(--md)",
    );
  });

  it("uses the red pencil only for MD and instruments", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const rulesWithMd = Array.from(
      withoutComments.matchAll(/([^{}]+)\{[^}]*var\(--md\)[^}]*\}/g),
      ([, selector]) => selector?.trim(),
    );
    expect(rulesWithMd).toEqual([
      ".cd-button--view-as",
      ".cd-tag",
      ".cd-bar__cue-instrument",
      ".cd-note__md",
      ".cd-form__dot",
    ]);
  });

  it("puts the next arrow after the text and other icons before it", () => {
    expect(render(<Button icon="next">Next</Button>)).toMatch(/>Next<svg/);
    expect(render(<Button icon="previous">Previous</Button>)).toMatch(/<\/svg>Previous</);
    expect(render(<Button icon="download">Download set</Button>)).toMatch(/<\/svg>Download set</);
    expect(
      render(
        <Button icon="add" iconPosition="end">
          Add
        </Button>,
      ),
    ).toMatch(/>Add<svg/);
  });

  it("accessible labels: an icon-only button needs an aria-label", () => {
    expect(render(<Button icon="settings" aria-label="Settings" />)).toMatch(
      /aria-label="Settings"[^>]*class="cd-button cd-button--secondary cd-button--icon-only"/,
    );
    // @ts-expect-error an icon-only button without aria-label does not type-check
    void (<Button icon="settings" />);
  });

  it("a disabled button says why, and is described by the reason", () => {
    const html = render(
      <Button disabledReason="Connect to the internet to download">Download set</Button>,
    );
    const id = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(html).toContain("disabled");
    expect(html).toContain(
      `<span id="${id}" class="cd-button__reason">Connect to the internet to download</span>`,
    );
  });

  it("is a plain button by default, so it never submits a form by accident", () => {
    expect(render(<Button>Next</Button>)).toContain('type="button"');
    expect(render(<Button type="submit">Save</Button>)).toContain('type="submit"');
  });
});

describe("Handoff 3 InstrumentTag", () => {
  it("shows the icon and the name in the red pencil", () => {
    const html = render(<InstrumentTag instrument="bass" label="Bass" />);
    expect(html).toMatch(/^<span class="cd-tag"><svg[^>]*\saria-hidden="true"/);
    expect(html).toMatch(/^<span class="cd-tag"><svg[^>]*\swidth="16"/);
    expect(html).toMatch(/<\/svg>Bass<\/span>$/);
    expect(rule(css, ".cd-tag")).toContain("font: var(--type-tag)");
    expect(rule(css, ".cd-tag")).toContain("border: var(--stroke-emphasis) solid var(--md)");
  });

  it("accessible labels: the compact tag is a 44 px square named by its aria-label and tooltip", () => {
    const html = render(<InstrumentTag instrument="keys" label="Teclados" variant="compact" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Teclados"');
    expect(html).toContain('title="Teclados"');
    expect(html).toMatch(/width="22"/);
    expect(rule(css, ".cd-tag--compact")).toContain("min-width: var(--target-min)");
    expect(rule(css, ".cd-tag--compact")).toContain("min-height: var(--target-min)");
  });

  it("shows the name only for an instrument without an icon yet", () => {
    expect(render(<InstrumentTag instrument="cajon" label="Cajón" />)).toBe(
      '<span class="cd-tag">Cajón</span>',
    );
    const compact = render(<InstrumentTag instrument="cajon" label="Cajón" variant="compact" />);
    expect(compact).toBe('<span class="cd-tag cd-tag--compact cd-tag--name-only">Cajón</span>');
  });

  it("has an icon for every standard instrument of the parser", () => {
    for (const { id } of STANDARD_INSTRUMENTS)
      expect(render(<InstrumentTag instrument={id} label={id} />), id).toContain("<svg");
  });
});
