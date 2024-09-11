const {
    unpackCellRange,
    pkWithDocs,
    getBookName,
    getCVTexts,
    cleanNoteLine,
    bcvNotes,
    doPuppet,
    setupOneCSS,
    checkCssSubstitution,
    resolvePath,
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
                    nValues: [1, 1],
                    suggestedDefault: "recto"
                },
                {
                    id: "showPageNumber",
                    label: {
                        en: "Show Page Number",
                        fr: "Afficher numéro de page"
                    },
                    typeName: "boolean",
                    nValues: [1, 1],
                    suggestedDefault: true
                },
                {
                    id: "notes",
                    label: {
                        en: "Notes Source",
                        fr: "Source pour notes"
                    },
                    typeName: "tNotes",
                    nValues: [1, 1]
                },
                {
                    id: "notesUnit",
                    label: {
                        en: "Notes grouped by",
                        "fr": "Notes regroupées par"
                    },
                    typeEnum: [
                        {
                            id: "verse",
                            label: {
                                en: "verse",
                                fr: "verset"
                            },
                        },
                        {
                            id: "sentence",
                            label: {
                                en: "sentence",
                                fr: "phrase"
                            },
                        },
                    ],
                    nValues: [0, 1],
                    suggestedDefault: "verse"
                },
                {
                    id: "notesPosition",
                    label: {
                        en: "Notes position",
                        "fr": "Position des notes"
                    },
                    typeEnum: [
                        {
                            id: "columns",
                            label: {
                                en: "column",
                                fr: "colonne"
                            },
                        },
                        {
                            id: "rows",
                            label: {
                                en: "row",
                                fr: "rangé"
                            },
                        },
                    ],
                    nValues: [0, 1],
                    suggestedDefault: "rows"
                },
                {
                    id: "notesWidth",
                    label: {
                        en: "% width of notes",
                        fr: "% largeur des notes"
                    },
                    typeName: "number",
                    maxValue: 80,
                    minValue: 20,
                    nValues: [0, 1],
                    suggestedDefault: 50
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
                    nValues: [1, 1],
                    suggestedDefault: "translation"
                },
            ]
        }
    }

    async doSection({section, templates, manifest, options}) {

        const cvBySentence = (cvTexts, endSentenceRegex) => {

            const emptyRecord = () => (
                {
                    textBits: [],
                    text: "",
                    cvBits: [],
                    cv: ""
                }
            );

            const completedRecord = rec => {
                const printCv = `${rec.cvBits[0]}${rec.cvBits.length > 1 ? `-${rec.cvBits[rec.cvBits.length - 1].split(':')[1]}` : ""}`;
                rec.cv = printCv;
                rec.text = rec.textBits.join(" ");
                delete rec.textBits;
                return rec;
            };

            const ret = [];
            let retRecord = emptyRecord();
            for (const verseOb of cvTexts) {
                retRecord.textBits.push(verseOb.texts.xxx_yyy);
                for (const cvBit of unpackCellRange(verseOb.cv)) {
                    retRecord.cvBits.push(cvBit);
                }
                const isEnd = endSentenceRegex.test(verseOb.texts.xxx_yyy);
                if (isEnd) {
                    ret.push(completedRecord(retRecord));
                    retRecord = emptyRecord();
                }
            }
            if (retRecord.textBits.length > 0) {
                ret.push(completedRecord(retRecord));
            }
            return ret;
        }
        section.content.notesUnit = section.content.notesUnit || "verse";
        section.content.notesPosition = section.content.notesPosition || "columns";
        section.content.notesWidth = section.content.notesWidth || 70;
        const pk = pkWithDocs(section.bcvRange, [{id: "xxx_yyy", path: resolvePath(section.content.scriptureSrc)}], options.verbose);
        const bookName = getBookName(pk, "xxx_yyy", section.bcvRange);
        const notes = bcvNotes(resolvePath(section.content.notes), section.bcvRange, []);
        const cvTexts = getCVTexts(section.bcvRange, pk);
        const verses = [
            `<h1>${bookName}</h1>`
        ];
        const qualified_id = `${section.id}_${section.bcvRange}`;
        const seenCvs = new Set([]);
        if (section.content.notesUnit === "verse") {
            for (const cvRecord of cvTexts) {
                if (seenCvs.has(cvRecord.cv)) {
                    continue;
                } else {
                    seenCvs.add(cvRecord.cv);
                }
                const cvNotes = unpackCellRange(cvRecord.cv).map(cv => notes[cv] || []);
                const verseHtml = templates[`bible_plus_notes_${section.content.notesPosition}`]
                    .replace("%%TRANS1TITLE%%", section.content.scriptureText)
                    .replace("%%TRANS2TITLE%%", section.content.scriptureText)
                    .replace("%%SCRIPTUREWIDTH%%", 100 - section.content.notesWidth)
                    .replace("%%NOTEWIDTH%%", section.content.notesWidth)
                    .replace(
                        '%%LEFTCOLUMN%%',
                        `<div class="col1"><span class="cv">${cvRecord.cv}</span> ${cvRecord.texts["xxx_yyy"] || "-"}</div>`
                    )
                    .replace(
                        '%%RIGHTCOLUMN%%',
                        cvNotes.length > 0 ?
                        `<div class="col2">${cvNotes.reduce((a, b) => [...a, ...b])
                            .map(nr => cleanNoteLine(nr))
                            .map(note => `<p class="note">${note}</p>`)
                            .join('\n')}</div>`:
                        ""
                    );
                verses.push(verseHtml);
            }
        } else {
            const sentenceTexts = cvBySentence(cvTexts, RegExp(/[.?!]\s*(['"”’»)]\s*)*$/));
            for (const sentenceRecord of sentenceTexts) {
                if (seenCvs.has(sentenceRecord.cv)) {
                    continue;
                } else {
                    seenCvs.add(sentenceRecord.cv);
                }
                const verseHtml = templates[`bible_plus_notes_${section.content.notesPosition}`]
                    .replace("%%TRANS1TITLE%%", section.content.scriptureText)
                    .replace("%%TRANS2TITLE%%", section.content.scriptureText)
                    .replace("%%SCRIPTUREWIDTH%%", 100 - section.content.notesWidth)
                    .replace("%%NOTEWIDTH%%", section.content.notesWidth)
                    .replace(
                        '%%LEFTCOLUMN%%',
                        `<div class="col1"><span class="cv">${sentenceRecord.cv}</span> ${sentenceRecord.text || "-"}</div>`
                    )
                    .replace(
                        '%%RIGHTCOLUMN%%',
                        `<div class="col2">${sentenceRecord.cvBits.map(cv => notes[cv] || []).reduce((a, b) => [...a, ...b])
                            .map(nr => cleanNoteLine(nr))
                            .map(note => `<p class="note">${note}</p>`)
                            .join('\n')}</div>`
                    );
                verses.push(verseHtml);
            }
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id}.html`),
            (section.content.notesPosition === "columns" ? templates['bible_plus_notes_in_columns_page'] : templates['bible_plus_notes_in_rows_page'])
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
        const cssPath = path.join(
            options.workingDir,
            "html",
            "resources",
            "bible_plus_notes_in_columns_page_styles.css"
        );
        let css = fse.readFileSync(cssPath).toString();
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        checkCssSubstitution("bible_plus_notes_in_columns_page_styles.css", css, "%");
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
