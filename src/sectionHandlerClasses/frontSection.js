const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
const Section = require('./section');

class frontSection extends Section {

    requiresBook() {
        return false;
    }

    signature() {
        return {
            sectionType: "front",
            requiresBook: true,
            fields: [
                {
                    id: "startOn",
                    label: {
                        en: "Start Page Side",
                        fr: "Côté pour première page"
                    },
                    typeEnum: [
                        {
                            id: "recto",
                            label: {
                                en: "Recto",
                                fr: "Recto"
                            },
                        },
                        {
                            id: "verso",
                            label: {
                                en: "Verso",
                                fr: "Verso"
                            },
                        },
                        {
                            id: "either",
                            label: {
                                en: "Next Page",
                                fr: "Page suivante"
                            },
                        }
                    ],
                    nValues: [1, 1]
                },
                {
                    id: "showPageNumber",
                    label: {
                        en: "Show Page Number",
                        fr: "Afficher numéro de page"
                    },
                    typeName: "boolean",
                    nValues: [1, 1]
                },
                {
                    id: "html",
                    label: {
                        en: "HTML Source",
                        fr: "Source pour HTML"
                    },
                    typeName: "html",
                    nValues: [1, 1]
                },
            ]
        }
    }

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
