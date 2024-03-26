/**
 * Abstract class Section
 *
 * @class Section
 */

class Section {

    requiresBook() {
        throw new Error("Method 'requiresBook' is not implemented for 'Section' abstract class");
    }

    constructor() {
        if (this.constructor === Section) {
            throw new Error("Abstract class 'Section' may not be instantiated");
        }
    }

    signature() {
        throw new Error("Method 'signature' is not implemented for 'Section' abstract class");
    }

    doSection() {
        throw new Error("Method 'doSection' is not implemented for 'Section' abstract class");
    }

    formatSectionJson() {
        throw new Error("Method 'formatSectionJson' is not implemented for 'Section' abstract class");
    }

}

module.exports = Section;
