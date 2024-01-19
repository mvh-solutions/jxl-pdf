const { doPdf, makePdf } = require('../src/index');
const { PageSizes } = require('pdf-lib');
const { program } = require('commander');


const usage = "USAGE: node make_html.js -c <configPath> -o <outputDirName> [-b <bookCode> -p <page format>]";

program
    .version("0.0.1")
    .option('-c, --config <path>', 'path to the config file')
    .option('-o, --output <output>', 'desired output folder name')
    .option('-b, --book <book>', '3 letters book')
    // .option('-p, --page-format <size>', 'page size format (A4, A5, executive, etc.)')
    .option('-n, --no-generate', 'flag to NOT execute the generation of the final pdf')

program.parse();

const options = program.opts();
const keysOpt = Object.keys(options);

if (!keysOpt.includes("config") && !keysOpt.includes("output")) {
    console.log(`You must give a config file (-c, --config) and an output file name (-o, --output)!\n${usage}`);
    process.exit(1);
}

const PAGE_SIZES = {
    "A0" : PageSizes.A0,
    "A1" : PageSizes.A1,
    "A2" : PageSizes.A2,
    "A3" : PageSizes.A3,
    "A4" : PageSizes.A4,
    "A5" : PageSizes.A5,
    "A6" : PageSizes.A6,
    "A7" : PageSizes.A7,
    "LETTER" : PageSizes.Letter,
    "letter" : PageSizes.Letter,
    "EXECUTIVE" : [504.0, 720.0],
    "EXECUTIVE_LULU_WITH_BLEED" : [521.57, 737.0]
}

const configPath = options.config;
const outputDirName = options.output;
let cliBookCode = null;
const pageFormat = options.pageFormat;

if(options.book && /\b[A-Z\d]{1,3}\b/.test(options.book)) {
    cliBookCode = options.book;
}

doPdf({configPath, outputDirName, cliBookCode}).then(() => {
    if(options.python) {
        makePdf({dirName:outputDirName, pageSize:PAGE_SIZES["EXECUTIVE_LULU_WITH_BLEED"]});
    }
}).catch((e) => {
    console.error(e);
});
