const path = require('path');
const os = require('os');
const {
    PageSizes
} = require('pdf-lib');

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
    PAGE_SIZES: {
        "A0": PageSizes.A0,
        "A1": PageSizes.A1,
        "A2": PageSizes.A2,
        "A3": PageSizes.A3,
        "A4": PageSizes.A4,
        "A5": PageSizes.A5,
        "A6": PageSizes.A6,
        "A7": PageSizes.A7,
        "LETTER": PageSizes.Letter,
        "EXECUTIVE": [504.0, 720.0],
        "EXECUTIVE_LULU_WITH_BLEED": [521.57, 737.0]
    },
    MIN_PAGE_SIZE: PageSizes.A7,
};

module.exports = constants;