const commander = require('commander');
const VALIDATORS = require('./validators');
const constants = require('./constants');

const parseCommandLineArguments = () => {
    const program = new commander.Command();

    program
        .name('jxl-pdf')
        .description('Versatile, print-ready PDFs, from industry-standard source files, in Javascript')
        .version(constants.VERSION)

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
            constants.PAGE_SIZES[constants.DEFAULT_PAGE_SIZE]
        )
        .option(
            '-s, --steps <stepsType>',
            `The processing steps that will take place. Options are ${Object.keys(constants.STEPS_OPTIONS).join(', ')}`,
            VALIDATORS.steps,
            constants.STEPS_OPTIONS["ALL"]
        )
        .option(
            '-F, --fonts <fontsType>',
            `The set of fonts to use. Options are ${Object.keys(constants.FONT_SETS).join(', ')}`,
            VALIDATORS.fonts,
            constants.FONT_SETS["allGentium"]
        ).option(
                    '-S, --fontSizes <fontSizesType>',
                    `The set of font sizes to use. Options are ${Object.keys(constants.FONT_SIZES).join(', ')}`,
                    VALIDATORS.fontSizes,
                    constants.FONT_SIZES["9on10"]
        )

    program.parse(process.argv);

    return program.opts();
};

module.exports = parseCommandLineArguments;
