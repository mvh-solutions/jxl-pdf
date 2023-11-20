const doPdf = require('../src/index');
const PythonShell = require('python-shell').PythonShell;
var path = require('path');
var http = require('http');
var url = require('url');
var fs = require('fs');

const testGroup = 'Pdf generation';
var baseDirectory = path.join(path.normalize(__dirname+"/../static/html/output"));


const usage = "USAGE: node make_html.js <configPath> <outputDirName> [<bookCode>]";
if (![5, 6].includes(process.argv.length)) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const outputDirName = process.argv[3];
const cliBookCode = process.argv[4] || null;

doPdf({configPath, outputDirName, cliBookCode}).then(() => {
    let pyshell = new PythonShell('cut_pdf.py', {
        mode: 'text', scriptPath:'./python-jxl', args:["FROMNODE", outputDirName]
    });

    pyshell.on('message', function (message) {
        // received a message sent from the Python script (a simple "print" statement)
        console.log(message);
    });

    // end the input stream and allow the process to exit
    pyshell.end(function (err,code,signal) {
        if (err) throw err;
        console.log('finished');
    });
}).catch((e) => {
    console.error(e);
});
