/**
 * Recursively recreates a groups tree (see templates/groups/*.json)
 * inside the client's SureMDM console.
 *
 * groupNode = { name: "Casablanca", children: [ {...}, {...} ] }
 *
 * Again, the selectors are placeholders -- inspect the real "Groups"
 * screen in a client console and adjust.
 */
async function applyGroups(page, groupNode, parentName = null) {
  await createGroup(page, groupNode.name, parentName);
  for (const child of groupNode.children || []) {
    await applyGroups(page, child, groupNode.name);
  }
}

async function createGroup(page, groupName, parentName) {
  await page.click('button:has-text("Add Group")');
  if (parentName) {
    await page.selectOption('[name="parentGroup"]', parentName);
  }
  await page.fill('[name="groupName"]', groupName);
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(500);
}

/**
 * Applies a flat list of jobs from templates/jobs/*.json.
 * jobsList = ["Install_App_Chrome", "Configure_WiFi_Client", ...]
 */
async function applyJobs(page, jobsList) {
  for (const jobName of jobsList) {
    await page.click('button:has-text("Add Job")');
    await page.selectOption('[name="jobTemplate"]', jobName);
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);
  }
}

module.exports = { applyGroups, applyJobs };
