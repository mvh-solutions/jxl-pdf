const {PdfGen} = require('../src/index');
const path = require('path');
const fse = require('fs-extra');

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
