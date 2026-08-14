const { chromium } = require('playwright');
require('dotenv').config();

/**
 * Launches a fresh browser instance.
 * Set HEADLESS=false in .env while you are figuring out the real
 * selectors below -- you'll want to SEE the browser click things.
 */
async function getBrowser() {
  return chromium.launch({ headless: process.env.HEADLESS !== 'false' });
}

/**
 * Logs into SureMDM Hub.
 *
 * IMPORTANT: the selectors below (#username, #password, ...) are
 * placeholders. Open your real SureMDM Hub login page, right-click the
 * username field -> Inspect, and copy its real id/name attribute here.
 * Same for every selector in createClient.js and applyTemplates.js.
 */
async function loginToHub(page) {
  await page.goto(process.env.SUREMDM_HUB_URL);
  await page.fill('#username', process.env.SUREMDM_USERNAME);
  await page.fill('#password', process.env.SUREMDM_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

module.exports = { getBrowser, loginToHub };
