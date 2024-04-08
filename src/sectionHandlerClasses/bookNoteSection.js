const fse = require("fs-extra");
const path = require("path");
const {maybeChapterNotes, doPuppet} = require("../helpers");
const Section = require('./section');

class bookNoteSection extends Section {

    requiresBook() {
        return true;
    }

    signature() {
        return {
            sectionType: "bookNote",
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

    async doSection({section, templates, bookCode, options}) {
        const notes = {};
        const notesRows = fse.readFileSync(path.join('data', options.configContent.notes, `${bookCode}.tsv`)).toString().split("\n");
        for (const notesRow of notesRows) {
            const cells = notesRow.split('\t');
            if (cells[1] === "front" && cells[2] === "intro") {
                const noteKey = `${cells[1]}_${cells[2]}`;
                notes[noteKey] = cells[6];
            }
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            templates['non_juxta_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
                    maybeChapterNotes("front", "book", notes, templates, options.verbose)
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = bookNoteSection;
