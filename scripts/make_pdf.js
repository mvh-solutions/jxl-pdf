const {
    originatePdfs,
    assemblePdfs
} = require('../src/index');
const commander = require('commander');
const fse = require('fs-extra');
const path = require('path');
const parseCommandLineArguments = require('../utils/cli-parser');

const options = parseCommandLineArguments();

// Add convenience paths
options.pdfPath = path.join(options.workingDir, "pdf");
options.htmlPath = path.join(options.workingDir, "html", "pages");
options.manifestPath = path.join(options.workingDir, "manifest.json");

// Maybe show the resolved CLI args
options.verbose && console.log("** CLI **");
if (options.verbose) {
    for (const [k, v] of Object.entries(options)) {
        console.log(`   ${k}: ${JSON.stringify(v)}`);
    }
}

// Check that output file will not accidentally overwrite an existing file
if (fse.pathExistsSync(options.output) && !options.forceOverwrite) {
    throw new commander.InvalidArgumentError(`Output path '${options.output}' would be overwritten but 'forceOverwrite' flag is not set.`);
}

// Attempt to read config file and add JSON to options
if (!(fse.pathExistsSync(options.config)) || !(fse.lstatSync(options.config).isFile())) {
    throw new commander.InvalidArgumentError(`Config file path '${options.config}' does not exist or is not a file`);
}
try {
    options.configContent = fse.readJsonSync(options.config);
} catch (err) {
    throw new Error(`Could not read config file ${options.config} as JSON: ${err.message}`);
}

// In CLEAR mode, delete working dir and exit
if (options.steps.includes("clear")) {
    options.verbose && console.log("** CLEAR **");
    if (fse.pathExistsSync(options.workingDir)) {
        options.verbose && console.log(`   Deleting working dir ${options.workingDir}`);
        fse.removeSync(options.workingDir);
    } else {
        options.verbose && console.log(`   Working dir ${options.workingDir} not found - abandoning.`);
    }
    process.exit(0);
}

// Wrapper function to do originate and/or assemble steps
const doPDFs = async () => {
    if (options.steps.includes("originate")) {
        options.verbose && console.log("** ORIGINATE **");
        if (fse.pathExistsSync(options.workingDir)) {
            options.verbose && console.log(`   Deleting working dir ${options.workingDir}`);
            fse.removeSync(options.workingDir);
        } else {
            options.verbose && console.log(`   Creating working dir ${options.workingDir}`);
        }
        fse.mkdirsSync(options.workingDir);
        await originatePdfs(options);
    }
    if (options.steps.includes("assemble")) {
        options.verbose && console.log("** ASSEMBLE **");
        if (!fse.pathExistsSync(options.manifestPath)) {
            throw new Error("Cannot run assemble without first originating content");
        }
        await assemblePdfs(options);
    }
}

// Run the wrapper function
doPDFs();
