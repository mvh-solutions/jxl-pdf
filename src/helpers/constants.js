const path = require('path');
const os = require('os');
const pageSizes = require('../../resources/pages.json');
const fontSets = require('../../resources/fonts.json');
const fontSizes = require('../../resources/sizes.json');
const packageJson = require('../../package.json');

const constants = {
    VERSION: packageJson.version,
    DEFAULT_WORKING_DIR: path.resolve(path.join(os.homedir(), ".jxlpdf/working")),
    DEFAULT_PAGE_SIZE: "A4P",
    DEFAULT_FONT_SET: "allGentium",
    DEFAULT_FONT_SIZE: "9on10",
    STEPS_OPTIONS: {
        "ARGSONLY": [],
        "CLEAR": ["clear"],
        "ORIGINATE": ["originate"],
        "ASSEMBLE": ["assemble"],
        "ALL": ["originate", "assemble"]
    },
    PAGE_SIZES: pageSizes,
    FONT_SETS: fontSets,
    FONT_SIZES: fontSizes
};

module.exports = constants;
