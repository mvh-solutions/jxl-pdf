const puppeteer = require("puppeteer");
const path = require('path');

const doPuppet = async ({htmlPath, pdfPath, verbose=false}) => {
    const waitTillHTMLRendered = async (page, timeout = 30000) => {
        const checkDurationMsecs = 5000;
        const maxChecks = timeout / checkDurationMsecs;
        let lastHTMLSize = 0;
        let checkCounts = 1;
        let countStableSizeIterations = 0;
        const minStableSizeIterations = 3;

        while (checkCounts++ <= maxChecks) {
            let html = page.content();
            let currentHTMLSize = html.length;
            if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize)
                countStableSizeIterations++;
            else
                countStableSizeIterations = 0; //reset the counter

            if (countStableSizeIterations >= minStableSizeIterations) {
                break;
            }
            lastHTMLSize = currentHTMLSize;
            await page.waitForTimeout(checkDurationMsecs);
        }
    };

    const browser = await puppeteer.launch({headless: "new", args: [ '--disable-web-security', '--no-sandbox', ]});
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`);
    page.on("pageerror", function (err) {
            throw new Error(`Puppeteer page error for ${htmlPath}: ${err.toString()}`);
        }
    )
    await waitTillHTMLRendered(page);
    await page.pdf({
        path: pdfPath,
        format: 'A3',
        landscape: true,
        timeout: 300000 // 5 minutes
    });
    verbose && console.log(`      PDF generated and saved to ${pdfPath}`);
    await browser.close();
}

module.exports = {
    doPuppet
}
