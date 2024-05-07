const {PdfGen} = require('../src/index');
const path = require('path');
const fse = require('fs-extra');

const options = {};
const jsonDoc = fse.readJsonSync(path.resolve(process.argv[2]));
const pg = new PdfGen(options);
console.log(
    JSON.stringify(
        pg.validateConfig(jsonDoc),
        null,
        2
    )
);
