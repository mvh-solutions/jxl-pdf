const commander = require('commander');
const VALIDATORS = require('./validators');
const constants = require('./constants');

function showDefaultStr(obj, defaultVal) {
    if(process.argv.indexOf("--help") != -1 || process.argv.indexOf("-h") != -1) return defaultVal;
    return obj;
}

const parseCommandLineArguments = () => {
    const program = new commander.Command();

    program
        .name('jxl-pdf')
        .description('Versatile, print-ready PDFs, from industry-standard source files, in Javascript')
        .version(constants.VERSION);

    program
        .requiredOption(
            '-c, --config <path>',
            '(Required): Path to the JSON config file (must exist)',
            VALIDATORS.config
        )
        .requiredOption(
            '-o, --output <path>',
            '(Required): Path to which the final PDF should be written (should not exist unless --force-overwrite flag is set)',
            VALIDATORS.output,
        )
        .option(
            '-w, --working-dir <path>',
            'Path to a directory for temporary files including originated PDFs. This directory will be created recursively if necessary, and will be cleared whenever the command is run.',
            VALIDATORS.working,
            constants.DEFAULT_WORKING_DIR
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
            `One of ${Object.keys(constants.PAGE_SIZES).join(', ')}`,
            VALIDATORS.pageFormat,
            showDefaultStr(constants.PAGE_SIZES[constants.DEFAULT_PAGE_SIZE], constants.DEFAULT_PAGE_SIZE)
        )
        .option(
            '-s, --steps <stepsType>',
            `The processing steps that will take place. Options are ${Object.keys(constants.STEPS_OPTIONS).join(', ')}`,
            VALIDATORS.steps,
            showDefaultStr(constants.STEPS_OPTIONS["ALL"], "ALL")
        )
        .option(
            '-F, --fonts <fontsType>',
            `The set of fonts to use. Options are ${Object.keys(constants.FONT_SETS).join(', ')}`,
            VALIDATORS.fonts,
            showDefaultStr(constants.FONT_SETS[constants.DEFAULT_FONT_SET], constants.DEFAULT_FONT_SET)
        ).option(
            '-S, --fontSizes <fontSizesType>',
            `The set of font sizes to use. The name indicates the body font size and line spacing (in point) (format : {body font}on{line spacing}). Options are ${Object.keys(constants.FONT_SIZES).join(', ')}`,
            VALIDATORS.fontSizes,
            showDefaultStr(constants.FONT_SIZES[constants.DEFAULT_FONT_SIZE], constants.DEFAULT_FONT_SIZE)
        );

    program.parse(process.argv);

    return program.opts();
};

module.exports = parseCommandLineArguments;
