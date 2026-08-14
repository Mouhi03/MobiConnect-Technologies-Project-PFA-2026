const fs = require('fs');

/**
 * Fills and submits the "Create Customer" form in SureMDM Hub.
 *
 * client = {
 *   companyName, firstName, lastName, workEmail, password,
 *   domainName, country, phoneNumber,
 *   globalJobsProfiles (bool), intercom (bool)
 * }
 *
 * Returns one of:
 *   { status: 'created', domain, companyName }
 *   { status: 'needs_human', reason: 'captcha', screenshot }
 *   { status: 'error', error }
 *
 * Again: every selector below is a placeholder. Inspect the real
 * "Create Customer" form and swap them in.
 */
async function createClient(page, client) {
  try {
    await page.goto(`${process.env.SUREMDM_HUB_URL}/CreateCustomer`);

    await page.fill('[name="companyName"]', client.companyName);
    await page.fill('[name="firstName"]', client.firstName);
    await page.fill('[name="lastName"]', client.lastName);
    await page.fill('[name="workEmail"]', client.workEmail);
    await page.fill('[name="password"]', client.password);
    await page.fill('[name="domainName"]', client.domainName);
    await page.selectOption('[name="country"]', client.country);
    await page.fill('[name="phoneNumber"]', client.phoneNumber);

    if (client.globalJobsProfiles) await page.check('#globalJobsProfiles');
    if (client.intercom) await page.check('#intercom');

    // Detect reCAPTCHA before submitting -- if present, stop and hand off
    // to a human instead of trying to solve it.
    const captchaCount = await page
      .locator('.g-recaptcha, iframe[src*="recaptcha"]')
      .count();

    if (captchaCount > 0) {
      if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
      const screenshotPath = `screenshots/captcha-${client.domainName}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return { status: 'needs_human', reason: 'captcha', screenshot: screenshotPath };
    }

    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');

    const errorLocator = page.locator('.error-message, .alert-danger');
    if (await errorLocator.count() > 0) {
      const errorText = await errorLocator.first().innerText();
      return { status: 'error', error: errorText };
    }

    return { status: 'created', domain: client.domainName, companyName: client.companyName };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

module.exports = { createClient };
