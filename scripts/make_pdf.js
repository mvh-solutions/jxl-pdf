const {PdfGen} = require('../src/index');
const { parseCommandLineArguments } = require('../src/helpers');
const puppeteer = require("puppeteer");

const options = parseCommandLineArguments();

// Maybe show the resolved CLI args
options.verbose && console.log("** CLI **");
if (options.verbose) {
    for (const [k, v] of Object.entries(options)) {
        console.log(`   ${k}: ${JSON.stringify(v, null, 4)}`);
    }
}

const doPdf = async options => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--disable-web-security',
            ]
        });
    } catch (err) {
        options.verbose && console.log("      Puppeteer falling back to no-sandbox")
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--disable-web-security',
                '--no-sandbox',
            ]
        });
    }
    const pg = new PdfGen({...options, browser});
    await pg.doPdf();
}
// Run the wrapper function
doPdf(options).then();
