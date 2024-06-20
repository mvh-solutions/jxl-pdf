const fse = require("fs-extra");
const path = require("path");
const {formatNote, doPuppet, bcvNotes} = require("../helpers");
const Section = require('./section');

class bookNoteSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "bookNote",
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
                    id: "notes",
                    label: {
                        en: "Notes Source",
                        fr: "Source pour notes"
                    },
                    typeName: "tNotes",
                    nValues: [0, 1]
                },
            ]
        }
    }

    async doSection({section, templates, manifest, options}) {
        const notes = section.content.notes ? bcvNotes(section.content.notes, section.bcvRange) : {};
        const introNotes = notes["front:intro"] ? notes["front:intro"].join('\n\n'): "";
        const [title, body] = formatNote(introNotes, templates);
        fse.writeFileSync(
            path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}.html`),
            templates['non_juxta_page']
                .replace(
                    "%%TITLE%%",
                    title
                )
                .replace(
                    "%%BODY%%",
                    `<h1>${title}</h1>\n\n${body}`
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}.pdf`)
        });
        manifest.push({
            id: section.id.replace('%%bookCode%%', section.bcvRange),
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: false
        });

    }
}

module.exports = bookNoteSection;
