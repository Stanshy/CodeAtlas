/**
 * Sprint 20 G1 — Screenshot capture script
 * Uses Playwright from AgentHub to capture all 9 scenes
 */
const { chromium } = require('C:/projects/AgentHub/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const HTML_FILE = path.resolve('C:/projects/CodeAtlas/proposal/references/sprint20/launch-experience-mockup.html');
const OUT_DIR   = 'C:/projects/CodeAtlas/proposal/references/sprint20/screenshots';

// scene-id → output filename
const SCENES = [
  { id: '01-welcome-empty',    file: '01-welcome-empty.png' },
  { id: '02-welcome-recent',   file: '02-welcome-recent.png' },
  { id: '03-welcome-ai-setup', file: '03-welcome-ai-setup.png' },
  { id: '04-welcome-error',    file: '04-welcome-error.png' },
  { id: '05-progress-scanning',file: '05-progress-scanning.png' },
  { id: '06-progress-parsing', file: '06-progress-parsing.png' },
  { id: '07-progress-completed',file: '07-progress-completed.png' },
  { id: '08-progress-failed',  file: '08-progress-failed.png' },
  { id: '09-toolbar-switch',   file: '09-toolbar-switch.png' },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set a wide viewport so both light+dark columns fit
  await page.setViewportSize({ width: 1680, height: 900 });

  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait for Google Fonts to load (or timeout gracefully)
  await page.waitForTimeout(2000);

  for (const scene of SCENES) {
    const el = page.locator(`[id="${scene.id}"]`);
    const outPath = path.join(OUT_DIR, scene.file);

    await el.screenshot({
      path: outPath,
      // add small padding via clip expansion — handled by bounding box
    });

    const size = fs.statSync(outPath).size;
    console.log(`✓ ${scene.file}  (${Math.round(size / 1024)} KB)`);
  }

  await browser.close();
  console.log('\nAll 9 screenshots saved to:', OUT_DIR);
})().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
