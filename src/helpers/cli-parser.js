const commander = require('commander');
const fse = require('fs-extra');
const path = require('path');
const validators = require('./validators');
const constants = require('./constants');
const {resolvePath} = require('./paths');

const parseCommandLineArguments = () => {

    const configureProgram = p => p
        .name('jxl-pdf')
        .description('Versatile, print-ready Scripture-related PDFs, from industry-standard source files, in Javascript')
        .version(constants.VERSION)
        .requiredOption(
            '-c, --config <path>',
            '(Required): Path to the JSON config file (must exist)',
            validators.config
        )
        .option(
            '-o, --output <path>',
            'Path to which the final PDF should be written (must not exist unless --force-overwrite flag is set)',
            validators.output,
            configJson.global.outputPath
        )
        .option(
            '-w, --working-dir <path>',
            'Path to a directory for temporary files including originated PDFs. This directory will be created recursively if necessary, and will be cleared whenever the command is run.',
            validators.working,
            configJson.global.workingDir || constants.DEFAULT_WORKING_DIR
        )
        .option(
            '-f, --force-overwrite',
            'When set, will clear and overwrite an existing directory for output. Use with care!',
            validators.forceOverwrite,
            false
        )
        .option(
            '-v, --verbose',
            'When set, generates console output for debugging and entertainment purposes',
            validators.verbose,
            "verbose" in configJson.global ? configJson.global.verbose : false
        )
        .option(
            '-p, --page-format <spec>',
            `One of ${Object.keys(constants.PAGE_SIZES).join(', ')}`,
            validators.pageFormat,
            configJson.global.pages || constants.DEFAULT_PAGE_SIZE
        )
        .option(
            '-F, --fonts <fontsType>',
            `The set of fonts to use. Options are ${Object.keys(constants.FONT_SETS).join(', ')}`,
            validators.fonts,
            configJson.global.fonts || constants.DEFAULT_FONT_SET
        ).option(
            '-S, --fontSizes <fontSizesType>',
            `The set of font sizes to use. The name indicates the body font size and line spacing (in point) (format : {body font}on{line spacing}). Options are ${Object.keys(constants.FONT_SIZES).join(', ')}`,
            validators.fontSizes,
            configJson.global.sizes || constants.DEFAULT_FONT_SIZE
        );


    let program = new commander.Command();
    let configJson = {global: {}};
    configureProgram(program);
    program.parse(process.argv);
    let options = program.opts();
    configJson = fse.readJsonSync(path.resolve(options.config));

    program = new commander.Command();
    configureProgram(program);
    program.parse(process.argv);

    const opts = program.opts();
    if (opts.output) {
        configJson.global.outputPath = opts.output;
    }
    if (opts.workingDir) {
        configJson.global.workingDir = opts.workingDir;
    }
    if ("verbose" in opts) {
        configJson.global.verbose = opts.verbose;
    }
    if (opts.pageFormat) {
        configJson.global.pages = opts.pageFormat;
    }
    if (opts.fonts) {
        configJson.global.fonts = opts.fonts;
    }
    if (opts.fontSizes) {
        configJson.global.sizes = opts.fontSizes;
    }
    configJson.global.outputPath = resolvePath(configJson.global.outputPath);
    configJson.global.workingDir = resolvePath(configJson.global.workingDir);
    if (!opts.forceOverwrite && fse.pathExistsSync(configJson.global.outputPath)) {
        throw new commander.InvalidArgumentError(`Output would overwrite ${configJson.global.outputPath} - use --forceOverwrite.`);
    }
    return configJson;
};

module.exports = parseCommandLineArguments;
