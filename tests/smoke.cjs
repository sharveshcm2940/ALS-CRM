require("node:fs").mkdirSync("test-results", { recursive: true });
const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(require("node:fs").existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium" }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 650) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.screenshot({ path: "test-results/hero.png" });
  if ((await page.locator(".property-card").count()) !== 5)
    throw Error("Expected 5 properties");
  await page.locator(".search-strip select").nth(0).selectOption("Mumbai");
  await page.getByRole("button", { name: "Find your address" }).click();
  if ((await page.locator(".property-card").count()) !== 2)
    throw Error("Mumbai filter");
  await page.locator(".search-strip select").nth(1).selectOption("Villa");
  await page.locator(".search-strip select").nth(2).selectOption("2");
  await page.getByRole("button", { name: "Find your address" }).click();
  await page.getByRole("button", { name: "Reset search" }).click();
  if ((await page.locator(".property-card").count()) !== 5)
    throw Error("Reset");
  await page
    .getByRole("button", { name: "Fitness studio", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Fitness studio", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Open photograph 1" }).click();
  await page.keyboard.press("ArrowRight");
  if ((await page.locator(".lightbox-controls span").textContent()) !== "2 / 6")
    throw Error("Gallery keyboard");
  await page.keyboard.press("Escape");
  await page.getByLabel("Your name", { exact: true }).fill("Test Visitor");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("visitor@example.com");
  await page.getByLabel("I understand this").check();
  await page.getByRole("button", { name: "Submit enquiry" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "does not send or store" })
    .waitFor();
  for (const slug of [
    "windsor-gardens",
    "park-west",
    "courtyard-residences",
    "azure-heights",
    "grand-address",
  ]) {
    const response = await page.goto(
      "http://localhost:3000/properties/" + slug,
      { waitUntil: "networkidle" },
    );
    if (response.status() !== 200) throw Error(slug);
    await page.getByRole("tab").nth(1).click();
    if (
      (await page.getByRole("tab").nth(1).getAttribute("aria-selected")) !==
      "true"
    )
      throw Error("Plan selection");
  }
  const invalid = await page.request.post(
    "http://localhost:3000/api/enquiries",
    { data: { name: "x", email: "bad", message: "" } },
  );
  if (invalid.status() !== 400) throw Error("Invalid enquiry");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.screenshot({ path: "test-results/mobile-hero.png" });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Amenities" })
    .click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .waitFor({ state: "hidden" });
  const mobileDetail = await page.goto(
    "http://localhost:3000/properties/windsor-gardens",
    { waitUntil: "networkidle" },
  );
  if (
    mobileDetail.status() !== 200 ||
    (await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ))
  )
    throw Error("Mobile property layout");
  const animated = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  animated.on("pageerror", (e) => errors.push(e.message));
  await animated.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await animated.waitForTimeout(1800);
  await animated.locator("#about").scrollIntoViewIfNeeded();
  await animated.waitForTimeout(1200);
  if (
    Number(
      await animated
        .locator("#about [data-reveal]")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    ) < 0.95
  )
    throw Error("Scroll reveal did not complete");
  await animated.close();
  const images = await page
    .locator("img")
    .evaluateAll((imgs) =>
      imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
    );
  if (images.length) throw Error("Broken images " + images);
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: search, empty/reset, galleries/keyboard, amenities, enquiry validation, all 5 detail pages, floor-plan tabs, mobile menu, no overflow or browser errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
