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
    loadTemplates
} = require('./loadTemplates');

const {
    cleanNoteLine,
    maybeChapterNotes
} = require('./notes');

const {
    getBookName,
    pkWithDocs
} = require('./proskomma');

const {
    doPuppet
} = require('./puppeteer');

module.exports = {
    quoteForCv,
    getCVTexts,
    cvForSentence,
    trimLhsText,
    getGreekContent,
    loadTemplates,
    cleanNoteLine,
    maybeChapterNotes,
    getBookName,
    pkWithDocs,
    doPuppet
}
