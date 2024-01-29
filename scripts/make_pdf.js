const {originatePdfs, assemblePdfs} = require('../src/index');
const {PageSizes} = require('pdf-lib');
const commander = require('commander');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');

// Constants
const VERSION = "0.0.1";

const PAGE_SIZES = {
    "A0": PageSizes.A0,
    "A1": PageSizes.A1,
    "A2": PageSizes.A2,
    "A3": PageSizes.A3,
    "A4": PageSizes.A4,
    "A5": PageSizes.A5,
    "A6": PageSizes.A6,
    "A7": PageSizes.A7,
    "LETTER": PageSizes.Letter,
    "EXECUTIVE": [504.0, 720.0],
    "EXECUTIVE_LULU_WITH_BLEED": [521.57, 737.0]
}

const MIN_PAGE_SIZE = PAGE_SIZES["A7"];

const STEPS_OPTIONS = {
    "ARGSONLY": [],
    "CLEAR": ["clear"],
    "ORIGINATE": ["originate"],
    "ASSEMBLE": ["assemble"],
    "ALL": ["originate", "assemble"]
}

// Functions to validate and in some cases modify CLI args
const VALIDATORS = {
    config: configPath => {
        const resolved = path.resolve(configPath);
        if (!(fse.pathExistsSync(resolved)) || !(fse.lstatSync(resolved).isFile())) {
            throw new commander.InvalidArgumentError(`Config file path '${configPath}' does not exist or is not a file`);
        }
        return resolved;
    },
    working: workingDirPath => {
        const resolved = path.resolve(workingDirPath);
        if ((fse.pathExistsSync(resolved)) && !(fse.lstatSync(resolved).isDirectory())) {
            throw new commander.InvalidArgumentError(`Working dir path '${workingDirPath}' exists but is not a directory`);
        }
        return resolved;
    },
    output: outputDirPath => {
        if (!(fse.pathExistsSync(path.dirname(outputDirPath)))) {
            throw new commander.InvalidArgumentError(`The parent directory of '${outputDirPath}' does not exist. Please create it or pick another output path.`);
        }
        return path.resolve(outputDirPath);
    },
    forceOverwrite: newVal => newVal,
    verbose: newVal => newVal,
    pageFormat: newVal => {
        if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(parseInt(newVal.charAt(0)))) { // Should be a custom page size
            const customBits = newVal.split(",");
            if (customBits.length !== 2) {
                throw new commander.InvalidArgumentError(`Custom page size '${newVal}' should contain exactly two comma-separated values`)
            }
            const width = parseFloat(customBits[0]);
            const height = parseFloat(customBits[1]);
            if (!width || width < MIN_PAGE_SIZE[0] || !height || height < MIN_PAGE_SIZE[1]) {
                throw new commander.InvalidArgumentError(`Custom page size '${newVal}' does not contain two comma-separated values of at least ${MIN_PAGE_SIZE[0]} x ${MIN_PAGE_SIZE[1]}}`)
            }
            return [width, height]
        } else { // Should be a known page size
            if (!(newVal.toUpperCase() in PAGE_SIZES)) {
                throw new commander.InvalidArgumentError(`'${newVal}' is not one of ${Object.keys(PAGE_SIZES)}`)
            }
            return PAGE_SIZES[newVal.toUpperCase()];
        }
    },
    book: bookCode => {
        if (!/^[A-Z\d]{3}$/.test(bookCode)) {
            throw new commander.InvalidArgumentError(`Expected a Paratext-style book code, eg 'TIT' or '1CO', not '${bookCode}'`);
        }
        return bookCode;
    },
    steps: stepOptName => {
        if (!(Object.keys(STEPS_OPTIONS).includes(stepOptName))) {
            throw new commander.InvalidArgumentError(`'${stepOptName}' is not one of ${Object.keys(STEPS_OPTIONS)}`)
        }
        return STEPS_OPTIONS[stepOptName];
    }
};

// The command line parser
commander.program
    .name('jxl-pdf')
    .description('Versatile, print-ready PDFs, from industry-standard source files, in Javascript')
    .version(VERSION)
    .option(
        '-c, --config <path>',
        '(Required): Path to the JSON config file (must exist)',
        VALIDATORS.config
    )
    .option(
        '-o, --output <path>',
        '(Required): Path to which the final PDF should be written (should not exist unless --force-overwrite flag is set)',
        VALIDATORS.output,
    )
    .option(
        '-w, --working-dir <path>',
        'Path to a directory for temporary files including originated PDFs. This directory will be created recursively if necessary, and will be cleared whenever the command is run.',
        VALIDATORS.working,
        path.resolve(path.join(os.homedir(), ".jxlpdf/working"))
    )
    .option(
        '-f, --force-overwrite',
        'When set, will clear and overwrite an existing directory for output. Use with care!',
        VALIDATORS.forceOverwrite,
        false
    )
    .option(
        '-v, --verbose',
        'When set, generates console output for debugging and entertainment purposes',
        VALIDATORS.verbose,
        false
    )
    .option(
        '-b, --book <bookCode>',
        "Paratext 3-character bookCode, eg 'TIT' (required for some configurations)",
        VALIDATORS.book,
        null
    )
    .option(
        '-p, --page-format <spec>',
        `One of ${Object.keys(PAGE_SIZES).join(', ')} or '<pointWidth>,<pointHeight>' (eg '504,720' with no spaces)`,
        VALIDATORS.pageFormat,
        PAGE_SIZES["EXECUTIVE"]
    )
    .option(
        '-s, --steps <stepsType>',
        `The processing steps that will take place. Options are ${Object.keys(STEPS_OPTIONS).join(', ')}`,
        VALIDATORS.steps,
        STEPS_OPTIONS["ALL"]
    )

commander.program.parse();

const options = commander.program.opts();

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
doPDFs()
    .catch((e) => {
        console.error(e);
    })
    .then();
