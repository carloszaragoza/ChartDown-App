import { expect, test, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import { signOut, signUpAndConfirm, unique } from "./flows";

// Original example songs only; no lyrics (CLAUDE.md).
async function startNewSong(page: Page, title: string) {
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No songs match")).toBeVisible();
  await page.getByRole("link", { name: "Create a new song" }).click();
}

test("R-02.2 a version can't be published without a source, and the page says so", async ({
  page,
}) => {
  const title = `Lantern Bay ${Date.now()}`;
  await signUpAndConfirm(page, unique("nosource"), "Ana Source");
  await startNewSong(page, title);
  await expect(page.getByLabel("Song title")).toHaveValue(title);
  await expect(page.getByLabel("Arrangement by")).toHaveValue("Ana Source");
  // The title follows what is typed (Design Handoff 2.0 screen 05).
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Publish waits for the source and says what is missing.
  const publish = page.getByRole("button", { name: "Publish version" });
  await expect(publish).toBeDisabled();
  await publish.hover();
  await expect(page.getByRole("tooltip")).toContainText("Choose a source");
  await expect(page).toHaveURL(/song=new/);

  await page.getByLabel("Live").check();
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("R-02.3 a new version is public: a visitor reads it", async ({ page }) => {
  const title = `Harbor Lights ${Date.now()}`;
  await signUpAndConfirm(page, unique("publisher"), "Ben Public");
  await startNewSong(page, title);
  await page.getByLabel("Artists").fill("ChartDown examples");
  await page.getByLabel("Studio recording").check();
  await page.getByLabel("Year").fill("2026");
  await expect(page.getByText("shared under CC0")).toBeVisible();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = page.url();

  await page.goto("/");
  await signOut(page);
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Arrangement by Ben Public")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chorus" })).toBeVisible();
});

test("R-02.1 a version of a song already in the catalog", async ({ page, request }) => {
  const title = `Quiet Mile ${Date.now()}`;
  await createVersion(request, { title, content: "## Verse\n1 | 4" });
  await signUpAndConfirm(page, unique("second"), "Cleo Second");
  await page.getByRole("main").getByRole("link", { name: "New version" }).click();
  await page.getByLabel("Find the song by title").fill(title);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Use ${title}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByLabel("Song title")).toHaveCount(0);
  // The artists under the title, and Choose another song beside Cancel, in the header.
  await expect(page.getByText("ChartDown examples", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose another song" })).toBeVisible();
  // It starts from the song's chart, not from the example (T-2405).
  await expect(page.getByLabel("Chart (ChartDown)")).toHaveValue(/## Verse\n1 \| 4/);
  await page.getByLabel("Acoustic").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Arrangement by Cleo Second")).toBeVisible();
});

test("R-01.4 creating a version asks a visitor to sign in", async ({ page }) => {
  await page.goto("/versions/new");
  await expect(page).toHaveURL(
    /\/auth\/sign-in\?next=%2Fversions%2Fnew|\/auth\/sign-in\?next=\/versions\/new/,
  );
});

test("R-02.1 a new version from a version's page starts from that version's chart", async ({
  page,
  request,
}) => {
  const title = `Cedar Steps ${Date.now()}`;
  const first = await createVersion(request, { title, content: "## Verse\n1 | 5\n" });
  await signUpAndConfirm(page, unique("from"), "Fern From");
  await page.goto(`/versions/${first}`);
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "New version of this song" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByLabel("Chart (ChartDown)")).toHaveValue(/## Verse\n1 \| 5/);
  // Cancel goes back to the version it came from.
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/versions/${first}$`));
});

test("R-03.11 T-2828 T-2832 a YouTube link opens the video in a player across the bottom, and Close closes it", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("video"), "Vera Video");
  await page.goto("/versions/new?song=new&q=Tide%20Lamp");
  await page.getByLabel("YouTube link").fill("https://www.youtube.com/watch?v=hBL9EBKB5DI");
  await page.getByRole("button", { name: "Play the video" }).click();
  const dock = page.getByRole("complementary", { name: "Video" });
  await expect(dock).toBeVisible();
  await expect(dock.getByRole("link", { name: "Open on YouTube" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=hBL9EBKB5DI",
  );
  // The chart's sections as a bar over the video; choosing one goes there (T-2502).
  const bar = dock.getByRole("group", { name: "Sections" });
  // Named as in the song form (T-2505), large, under each section's full name (T-2828).
  await expect(bar.locator(".cd-player-cells__short")).toHaveText(["V", "C"]);
  await expect(bar.locator(".cd-player-cells__name")).toHaveText(["Verse", "Chorus"]);
  // T-2832 every song-form name fits whole inside its cell.
  const fits = await bar.locator(".cd-player-cells__cell").evaluateAll((cells) =>
    cells.map((cell) => {
      const name = cell.querySelector(".cd-player-cells__short")?.getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      return !!name && name.width > 0 && name.left >= box.left && name.right <= box.right;
    }),
  );
  expect(fits).toEqual([true, true]);
  // R-03.11 T-2828 the player is a bar across the bottom, from the side navigation to the edge.
  const edges = await dock.evaluate((player) => {
    const box = player.getBoundingClientRect();
    const nav = document.querySelector(".astryx-side-nav")?.closest(".astryx-layout-panel");
    return {
      start: Math.round(box.left),
      end: Math.round(box.right),
      bottom: Math.round(box.bottom),
      nav: Math.round(nav?.getBoundingClientRect().right ?? 0),
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  expect(edges.start).toBe(edges.nav);
  expect(edges.end).toBe(edges.width);
  expect(edges.bottom).toBe(edges.height);
  await bar.getByRole("button", { name: "Go to Chorus" }).click();
  await expect(bar.getByRole("button", { name: "Go to Chorus" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(dock.getByText("Chorus", { exact: true })).toBeVisible();
  // T-2831 where the music starts and ends, opened from the top row; each step says its size.
  const points = dock.getByRole("button", { name: /^Start and end/ });
  await expect(points).toHaveAccessibleName("Start and end · from 0:00");
  await points.click();
  const start = dock.getByRole("group", { name: "Start", exact: true });
  // Five steps of 0.2 s: a second.
  for (let step = 0; step < 5; step++) await start.getByRole("button", { name: "+0.2 s" }).click();
  await expect(points).toHaveAccessibleName("Start and end · from 0:01");
  // T-2821 the video's volume is set from the dock, not only from YouTube's own slider; since
  // T-2828 a vertical slider always in view.
  const volume = dock.getByRole("slider", { name: "Video volume" });
  await expect(volume).toHaveAttribute("aria-orientation", "vertical");
  await volume.focus();
  await page.keyboard.press("ArrowDown");
  await expect(volume).toHaveAttribute("aria-valuenow", /^(95|[0-9]{1,2})$/);
  await dock.getByRole("button", { name: "Close the video" }).click();
  await expect(dock).toHaveCount(0);
});

test("R-03.11 T-2830 T-2831 the owner saves where the music starts and ends, and they are there for the next reader", async ({
  page,
}) => {
  await signUpAndConfirm(page, unique("start"), "Stella Start");
  await page.goto("/versions/new?song=new&q=Brass%20Lantern");
  await page.getByLabel("YouTube link").fill("https://www.youtube.com/watch?v=hBL9EBKB5DI");
  await page.getByLabel("Live").check();
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page).toHaveURL(/\/versions\/[0-9a-f-]{36}$/);
  const address = new URL(page.url()).pathname;

  await page.getByRole("button", { name: "Watch the video" }).click();
  const dock = page.getByRole("complementary", { name: "Video" });
  const points = dock.getByRole("button", { name: /^Start and end/ });
  await points.click();
  const start = dock.getByRole("group", { name: "Start", exact: true });
  // Five steps of 0.2 s: a second.
  for (let step = 0; step < 5; step++) await start.getByRole("button", { name: "+0.2 s" }).click();
  // T-2830 and where it ends: here, at the chorus.
  const end = dock.getByRole("group", { name: "End", exact: true });
  await expect(end).toContainText("Plays to the end");
  await dock
    .getByRole("group", { name: "Sections" })
    .getByRole("button", { name: "Go to Chorus" })
    .click();
  await end.getByRole("button", { name: /^End at / }).click();
  await expect(points).toHaveAccessibleName(/^Start and end · 0:01 – \d+:\d\d$/);
  await dock.getByRole("button", { name: "Save for everyone" }).click();
  await expect(dock.getByRole("button", { name: "Save for everyone" })).toHaveCount(0);

  // A visitor opens the video: the bar starts where the owner said.
  await signOut(page);
  await page.goto(address);
  await page.getByRole("button", { name: "Watch the video" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Video" })
      .getByRole("button", { name: /^Start and end/ }),
  ).toHaveAccessibleName(/^Start and end · 0:01 – \d+:\d\d$/);
  await expect(page.getByRole("button", { name: "Save for everyone" })).toHaveCount(0);
});

test("R-03.11 the open video never hides the chart: its last bar scrolls above the player", async ({
  page,
  request,
}) => {
  const sections = ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Tag"];
  const content = `---\ntempo: 72\n---\n${sections
    .map((name) => `## ${name}\n1 | 4 | 5 | 6m\n4 | 5 | 1 | 1`)
    .join("\n")}\n`;
  const id = await createVersion(request, {
    title: `Dock Room ${Date.now()}`,
    content,
    youtube: "https://www.youtube.com/watch?v=hBL9EBKB5DI",
  });
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto(`/versions/${id}`);
  await page.getByRole("button", { name: "Watch the video" }).click();
  const dock = page.getByRole("complementary", { name: "Video" });
  await expect(dock).toBeVisible();
  const last = page.locator("section[id^='section-']").last().locator(".cd-chart__bar").last();
  await last.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 10_000);
  await expect(async () => {
    const bar = await last.boundingBox();
    const player = await dock.boundingBox();
    expect(bar && player && bar.y + bar.height <= player.y).toBe(true);
  }).toPass();
});
