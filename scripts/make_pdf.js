const {PdfGen} = require('../src/index');
const path = require('path');
const { parseCommandLineArguments } = require('../src/helpers');

const options = parseCommandLineArguments();

/*  // Add convenience paths
options.pdfPath = path.join(options.workingDir, "pdf");
options.htmlPath = path.join(options.workingDir, "html", "pages");
options.manifestPath = path.join(options.workingDir, "manifest.json");
*/

// Maybe show the resolved CLI args
options.verbose && console.log("** CLI **");
if (options.verbose) {
    for (const [k, v] of Object.entries(options)) {
        console.log(`   ${k}: ${JSON.stringify(v, null, 4)}`);
    }
}

const pdfCallback = (j) => {
    console.log(`** Callback **`);
    console.log(JSON.stringify(j, null, 4));
}
const doPdf = async options => {
    const pg = new PdfGen(options);
    await pg.doPdf();
}
// Run the wrapper function
doPdf(options).then();
