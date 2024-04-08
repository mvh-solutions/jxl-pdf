const {PdfGen} = require('../src/index');
const { parseCommandLineArguments } = require('../src/helpers');

const options = parseCommandLineArguments();

const pg = new PdfGen(options);
console.log(JSON.stringify(pg.handlerInfo(), null, 2));
console.log(JSON.stringify(pg.pageInfo(), null, 2));
