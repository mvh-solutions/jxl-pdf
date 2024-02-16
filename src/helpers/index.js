const parseCommandLineArguments = require('./cli-parser');

const constants = require('./constants');

const VALIDATORS = require('./validators');

const {
    setupOneCSS,
    checkCssSubstitution
} = require('./css');

const {
    quoteForCv,
    getCVTexts
} = require('./cv');

const {
    cvForSentence,
    trimLhsText,
    getGreekContent
} = require('./jxl');

const {
    loadTemplates,
    loadTemplate
} = require('./loadTemplates');

const {
    cleanNoteLine,
    maybeChapterNotes,
    bcvNotes
} = require('./notes');

const {
    getBookName,
    pkWithDocs
} = require('./proskomma');

const {
    doPuppet
} = require('./puppeteer');

module.exports = {
    constants,
    parseCommandLineArguments,
    VALIDATORS,
    setupOneCSS,
    checkCssSubstitution,
    quoteForCv,
    getCVTexts,
    cvForSentence,
    trimLhsText,
    getGreekContent,
    loadTemplates,
    loadTemplate,
    cleanNoteLine,
    maybeChapterNotes,
    bcvNotes,
    getBookName,
    pkWithDocs,
    doPuppet
}
