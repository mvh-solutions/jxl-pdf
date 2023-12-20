const doPdf = require('../src/index');
const { program } = require('commander');
const PythonShell = require('python-shell').PythonShell;


const usage = "USAGE: node make_html.js -c <configPath> -o <outputDirName> [-b <bookCode> -p <page format>]";

program
    .version("0.0.1")
    .option('-c, --config <path>', 'path to the config file')
    .option('-o, --output <output>', 'desired output folder name')
    .option('-b, --book <book>', '3 letters book')
    .option('-p, --page-format <size>', 'page size format (A4, A5, executive, etc.)')
    .option('-n, --no-python', 'flag to NOT execute the python script')

program.parse();

const options = program.opts();
const keysOpt = Object.keys(options);

if (!keysOpt.includes("config") && !keysOpt.includes("output")) {
    console.log(`You must give a config file (-c, --config) and an output file name (-o, --output)!\n${usage}`);
    process.exit(1);
}

const flag = !keysOpt.includes("noPython");

const configPath = options.config;
const outputDirName = options.output;
let cliBookCode = null;
const pageFormat = options.pageFormat;

if(options.book && /\b[A-Z\d]{1,3}\b/.test(options.book)) {
    cliBookCode = options.book;
}

doPdf({configPath, outputDirName, cliBookCode}).then(() => {
    if(!flag) {
        let pyshell = new PythonShell('cut_pdf.py', {
            mode: 'text', scriptPath:'./python-jxl', args:["FROMNODE", outputDirName, pageFormat]
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
    }
}).catch((e) => {
    console.error(e);
});
