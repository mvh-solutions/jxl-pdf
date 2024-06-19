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

    async doSection({section, templates, manifest, options}) {
        const docSpecs = [];
        let scriptureN = 0;
        for (const scripture of section.content.scripture) {
            docSpecs.push({id: `xxx_yyy${scriptureN}`, path: scripture.src});
            scriptureN++;
        }
        const pk = pkWithDocs(
            section.bcvRange,
            docSpecs,
            options.verbose
        );
        const bookName = getBookName(pk, "xxx_yyy0", section.bcvRange);
        const cvTexts = getCVTexts(section.bcvRange, pk);
        const notes = section.showNotes ? bcvNotes(options.configContent, section.bcvRange) : {};
        const verses = [];
        verses.push(templates['4_column_spread_title'].replace('%%BOOKNAME%%', bookName));
        const headerHtml = templates['4_column_header_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`
            )
            .replace(/%%TRANS1TITLE%%/g, section.content.scripture[0].text)
            .replace(/%%TRANS2TITLE%%/g, section.content.scripture[1].text)
            .replace(/%%TRANS3TITLE%%/g, section.content.scripture[2].text)
            .replace(/%%TRANS4TITLE%%/g, section.content.scripture[3].text)
        fse.writeFileSync(
            path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}_superimpose.html`),
            headerHtml
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}_superimpose.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', section.bcvRange)}_superimpose.pdf`)
        });
        verses.push(`
<section class="columnHeadings">
    <section class="versoPage">
        <h2 class="verseRecordHeadLeft"><span style="float: left">${section.content.scripture[0].text}</span>&nbsp;<span style="float: right">${section.content.scripture[1].text}</span></h2>
    </section>
    <section class="rectoPage">
        <h2 class="verseRecordHeadRight"><span style="float: left">${section.content.scripture[2].text}</span>&nbsp;<span style="float: right">${section.content.scripture[3].text}</span></h2>
    </section>
</section>
`);
        for (const cvRecord of cvTexts) {
            const verseHtml = templates['4_column_spread_verse']
                .replace(
                    '%%VERSOCOLUMNS%%',
                    `<div class="col1"><span class="cv">${cvRecord.cv.endsWith(":1") ? `${bookName}&nbsp;` : ""}${cvRecord.cv}</span> ${cvRecord.texts["xxx_yyy0"] || "-"}</div><div class="col2">${cvRecord.texts["xxx_yyy1"] || "-"}</div>`
                )
                .replace(
                    '%%RECTOCOLUMNS%%',
                    `<div class="col3">${cvRecord.texts["xxx_yyy2"] || "-"}</div><div class="col4">${cvRecord.texts["xxx_yyy3"] || "-"}${(notes[cvRecord.cv] || [])
                        .map(nr => cleanNoteLine(nr))
                        .map(note => `<p class="note">${note}</p>`)
                        .join('\n')}</div>`
                );
            verses.push(verseHtml);
        }
        const qualified_id = `${section.id}_${section.bcvRange}`;
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id.replace('%%bookCode%%', section.bcvRange)}.html`),
            templates['4_column_spread_page']
                .replace(
                    "%%TITLE%%",
                    `${qualified_id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`
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
            htmlPath: path.join(options.htmlPath, `${qualified_id.replace('%%bookCode%%', section.bcvRange)}.html`),
            pdfPath: path.join(options.pdfPath, `${qualified_id.replace('%%bookCode%%', section.bcvRange)}.pdf`)
        });
        manifest.push({
            id: `${qualified_id}`,
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: true
        });
    }
}

module.exports = fourColumnSpreadSection;
