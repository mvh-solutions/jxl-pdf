const doFrontSection = require('./frontSection');
const doMarkdownSection = require('./markdownSection');
const doBookNoteSection = require('./bookNoteSection');
const do4ColumnSpreadSection = require('./4ColumnSpreadSection');
const doJxlSpreadSection = require('./jxlSpreadSection');
const doJxlSimpleSection = require('./jxlSimpleSection');
const do2ColumnSection = require('./2ColumnSection');
const doBcvBibleSection = require("./bcvBibleSection");
const doParaBibleSection = require("./paraBibleSection");
const doBiblePlusNotesSection = require("./biblePlusNotesSection");

module.exports = {
    doFrontSection,
    doMarkdownSection,
    doBookNoteSection,
    do4ColumnSpreadSection,
    doJxlSpreadSection,
    doJxlSimpleSection,
    do2ColumnSection,
    doBcvBibleSection,
    doParaBibleSection,
    doBiblePlusNotesSection
}
