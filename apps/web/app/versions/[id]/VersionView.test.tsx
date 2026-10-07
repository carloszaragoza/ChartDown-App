import { parse } from "chartdown";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { setChoiceLabel, VersionView, type VersionViewProps } from "./VersionView";

vi.mock("./actions", () => ({ forkVersion: () => undefined, reportVersion: () => undefined }));
vi.mock("../../sets/actions", () => ({ addToSet: () => undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

const openRoad = parse(
  readFileSync(
    new URL("../../../../../packages/core/fixtures/open-road.chartdown", import.meta.url),
    "utf8",
  ),
);
const props: VersionViewProps = {
  id: "00000000-0000-0000-0000-0000000000f1",
  title: "Open Road",
  artists: ["ChartDown examples"],
  author: "Carlos",
  source: {
    type: "own_arrangement",
    album: null,
    year: 2026,
    youtube: "https://www.youtube.com/watch?v=x",
  },
  chart: openRoad,
  signedIn: false,
};
const render = (locale: "en" | "es", overrides: Partial<VersionViewProps> = {}) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <VersionView {...props} {...overrides} />
    </NextIntlClientProvider>,
  );

describe("R-01.4 a public version as everyone reads it", () => {
  it("R-01.4 shows the song, its author, its source and every section of the chart", () => {
    const html = render("en");
    expect(html).toContain("<h1");
    expect(html).toContain("Open Road");
    expect(html).toContain("Arrangement by Carlos");
    expect(html).toContain("Own arrangement · 2026");
    expect(html).toContain("Watch on YouTube");
    expect(html.match(/<section aria-label="[^"]*" id="section-\d+"/g)).toHaveLength(
      openRoad.sections.length,
    );
  });

  it("R-06.5 shows no band's layer, only the author's own notes", () => {
    const html = render("en");
    expect(html).toContain("Up a whole step. Full band.");
    expect(html).not.toContain("Move the pad up an octave");
  });

  it("R-01.4 offers a visitor to fork by signing in first, and comes back here", () => {
    expect(render("en")).toContain(
      'href="/auth/sign-in?next=%2Fversions%2F00000000-0000-0000-0000-0000000000f1"',
    );
    expect(render("es")).toContain("Hacer mi copia");
    expect(render("en", { signedIn: true })).not.toContain("/auth/sign-in");
  });
});

describe("R-02.8 the owner finds the history", () => {
  const history = 'href="/versions/00000000-0000-0000-0000-0000000000f1/history"';

  it("R-02.8 only the owner sees the History link", () => {
    expect(render("en", { signedIn: true, owner: true })).toContain(history);
    expect(render("es", { signedIn: true, owner: true })).toContain("Historial");
    expect(render("en", { signedIn: true })).not.toContain(history);
    expect(render("en")).not.toContain(history);
  });
});

describe("R-02.7 forking", () => {
  it("R-02.6 a signed-in person who is not the owner sees Fork, never History", () => {
    const other = render("en", { signedIn: true });
    expect(other).toMatch(/<button[^>]*type="submit"[^>]*>.*Fork/);
    expect(other).toContain("shared under CC0");
    const owner = render("en", { signedIn: true, owner: true });
    expect(owner).not.toMatch(/<button[^>]*>.*Fork/);
  });

  it("R-02.7 a fork shows the version it is based on", () => {
    const fork = render("en", {
      basedOn: { id: "00000000-0000-0000-0000-0000000000f2", author: "Ana" },
    });
    expect(fork).toContain('href="/versions/00000000-0000-0000-0000-0000000000f2"');
    expect(fork).toContain("Based on the version by Ana");
    expect(render("es", { basedOn: "unknown" })).toContain("Basada en otra versión");
    expect(render("en")).not.toContain("Based on");
  });
});

describe("R-02.4 making a version private", () => {
  const makePrivate = 'href="/versions/00000000-0000-0000-0000-0000000000f1/make-private"';

  it("R-02.4 only the owner of an active public version is offered Make private", () => {
    expect(render("en", { signedIn: true, owner: true })).toContain(makePrivate);
    expect(render("en", { signedIn: true })).not.toContain(makePrivate);
    expect(render("en", { signedIn: true, owner: true, status: "frozen" })).not.toContain(
      makePrivate,
    );
    expect(render("en", { signedIn: true, owner: true, visibility: "private" })).not.toContain(
      makePrivate,
    );
  });

  it("R-02.4 a frozen version says so, and can still be forked", () => {
    const frozen = render("en", { signedIn: true, status: "frozen" });
    expect(frozen).toContain("Frozen public version");
    expect(frozen).toMatch(/<button[^>]*type="submit"[^>]*>.*Fork/);
    expect(render("es", { status: "frozen" })).toContain("Versión pública congelada");
  });

  it("R-02.5 a private version says so and offers no fork", () => {
    const shared = render("en", { signedIn: true, visibility: "private" });
    expect(shared).toContain("Private");
    expect(shared).not.toMatch(/<button[^>]*>.*Fork/);
  });
});

describe("R-02.6 only the owner edits", () => {
  const edit = 'href="/versions/00000000-0000-0000-0000-0000000000f1/edit"';

  it("R-02.6 the owner of an active version sees Edit; nobody else does", () => {
    expect(render("en", { signedIn: true, owner: true })).toContain(edit);
    expect(render("en", { signedIn: true })).not.toContain(edit);
    expect(render("en")).not.toContain(edit);
    expect(render("en", { signedIn: true, owner: true, status: "frozen" })).not.toContain(edit);
  });
});

describe("R-03.2 the display bar", () => {
  it("R-03.2 the header shows the key being viewed and the written key", () => {
    const html = render("en", {
      display: { style: "letters", key: { root: "A", minor: false } },
      path: "/versions/00000000-0000-0000-0000-0000000000f1",
    });
    expect(html).toContain("Key A");
    expect(html).toContain("(written in G)");
    expect(html).toContain("Back to the written key, G");
    // Stand mode opens in the same view.
    expect(html).toMatch(/href="\/versions\/[^"]*\/stand\?[^"]*key=A/);
    expect(render("en")).not.toContain("written in");
  });
});

describe("R-03.5 the MD's notes", () => {
  const notes = 'href="/versions/00000000-0000-0000-0000-0000000000f1/notes"';

  it("R-03.5 a signed-in person opens their notes on a version; a visitor does not", () => {
    expect(render("en", { signedIn: true })).toContain(notes);
    expect(render("en", { signedIn: true, owner: true })).toContain(notes);
    expect(render("es", { signedIn: true })).toContain("Mis notas");
    expect(render("en")).not.toContain(notes);
  });
});

describe("R-05.2 adding a version to a set", () => {
  it("R-05.2 the MD chooses one of their sets; nobody else sees the choice", () => {
    const html = render("en", {
      signedIn: true,
      setChoices: [
        { id: "00000000-0000-0000-0000-00000000c501", band: "Harbor Band", name: "Sunday" },
        { id: "00000000-0000-0000-0000-00000000c502", band: null, name: "Practice" },
      ],
    });
    expect(html).toContain("Add to a set");
    expect(setChoiceLabel({ id: "c501", band: "Harbor Band", name: "Sunday" }, "My sets")).toBe(
      "Harbor Band · Sunday",
    );
    expect(setChoiceLabel({ id: "c502", band: null, name: "Practice" }, "My sets")).toBe(
      "My sets · Practice",
    );
    expect(render("en", { signedIn: true })).not.toContain("Add to a set");
  });
});
