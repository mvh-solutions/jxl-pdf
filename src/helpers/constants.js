const path = require('path');
const os = require('os');
const pageSizes = require('../../resources/pages.json');

const constants = {
    VERSION: "0.0.1",
    DEFAULT_WORKING_DIR: path.resolve(path.join(os.homedir(), ".jxlpdf/working")),
    DEFAULT_PAGE_SIZE: "EXECUTIVE",
    STEPS_OPTIONS: {
        "ARGSONLY": [],
        "CLEAR": ["clear"],
        "ORIGINATE": ["originate"],
        "ASSEMBLE": ["assemble"],
        "ALL": ["originate", "assemble"]
    },
    PAGE_SIZES: pageSizes
};

module.exports = constants;
