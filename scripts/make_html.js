const doPdf = require('../src/index');
const PythonShell = require('python-shell').PythonShell;

const usage = "USAGE: node make_html.js <configPath> <serverPort> <outputDirName> [<bookCode>]";
if (![5, 6].includes(process.argv.length)) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const serverPort = process.argv[3];
const outputDirName = process.argv[4];
const cliBookCode = process.argv[5] || null;

doPdf({configPath, serverPort, outputDirName, cliBookCode}).then(() => {
    PythonShell.run('cut_pdf.py', {
        mode: 'text', scriptPath:'./python-jxl', args:["FROMNODE", outputDirName]
    }, function (err, results) {
        if (err) throw err;
        console.log('results: %j', results);
    });
}).catch((e) => {
    console.error(e);
});
