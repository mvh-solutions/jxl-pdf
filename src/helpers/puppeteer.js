const puppeteer = require("puppeteer");
const path = require('path');

const doPuppet = async (sectionId, pdfOutputPath, orientation, outputDirName) => {
    const waitTillHTMLRendered = async (page, timeout = 30000) => {
        const checkDurationMsecs = 1000;
        const maxChecks = timeout / checkDurationMsecs;
        let lastHTMLSize = 0;
        let checkCounts = 1;
        let countStableSizeIterations = 0;
        const minStableSizeIterations = 3;

        while (checkCounts++ <= maxChecks) {
            let html = await page.content();
            let currentHTMLSize = html.length;

            let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
            if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize)
                countStableSizeIterations++;
            else
                countStableSizeIterations = 0; //reset the counter

            if (countStableSizeIterations >= minStableSizeIterations) {
                console.log("     Page rendered fully");
                break;
            }

            lastHTMLSize = currentHTMLSize;
            await page.waitForTimeout(checkDurationMsecs);
        }
    };

    console.log(`     Running Puppet`);
    const browser = await puppeteer.launch({headless: "new"});
    const page = await browser.newPage();
    const fullPath = path.join(path.normalize(__dirname+`/../../static/html/${outputDirName}/${sectionId}.html`))
    await page.goto(`file://${fullPath}`);
    page.on("pageerror", function (err) {
            theTempValue = err.toString();
            console.log("Page error: " + theTempValue);
        }
    )
    await waitTillHTMLRendered(page);
    await page.pdf({
        path: pdfOutputPath,
        format: orientation === 'landscape' ? 'A3' : 'A3',
        landscape: orientation === 'landscape',
        timeout: 300000
    }); // 5 minutes
    console.log(`     Saved PDF to ${pdfOutputPath}`);
    await browser.close();
}

module.exports = {
    doPuppet
}
