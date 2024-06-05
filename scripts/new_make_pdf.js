const {PdfGen} = require('../src/index');
const path = require('path');
const fse = require('fs-extra');

const optionsJson = fse.readJsonSync(path.resolve(process.argv[2]));
const doDoPdf = async options => {
    const pg = new PdfGen(options);
    await pg.doPdf();
}
// Run the wrapper function
doDoPdf(optionsJson).then();
