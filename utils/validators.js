const fse = require('fs-extra');
const path = require('path');
const constants = require('./constants');
const commander = require('commander');

/**
 * VALIDATORS: Functions to ensure CLI args meet criteria (and in some cases modify CLI args).
 * - config: Validates path to the JSON config file.
 * - working: Checks existence of the working directory.
 * - output: Ensures the output directory's parent exists.
 * - forceOverwrite: Returns boolean for overwrite permission.
 * - verbose: Returns boolean for verbose mode.
 * - pageFormat: Validates custom or predefined page sizes.
 * - book: Checks for valid Paratext-style book code.
 * - steps: Validates processing steps options.
 *
 * Usage: `VALIDATORS[key](value)` to validate each command-line option.
 */
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
            if (!width || width < constants.MIN_PAGE_SIZE[0] || !height || height < constants.MIN_PAGE_SIZE[1]) {
                throw new commander.InvalidArgumentError(`Custom page size '${newVal}' does not contain two comma-separated values of at least ${constants.MIN_PAGE_SIZE[0]} x ${constants.MIN_PAGE_SIZE[1]}}`)
            }
            return [width, height]
        } else { // Should be a known page size
            if (!(newVal.toUpperCase() in constants.PAGE_SIZES)) {
                throw new commander.InvalidArgumentError(`'${newVal}' is not one of ${Object.keys(constants.PAGE_SIZES)}`)
            }
            return constants.PAGE_SIZES[newVal.toUpperCase()];
        }
    },
    book: bookCode => {
        if (!/^[A-Z\d]{3}$/.test(bookCode)) {
            throw new commander.InvalidArgumentError(`Expected a Paratext-style book code, eg 'TIT' or '1CO', not '${bookCode}'`);
        }
        return bookCode;
    },
    steps: stepOptName => {
        if (!(Object.keys(constants.STEPS_OPTIONS).includes(stepOptName))) {
            throw new commander.InvalidArgumentError(`'${stepOptName}' is not one of ${Object.keys(constants.STEPS_OPTIONS)}`)
        }
        return constants.STEPS_OPTIONS[stepOptName];
    }
};

module.exports = VALIDATORS;