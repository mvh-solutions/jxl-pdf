const {
    pkWithDocs,
    getBookName,
    getCVTexts,
    cleanNoteLine,
    bcvNotes,
    doPuppet,
    setupOneCSS,
    checkCssSubstitution
} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const Section = require('./section');

class biblePlusNotesSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "biblePlusNotes",
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
                {
                    id: "scriptureText",
                    label: {
                        en: "Scripture Text Label",
                        "fr": "Etiquette pour texte biblique"
                    },
                    typeName: "string",
                    nValues: [1, 1]
                },
                {
                    id: "scriptureSrc",
                    label: {
                        en: "Scripture Text Source",
                        "fr": "Source pour texte biblique"
                    },
                    typeName: "translationText",
                    nValues: [1, 1]
                },
                {
                    id: "scriptureType",
                    label: {
                        en: "Scripture Text Type",
                        "fr": "Type de texte biblique"
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
    }

    async doSection({section, templates, manifest, options}) {
        const pk = pkWithDocs(section.bcvRange, [{id: "xxx_yyy", path: section.content.scriptureSrc}], options.verbose);
        const bookName = getBookName(pk, "xxx_yyy", section.bcvRange);
        const cvTexts = getCVTexts(section.bcvRange, pk);
        const notes = bcvNotes(section.content.notes, section.bcvRange);
        const verses = [
            `<h1>${bookName}</h1>`
        ];
        const qualified_id = `${section.id}_${section.bcvRange}`;
        for (const cvRecord of cvTexts) {
            const verseHtml = templates['bible_plus_notes_verse']
                .replace("%%TRANS1TITLE%%", section.content.scriptureText)
                .replace("%%TRANS2TITLE%%", section.content.scriptureText)
                .replace(
                    '%%LEFTCOLUMN%%',
                    `<div class="col1"><span class="cv">${cvRecord.cv}</span> ${cvRecord.texts["xxx_yyy"] || "-"}</div>`
                )
                .replace(
                    '%%RIGHTCOLUMN%%',
                    `<div class="col2">${(notes[cvRecord.cv] || [])
                        .map(nr => cleanNoteLine(nr))
                        .map(note => `<p class="note">${note}</p>`)
                        .join('\n')}</div>`
                );
            verses.push(verseHtml);
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id}.html`),
            templates['bible_plus_notes_page']
                .replace(
                    "%%TITLE%%",
                    `${qualified_id} - ${section.type}`
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
        const cssPath = path.join(options.workingDir, "html", "resources", "bible_plus_notes_page_styles.css");
        let css = fse.readFileSync(cssPath).toString();
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        for (const [placeholder, values] of options.pageFormat.sections.biblePlusNotes.cssValues) {
            css = setupOneCSS(css, placeholder, "%", values[0]);
        }
        checkCssSubstitution("bible_plus_notes_page_styles.css", css, "%");
        fse.writeFileSync(cssPath, css);
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${qualified_id}.html`),
            pdfPath: path.join(options.pdfPath, `${qualified_id}.pdf`)
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

module.exports = biblePlusNotesSection;
