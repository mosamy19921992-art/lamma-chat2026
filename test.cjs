const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
    if (msg.type() === 'error') {
      const args = msg.args();
      for (const arg of args) {
        arg.executionContext().evaluate(obj => {
          if (obj instanceof Error) return obj.stack;
          return String(obj);
        }, arg).then(val => {
          console.log('EVALUATED ARG:', val);
        }).catch(e => {});
      }
    }
  });
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.stack));
  
  await page.goto('http://localhost:5173/?room=egypt');
  
  await page.waitForSelector('button');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let b of btns) {
      if (b.textContent.includes('يالا بينا')) b.click();
    }
  });
  
  await page.waitForSelector('.primaryBtn', { visible: true });
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.primaryBtn');
    for (let b of btns) {
      if (b.textContent.includes('دخول كزائر')) b.click();
    }
  });
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
