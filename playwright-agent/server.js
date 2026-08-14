require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const { getBrowser, loginToHub } = require('./lib/browser');
const { createClient } = require('./lib/createClient');
const { applyGroups, applyJobs } = require('./lib/applyTemplates');

const app = express();
app.use(express.json());

// Health check -- open http://localhost:4000/health in a browser to confirm it's running
app.get('/health', (req, res) => res.json({ ok: true }));

// Called by n8n orchestrator workflow (02) -- Module C
app.post('/create-client', async (req, res) => {
  const client = req.body;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await loginToHub(page);
    const result = await createClient(page, client);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  } finally {
    await browser.close();
  }
});

// Called by n8n templates workflow (04) -- Module E
app.post('/apply-templates', async (req, res) => {
  const { secteur, clientConsoleUrl, consoleUsername, consolePassword } = req.body;

  const groupsPath = path.join(__dirname, 'templates', 'groups', `${secteur}.json`);
  const jobsPath = path.join(__dirname, 'templates', 'jobs', `${secteur}.json`);

  if (!fs.existsSync(groupsPath) || !fs.existsSync(jobsPath)) {
    return res.status(400).json({ status: 'error', error: `No template found for secteur "${secteur}"` });
  }

  const groupsTemplate = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
  const jobsTemplate = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(clientConsoleUrl);
    await page.fill('[name="username"]', consoleUsername);
    await page.fill('[name="password"]', consolePassword);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await applyGroups(page, groupsTemplate);
    await applyJobs(page, jobsTemplate.jobs);

    res.json({ status: 'done', secteur });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Onboarding agent listening on http://localhost:${PORT}`));
