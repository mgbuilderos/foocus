const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Starting Puppeteer stress test...");
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  
  const report = [];
  let testPasses = 0;
  
  page.on('pageerror', error => {
    console.error("Page Error:", error.message);
    report.push(`[Page Error] ${error.message}`);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error("Console Error:", msg.text());
      report.push(`[Console Error] ${msg.text()}`);
    }
  });

const delay = ms => new Promise(res => setTimeout(res, ms));

  const runSprint = async (iteration, isNatural) => {
    console.log(`--- Iteration ${iteration} (Natural: ${isNatural}) ---`);
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

    // Step 1: Goal
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', `Test Goal ${iteration}`);
    await page.click('button[type="submit"]');

    // Step 2: Subtask
    await page.waitForSelector('input[aria-label="Subtask Title"]');
    await page.type('input[aria-label="Subtask Title"]', `Subtask ${iteration}`);
    
    // Change duration to 1 min
    const durationInput = await page.$('input[aria-label="Subtask Duration (minutes)"]');
    await durationInput.click({ clickCount: 3 });
    await durationInput.type('1');

    await page.click('button[type="submit"]'); // Add subtask
    
    // Continue
    const buttons = await page.$$('button');
    let continueBtn;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Continue')) {
        continueBtn = btn;
        break;
      }
    }
    if (continueBtn) await continueBtn.click();

    // Begin Sprint
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Begin Sprint'));
    });
    const beginButtons = await page.$$('button');
    for (const btn of beginButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Begin Sprint')) {
        await btn.click();
        break;
      }
    }

    // Wait for RUNNING state UI
    await page.waitForSelector('[aria-label="Pause sprint"]');
    console.log(`Sprint ${iteration} started.`);

    if (!isNatural) {
      // Early finish
      await delay(2000); // wait 2 seconds
      await page.click('[aria-label="Finish task early"]');
      console.log(`Sprint ${iteration} early finish clicked.`);
    } else {
      // Natural expiration
      console.log(`Waiting 65 seconds for natural expiration of Sprint ${iteration}...`);
      await delay(65000);
    }

    // Check for finish state
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('h2, h1, p, span, div')).some(el => el.textContent.includes('Sprint Complete') || el.textContent.includes('All tasks finished'));
    }, { timeout: 10000 });
    
    console.log(`Sprint ${iteration} finished.`);
    report.push(`Iteration ${iteration} (${isNatural ? 'Natural' : 'Early'}): SUCCESS`);

    // Click "Start New Sprint"
    const newSprintButtons = await page.$$('button');
    for (const btn of newSprintButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Start New Sprint')) {
        await btn.click();
        break;
      }
    }
    
    // Verify reset
    await page.waitForSelector('input[type="text"]');
    testPasses++;
  };

  try {
    for (let i = 1; i <= 10; i++) {
      // Run iterations 3, 7, and 10 as natural wait
      const isNatural = [3, 7, 10].includes(i);
      await runSprint(i, isNatural);
    }
    console.log("All iterations finished successfully.");
  } catch (err) {
    console.error("Test failed:", err);
    report.push(`[Test Failure] ${err.message}`);
  }

  await browser.close();

  const reportContent = `# QA Automation Report

## Summary
Completed ${testPasses} out of 10 runs.

## Findings & Errors
${report.length > 0 ? report.map(r => '- ' + r).join('\\n') : 'No errors found.'}
`;

  fs.writeFileSync('qa_report.md', reportContent);
  console.log("Written qa_report.md");
})();
