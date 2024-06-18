const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, doPuppet, bcvNotes} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");

const Section = require('./section');

class fourColumnSpreadSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "4ColumnSpread",
            requiresWrapper: this.requiresWrapper(),
            fields: [
                {
                    id: "startOn",
                    label: {
                        en: "Start Page Side",
                        fr: "Côté pour première page"
                    },
                    typeLiteral: "verso",
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
                {
                    id: "scripture",
                    label: {
                        en: "Scripture Texts",
                        fr: "Textes bibliques"
                    },
                    nValues: [4, 4],
                    typeSpec: [
                        {
                            id: "text",
                            label: {
                                en: "Scripture # Text Label",
                                "fr": "Etiquette pour texte biblique #"
                            },
                            typeName: "string",
                            nValues: [1, 1]
                        },
                        {
                            id: "src",
                            label: {
                                en: "Source # Text Source",
                                "fr": "Source pour texte biblique #"
                            },
                            typeName: "translationText",
                            nValues: [1, 1]
                        },
                        {
                            id: "type",
                            label: {
                                en: "Scripture # Text Type",
                                "fr": "Type de texte biblique #"
                            },
                            typeEnum: [
                                {
                                    id: "greek",
                                    label: {
                                        en: "Greek",
                                        fr: "Grec"
                                    },
                                },
                                {
                                    id: "hebrew",
                                    label: {
                                        en: "Hebrew",
                                        fr: "Hébreu"
                                    },
                                },
                                {
                                    id: "translation",
                                    label: {
                                        en: "Translation",
                                        fr: "Traduction"
                                    },
                                }
                            ],
                            nValues: [1, 1]
                        },
                    ]
                }
            ]
        };
    }

    async doSection({section, templates, bookCode, options}) {
        const pk = pkWithDocs(bookCode, section.texts, options.verbose);
        const bookName = getBookName(pk, options.configContent.docIdForNames, bookCode);
        const cvTexts = getCVTexts(bookCode, pk);
        const notes = section.showNotes ? bcvNotes(options.configContent, bookCode) : {};
        const verses = [];
        verses.push(templates['4_column_spread_title'].replace('%%BOOKNAME%%', bookName));
        const headerHtml = templates['4_column_header_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
            )
            .replace(/%%TRANS1TITLE%%/g, section.texts[0].label)
            .replace(/%%TRANS2TITLE%%/g, section.texts[1].label)
            .replace(/%%TRANS3TITLE%%/g, section.texts[2].label)
            .replace(/%%TRANS4TITLE%%/g, section.texts[3].label);
        fse.writeFileSync(
            path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.html`),
            headerHtml
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.pdf`)
        });
        verses.push(`
<section class="columnHeadings">
    <section class="versoPage">
        <h2 class="verseRecordHeadLeft"><span style="float: left">${section.texts[0].label}</span>&nbsp;<span style="float: right">${section.texts[1].label}</span></h2>
    </section>
    <section class="rectoPage">
        <h2 class="verseRecordHeadRight"><span style="float: left">${section.texts[2].label}</span>&nbsp;<span style="float: right">${section.texts[3].label}</span></h2>
    </section>
</section>
`);
        for (const cvRecord of cvTexts) {
            const verseHtml = templates['4_column_spread_verse']
                .replace(
                    '%%VERSOCOLUMNS%%',
                    `<div class="col1"><span class="cv">${cvRecord.cv.endsWith(":1") ? `${bookName}&nbsp;` : ""}${cvRecord.cv}</span> ${cvRecord.texts[section.texts[0].id] || "-"}</div><div class="col2">${cvRecord.texts[section.texts[1].id] || "-"}</div>`
                )
                .replace(
                    '%%RECTOCOLUMNS%%',
                    `<div class="col3">${cvRecord.texts[section.texts[2].id] || "-"}</div><div class="col4">${cvRecord.texts[section.texts[3].id] || "-"}${(notes[cvRecord.cv] || [])
                        .map(nr => cleanNoteLine(nr))
                        .map(note => `<p class="note">${note}</p>`)
                        .join('\n')}</div>`
                );
            verses.push(verseHtml);
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            templates['4_column_spread_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%VERSES%%",
                    verses.join('\n')
                )
                .replace(
                    "%%BOOKNAME%%",
                    bookName
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = fourColumnSpreadSection;
