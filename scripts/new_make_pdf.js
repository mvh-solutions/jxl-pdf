const {PdfGen} = require('../src/index');
const path = require('path');
const fse = require('fs-extra');

const usage = "node new_make_pdf.js <options>";
if (process.argv.length !== 3) {
    console.log(`Wrong number of arguments\nUsage: ${usage}`);
    process.exit(1);
}

const optionsJson = fse.readJsonSync(path.resolve(process.argv[2]));

const pdfCallback = (j) => {
    console.log(`** Callback **`);
    console.log(JSON.stringify(j, null, 4));
}
const doDoPdf = async options => {
    const pg = new PdfGen(options, pdfCallback);
    await pg.doPdf();
}
// Run the wrapper function
doDoPdf(optionsJson).then();
