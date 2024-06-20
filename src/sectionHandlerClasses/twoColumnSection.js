const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const Section = require('./section');

class TwoColumnSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "2Column",
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
                    nValues: [2, 2],
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

    async doSection ({section, templates, manifest, options}) {
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
        verses.push(templates['2_column_title'].replace('%%BOOKNAME%%', bookName));
        const qualified_id = `${section.id}_${section.bcvRange}`;
        const headerHtml = templates['2_column_header_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`
            )
            .replace(/%%TRANS1TITLE%%/g, section.content.scripture[0].text)
            .replace(/%%TRANS2TITLE%%/g, section.content.scripture[1].text);
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
    <section class="leftColumn">
        <h2 class="verseRecordHeadLeft">${section.content.scripture[0].text}</h2>
    </section>
    <section class="rightColumn">
        <h2 class="verseRecordHeadRight">${section.content.scripture[1].text}</h2>
    </section>
</section>
`);
        for (const cvRecord of cvTexts) {
            const verseHtml = templates['2_column_verse']
                .replace("%%TRANS1TITLE%%", section.content.scripture[0].text)
                .replace("%%TRANS2TITLE%%", section.content.scripture[1].text)
                .replace(
                    '%%LEFTCOLUMN%%',
                    `<div class="col1"><span class="cv">${cvRecord.cv}</span> ${cvRecord.texts["xxx_yyy0"] || "-"}</div>`
                )
                .replace(
                    '%%RIGHTCOLUMN%%',
                    `<div class="col2">${cvRecord.texts["xxx_yyy1"] || "-"}${(notes[cvRecord.cv] || [])
                        .map(nr => cleanNoteLine(nr))
                        .map(note => `<p class="note">${note}</p>`)
                        .join('\n')}</div>`
                );
            verses.push(verseHtml);
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id.replace('%%bookCode%%', section.bcvRange)}.html`),
            templates['2_column_page']
                .replace(
                    "%%TITLE%%",
                    `${qualified_id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
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
            makeFromDouble: false
        });
    }

}

module.exports = TwoColumnSection;
