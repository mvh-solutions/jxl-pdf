const fse = require('fs-extra');
const path = require('path');
const constants = require('./constants');
const commander = require('commander');

/**
 * Validators: Functions to ensure CLI args meet criteria (and in some cases modify CLI args).
 * - config: Validates path to the JSON config file.
 * - working: Checks existence of the working directory.
 * - output: Ensures the output directory's parent exists.
 * - forceOverwrite: Returns boolean for overwrite permission.
 * - verbose: Returns boolean for verbose mode.
 * - pageFormat: Validates predefined page sizes.
 * - book: Checks for valid Paratext-style book code.
 * - steps: Validates processing steps options.
 * - fonts: Validates predefined fonts for the output document.
 *
 * Usage: `VALIDATORS[key](value)` to validate each command-line option.
 */
const validators = {
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
    resourcesDir: resourcesPath => {
        if (!resourcesPath) {
            return null;
        }
        const resolved = path.resolve(resourcesPath);
        if (!fse.pathExistsSync(resolved)) {
            throw new commander.InvalidArgumentError(`Resources dir '${resolved}' does not exist`);
        }
        if (!(fse.lstatSync(resolved).isDirectory())) {
            throw new commander.InvalidArgumentError(`Resources dir '${resolved}' is not a directory`);
        }
        return resolved;
    },
    output: outputDirPath => {
        if (!outputDirPath) {
            throw new commander.InvalidArgumentError(`Falsy value provided for outputPath`);
        }
        if (!(fse.pathExistsSync(path.dirname(outputDirPath)))) {
            throw new commander.InvalidArgumentError(`The parent directory of '${outputDirPath}' does not exist. Please create it or pick another output path.`);
        }
        return path.resolve(outputDirPath);
    },
    forceOverwrite: newVal => newVal,
    verbose: newVal => newVal,
    pageFormat: newVal => {
        const ucFormat = newVal.toUpperCase();
        if (!(ucFormat in constants.PAGE_SIZES)) {
            throw new commander.InvalidArgumentError(`'${ucFormat}' is not one of ${Object.keys(constants.PAGE_SIZES).join(', ')}`)
        }
        return ucFormat;
    },
    book: bookCode => {
        if (!/^[A-Z\d]{3}$/.test(bookCode)) {
            throw new commander.InvalidArgumentError(`Expected a Paratext-style book code, eg 'TIT' or '1CO', not '${bookCode}'`);
        }
        return bookCode;
    },
    steps: stepOptName => {
        if (!(Object.keys(constants.STEPS_OPTIONS).includes(stepOptName))) {
            throw new commander.InvalidArgumentError(`'${stepOptName}' is not one of ${Object.keys(constants.STEPS_OPTIONS).join(', ')}`)
        }
        return stepOptName;
    },
    fonts: fontName => {
        if (!(Object.keys(constants.FONT_SETS).includes(fontName))) {
            throw new commander.InvalidArgumentError(`'${fontName}' is not one of ${Object.keys(constants.FONT_SETS).join(', ')}`)
        }
        return fontName;
    },
    fontSizes: fontSizesName => {
        if (!(Object.keys(constants.FONT_SIZES).includes(fontSizesName))) {
            throw new commander.InvalidArgumentError(`'${fontSizesName}' is not one of ${Object.keys(constants.FONT_SIZES).join(', ')}`)
        }
        return fontSizesName;
    }
};

module.exports = validators;
