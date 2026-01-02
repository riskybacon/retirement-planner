import { chromium } from "playwright";

const url = process.env.DEMO_URL || "http://localhost:5173";

const inputs = [
  "2060",
  "35",
  "500000",
  "60",
  "7.0",
  "7.0",
  "10.0",
  "100",
  "0.9",
  "0.5",
  "3.5",
  "1",
  "2060",
  "1000",
];

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1050 },
    recordVideo: {
      dir: "/tmp/retirement-planner",
      size: { width: 1400, height: 1050 },
    },
  });
  await page.goto(url, { waitUntil: "networkidle" });

  for (const value of inputs) {
    await page.click('input[name="command"]');
    await page.keyboard.type(value, { delay: randomDelay(30, 100) });
    await page.waitForTimeout(randomDelay(120, 320));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(randomDelay(200, 520));
    await maybeThinkPause();
  }

  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const log = document.querySelector(".terminal-log");
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  });
  await page.click('input[name="command"]');
  await page.keyboard.type("Halp! I'm broke", {
    delay: randomDelay(30, 100),
  });
  await page.keyboard.press("Enter");
  await waitForResponse(page);
  await page.keyboard.type("/set smoothdown 100", {
    delay: randomDelay(30, 100),
  });
  await page.keyboard.press("Enter");

  await page.waitForTimeout(5500);
  await browser.close();

  if (page.video()) {
    const videoPath = await page.video().path();
    console.log(videoPath);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function maybeThinkPause() {
  if (Math.random() < 0.25) {
    await new Promise((resolve) => setTimeout(resolve, randomDelay(600, 1200)));
  }
}

async function waitForResponse(page) {
  const responseCount = await page.evaluate(
    () => document.querySelectorAll(".terminal-log .response").length
  );
  await page.waitForFunction(
    (count) => document.querySelectorAll(".terminal-log .response").length > count,
    responseCount
  );
}
