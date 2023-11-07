const doPdf = require('../src/index');

const usage = "USAGE: node make_html.js <configPath> <serverPort> <outputDirName> [<bookCode>]";
if (![5, 6].includes(process.argv.length)) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const serverPort = process.argv[3];
const outputDirName = process.argv[4];
const cliBookCode = process.argv[5] || null;

doPdf({configPath, serverPort, outputDirName, cliBookCode}).then();
