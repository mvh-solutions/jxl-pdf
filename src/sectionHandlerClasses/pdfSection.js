const fse = require("fs-extra");
const path = require("path");
const {resolvePath} = require("../helpers");
const Section = require('./section');

class pdfSection extends Section {

    requiresWrapper() {
        return [];
    }

    signature() {
        return {
            sectionType: "front",
            requiresWrapper: this.requiresWrapper(),
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
                    id: "pdf",
                    label: {
                        en: "External PDF Source",
                        fr: "Source pour PDF externe"
                    },
                    typeName: "pdf",
                    nValues: [1, 1]
                },
            ]
        }
    }

    async doSection({section, templates, manifest, options}) {
        const pdfContent = fse.readFileSync(resolvePath(section.content.pdf));
        fse.writeFileSync(
            path.join(options.pdfPath, `${section.id}.pdf`),
            pdfContent
        );
        section.doPdfCallback && section.doPdfCallback({
            type: "pdfImport",
            level: 3,
            msg: `Importing PDF ${path.join(options.pdfPath, `${section.id}.pdf}`)}'`,
            args: [`${path.join(options.pdfPath, `${section.id}.pdf`)}`]
        });
        manifest.push({
            id: `${section.id}`,
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: false
        });
    }
}
module.exports = pdfSection;
