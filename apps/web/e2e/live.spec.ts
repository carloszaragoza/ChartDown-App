import { expect, test, type Locator, type Page } from "@playwright/test";
import { createVersion } from "./admin";
import {
  addToSet,
  chooseInstrument,
  createSet,
  expectSignedIn,
  expectStandNow,
  expectStatus,
  PASSWORD,
  signIn,
  signOut,
  signUpAndConfirm,
  standNow,
  unique,
} from "./flows";

const FIRST = "## Verse\n1 | 4\n## Chorus\n4 | 5\n## Bridge\n6m | 4\n";
const SECOND = "---\ntempo: 60\n---\n## Intro\n1 | 5 | 1 | 5\n## Outro\n4 | 1\n";
const FOLLOW = { timeout: 10_000 };

// Which section a device shows as Now; the other device's window may sit behind, where its stack
// does not glide, so this reads the section, not where it scrolled to.
async function expectNow(page: Page, name: string) {
  await expect(standNow(page).getByRole("heading", { level: 2, name, exact: true })).toBeVisible(
    FOLLOW,
  );
}

// Two devices side by side: the one acting comes to the front first, since a window behind gets
// no animation frames and a click there never settles.
async function pressOn(page: Page, key: string) {
  await page.bringToFront();
  await page.keyboard.press(key);
}

test("R-12.1 R-12.2 R-12.3 R-12.4 R-12.5 R-12.6 R-12.8 R-12.10 R-12.13 R-14.2 the band follows the MD live, hands-free, looks ahead and comes back", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const band = `Lantern Live ${stamp}`;
  const set = `Sunday ${stamp}`;
  const ana = unique("livemd");
  const luis = unique("livebass");
  const first = await createVersion(request, { title: `Open Field ${stamp}`, content: FIRST });
  const second = await createVersion(request, { title: `Low Tide ${stamp}`, content: SECOND });

  // Ana's band with Luis on bass in Sunday's lineup.
  await signUpAndConfirm(page, ana, "Ana Live");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(luis);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, luis, "Luis Live");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await page.goto("/");
  await signOut(page);
  await signIn(page, ana, PASSWORD);
  await expectSignedIn(page, "Ana Live");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Service" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  for (const id of [first, second]) {
    await page.goto(`/versions/${id}`);
    await addToSet(page, `${band} · ${set}`);
  }
  await page.goto(`${setAddress}/edit`);
  await chooseInstrument(page, "Luis Live", "Bass");
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expectStatus(page, "The lineup was saved.");

  // R-12.1 Ana goes live from stand mode's top bar (T-3032): it asks first, saying who gets the
  // notice, and Cancel starts nothing.
  await page.goto(`${setAddress}/songs/1/stand`);
  await page.getByRole("button", { name: "Go live" }).click();
  const ask = page.getByRole("alertdialog", { name: "Start live mode?" });
  await expect(ask).toContainText("The musician in this set's lineup gets a notice");
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("You lead", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Go live" }).click();
  await page
    .getByRole("alertdialog", { name: "Start live mode?" })
    .getByRole("button", { name: "Go live" })
    .click();
  await expect(page.getByText("You lead", { exact: false })).toBeVisible(FOLLOW);

  // R-12.2 Luis sees Live now on Home and joins with one tap, on Ana's song.
  const luisDevice = await browser.newContext();
  const luisPage = await luisDevice.newPage();
  await signIn(luisPage, luis, PASSWORD);
  await expectSignedIn(luisPage, "Luis Live");
  await luisPage.goto("/");
  await expect(luisPage.getByText(`Live now: ${set}`)).toBeVisible(FOLLOW);
  await luisPage.getByRole("link", { name: "Join", exact: true }).click();
  await expect(luisPage).toHaveURL(new RegExp(`${setAddress}/songs/1/stand`));
  await expect(luisPage.getByText("Following Ana Live")).toBeVisible(FOLLOW);
  await expectNow(luisPage, "Verse");
  // The leader sees who joined.
  await expect(page.getByText("You lead 1 musician")).toBeVisible(FOLLOW);

  // R-14.1 R-14.12 Luis measures Ana's clock on the session's channel: his line says In sync,
  // and Ana's Live options say it of him.
  await expect(luisPage.getByText("In sync", { exact: true })).toBeVisible(FOLLOW);
  await page.bringToFront();
  await page.getByRole("button", { name: "Live options" }).click();
  await expect(
    page.getByRole("dialog").getByRole("listitem").filter({ hasText: "Luis Live" }),
  ).toContainText("In sync", FOLLOW);
  await page.keyboard.press("Escape");

  // R-12.3 Ana moves; Luis's stand mode moves with her.
  await pressOn(page, "ArrowRight");
  await expectStandNow(page, "Chorus");
  await expectNow(luisPage, "Chorus");

  // R-12.4 Ana marks the Bridge next; Luis sees it before she moves.
  await page.bringToFront();
  await page.getByRole("button", { name: "Live options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bridge" }).click();
  await page.keyboard.press("Escape");
  await expect(luisPage.getByText("Next: Bridge")).toBeVisible(FOLLOW);

  // R-12.5 Luis looks ahead; Ana's moves wait for him until Back to live.
  await pressOn(luisPage, "ArrowRight");
  await expectNow(luisPage, "Bridge");
  const back = luisPage.getByRole("button", { name: "Back to live" });
  await expect(back).toBeVisible();
  await pressOn(page, "ArrowLeft");
  await expectStandNow(page, "Verse");
  await luisPage.waitForTimeout(1500);
  await expectNow(luisPage, "Bridge");
  await luisPage.bringToFront();
  await back.click();
  await expectNow(luisPage, "Verse");

  // R-12.6 Ana goes on to the next song; Luis goes with her.
  await pressOn(page, "ArrowRight");
  await pressOn(page, "ArrowRight");
  await expectStandNow(page, "Bridge");
  await pressOn(page, "ArrowRight");
  await expect(page).toHaveURL(new RegExp(`${setAddress}/songs/2/stand`));
  await expect(luisPage).toHaveURL(new RegExp(`${setAddress}/songs/2/stand`), FOLLOW);
  await expectNow(luisPage, "Intro");

  // R-14.2 R-14.3 T-3038 Ana taps Play: the band starts together a moment ahead, on Ana's bar
  // and beat, and stays together; Luis never touches his metronome.
  await page.bringToFront();
  await page.getByRole("button", { name: "Play" }).first().click();
  await expect(luisPage.getByRole("button", { name: "Stop" }).first()).toBeVisible(FOLLOW);
  const beatOf = (device: Page) =>
    device.locator(".cd-metronome-count").first().textContent({ timeout: 2000 });
  let together = 0;
  for (let sample = 0; sample < 6; sample++) {
    await page.waitForTimeout(450);
    const [ana, luis] = await Promise.all([beatOf(page), beatOf(luisPage)]);
    if (ana && ana === luis && /^\d \/ 4$/.test(ana)) together++;
  }
  // A beat lasts a second here: sampled together, they read the same beat (a sample may fall on
  // a beat's edge).
  expect(together).toBeGreaterThanOrEqual(5);
  // R-14.4 Ana taps Stop: the band stops on the same beat.
  await page.getByRole("button", { name: "Stop" }).first().click();
  await expect(page.getByRole("button", { name: "Play" }).first()).toBeVisible(FOLLOW);
  await expect(luisPage.getByRole("button", { name: "Play" }).first()).toBeVisible(FOLLOW);

  // R-12.13 Luis leaves live mode: his device is his again, and he can join again.
  await luisPage.getByRole("button", { name: "Leave live" }).click();
  await expect(luisPage.getByRole("button", { name: "Join" })).toBeVisible(FOLLOW);
  await luisPage.getByRole("button", { name: "Join" }).click();
  await expect(luisPage.getByText("Following Ana Live")).toBeVisible(FOLLOW);
  // Ana leaves the set's pages, as when she closes the window: Luis is told, Leave live first.
  const standAddress = page.url();
  await page.goto("/");
  await expect(luisPage.getByText("Ana Live isn't connected")).toBeVisible(FOLLOW);
  await expect(luisPage.getByRole("button", { name: "Leave live" })).toBeVisible();
  // She comes back and still leads.
  await page.goto(standAddress);
  await expect(page.getByText("You lead", { exact: false })).toBeVisible(FOLLOW);
  await expect(luisPage.getByText("Following Ana Live")).toBeVisible(FOLLOW);

  // R-12.10 Ana ends live mode; Luis stays where he was and is told.
  await page.bringToFront();
  await page.getByRole("button", { name: "Live options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "End live mode" }).click();
  await expect(luisPage.getByText("Live mode ended. You stay where you were.")).toBeVisible(FOLLOW);
  await expectNow(luisPage, "Intro");
  await luisDevice.close();
});

// The MD's own button: Join on a touch screen, calling the musician in, and the leader's Live
// button. Its fill is the MD's Rosewood (the theme's red).
async function expectDirector(join: Locator) {
  await expect(join).toHaveAttribute("data-variant", "director");
  const [fill, rosewood] = await join.evaluate((button) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--color-icon-red)";
    document.body.append(probe);
    const colors = [
      getComputedStyle(button).backgroundColor,
      getComputedStyle(probe).backgroundColor,
    ];
    probe.remove();
    return colors;
  });
  // The color is compared, not its alpha: stand mode's bar draws its controls a touch translucent.
  const rgb = (color: string) => color.match(/\d+/g)?.slice(0, 3).join(",");
  expect(rgb(fill ?? "")).toBe(rgb(rosewood ?? ""));
  expect(fill).not.toBe("rgba(0, 0, 0, 0)");
}

test("R-12.1 R-12.2 T-3046 the MD's Live button is Rosewood; on an iPad and a phone, so is Join until the musician joins", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const band = `Rosewood Call ${stamp}`;
  const set = `Evening ${stamp}`;
  const ana = unique("callmd");
  const mia = unique("callkeys");
  const song = await createVersion(request, { title: `North Light ${stamp}`, content: FIRST });

  // Ana's band, with Mia on keys in the set's lineup.
  await signUpAndConfirm(page, ana, "Ana Call");
  await page.goto("/bands");
  await page.getByLabel("Band name").fill(band);
  await page.getByRole("button", { name: "Create band" }).click();
  await page.getByLabel("Their email").fill(mia);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expectStatus(page, "Invitation sent.");
  await page.goto("/");
  await signOut(page);
  await signUpAndConfirm(page, mia, "Mia Call");
  await page
    .getByRole("region", { name: "Invitations" })
    .getByRole("button", { name: `Accept the invitation to ${band}` })
    .click();
  await expectStatus(page, "Welcome to the band.");
  await page.goto("/");
  await signOut(page);
  await signIn(page, ana, PASSWORD);
  await expectSignedIn(page, "Ana Call");
  await page.goto("/bands");
  await page.getByRole("link", { name: band, exact: true }).click();
  await page.getByRole("main").getByRole("link", { name: "Sets", exact: true }).click();
  await createSet(page, { name: set, type: "Service" });
  await expect(page.getByRole("heading", { level: 1, name: set })).toBeVisible();
  const setAddress = new URL(page.url()).pathname;
  await page.goto(`/versions/${song}`);
  await addToSet(page, `${band} · ${set}`);
  await page.goto(`${setAddress}/edit`);
  await chooseInstrument(page, "Mia Call", "Keys");
  await page.getByRole("button", { name: "Save lineup" }).click();
  await expectStatus(page, "The lineup was saved.");

  // Ana goes live.
  await page.goto(`${setAddress}/songs/1/stand`);
  await page.getByRole("button", { name: "Go live" }).click();
  await page
    .getByRole("alertdialog", { name: "Start live mode?" })
    .getByRole("button", { name: "Go live" })
    .click();
  await expect(page.getByText("You lead", { exact: false })).toBeVisible(FOLLOW);
  // While it runs, Ana's Live button is filled in Rosewood, with its word.
  await expectDirector(page.getByRole("button", { name: "Live options" }));

  // On Mia's iPad: Home, Notices and the set call her in.
  const ipad = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const tablet = await ipad.newPage();
  await signIn(tablet, mia, PASSWORD);
  await expectSignedIn(tablet, "Mia Call");
  const joinLink = tablet.getByRole("main").getByRole("link", { name: "Join", exact: true });
  for (const address of ["/", "/notices", setAddress]) {
    await tablet.goto(address);
    await expect(tablet.getByText(`Live now: ${set}`)).toBeVisible(FOLLOW);
    await expectDirector(joinLink);
  }
  await testInfo.attach("join-ipad-set", {
    body: await tablet.screenshot(),
    contentType: "image/png",
  });

  // Stand mode's live line, before she joins; once she joins, the line is as before.
  await tablet.goto(`${setAddress}/songs/1/stand`);
  const join = tablet.getByRole("button", { name: "Join", exact: true });
  await expectDirector(join);
  await testInfo.attach("join-ipad-stand", {
    body: await tablet.screenshot(),
    contentType: "image/png",
  });
  await join.click();
  await expect(tablet.getByText("Following Ana Call")).toBeVisible(FOLLOW);
  await expect(join).toHaveCount(0);
  await ipad.close();

  // On a phone, Home calls her in the same way.
  const phone = await browser.newContext({
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
  });
  const handset = await phone.newPage();
  await signIn(handset, mia, PASSWORD);
  await handset.goto("/");
  await expect(handset.getByText(`Live now: ${set}`)).toBeVisible(FOLLOW);
  await expectDirector(handset.getByRole("main").getByRole("link", { name: "Join", exact: true }));
  await testInfo.attach("join-phone-home", {
    body: await handset.screenshot(),
    contentType: "image/png",
  });
  await phone.close();
});
