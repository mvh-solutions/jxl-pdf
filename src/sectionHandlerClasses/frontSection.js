const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
const Section = require('./section');

class frontSection extends Section {

    async doSection({section, templates, bookCode, options}) {
        fse.writeFileSync(
            path.join(
                options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            templates['non_juxta_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
                    fse.readFileSync(path.resolve(path.join('data', `${section.path}.html`))).toString()
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}
module.exports = frontSection;
