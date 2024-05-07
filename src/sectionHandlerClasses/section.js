/**
 * Abstract class Section
 *
 * @class Section
 */

class Section {

    requiresWrapper() {
        throw new Error("Method 'requiresWrapper' is not implemented for 'Section' abstract class");
    }

    constructor() {
        if (this.constructor === Section) {
            throw new Error("Abstract class 'Section' may not be instantiated");
        }
    }

    signature() {
        return {};
    }

    doSection() {
        throw new Error("Method 'doSection' is not implemented for 'Section' abstract class");
    }

    formatSectionJson(values) {
        console.log(JSON.stringify(values, null, 2));
    }

}

module.exports = Section;
