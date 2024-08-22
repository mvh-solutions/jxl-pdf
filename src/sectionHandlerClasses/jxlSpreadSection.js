const fse = require("fs-extra");
const path = require("path");
const {
    pkWithDocs,
    getBookName,
    cvForSentence,
    maybeChapterNotes,
    quoteForCv,
    getGreekContent,
    trimLhsText,
    cleanNoteLine,
    doPuppet
} = require("../helpers");
const books = require("../../resources/books.json");
const Section = require('./section');

class jxlSpreadSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "jxlSpread",
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
                    id: "jxl",
                    label: {
                        en: "Juxta Source",
                        fr: "Source pour Juxta"
                    },
                    typeName: "juxta",
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
                    id: "notesPivot",
                    label: {
                        en: "Notes pivot table",
                        fr: "Tableau croisé pour notes"
                    },
                    typeName: "tNotes",
                    nValues: [0, 1]
                },
/*                {
                    id: "firstSentence",
                    label: {
                        en: "First Sentence Number",
                        fr: "N° de première phrase"
                    },
                    typeName: "integer",
                    nValues: [0, 1]
                },
                {
                    id: "lastSentence",
                    label: {
                        en: "Last Sentence Number",
                        fr: "N° de dernière phrase"
                    },
                    typeName: "integer",
                    nValues: [0, 1]
                },
 */
                {
                    id: "lhs",
                    label: {
                        en: "Scripture Texts",
                        fr: "Textes bibliques"
                    },
                    nValues: [1, 5],
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
        const jsonFile = fse.readJsonSync(path.resolve(path.join(section.content.jxl, section.bcvRange + ".json")));
        const jxlJson = jsonFile.bookCode ? jsonFile.sentences : jsonFile;
        let pivotIds = new Set([]);
        const notes = {};
        const notePivot = {};
        if (section.content.notes && section.content.notesPivot) {
            const pivotRows = fse.readFileSync(path.join(section.content.notesPivot, `${section.bcvRange}.tsv`)).toString().split("\n");
            for (const pivotRow of pivotRows) {
                const cells = pivotRow.split("\t");
                if (!cells[4] || cells[4].length === 0) {
                    continue;
                }
                if (!notePivot[cells[0]]) {
                    notePivot[cells[0]] = {};
                }
                const noteIds = cells[4].split(";").map(n => n.trim());
                notePivot[cells[0]][cells[1]] = noteIds;
                for (const noteId of noteIds) {
                    pivotIds.add(noteId);
                }
            }
            const notesRows = fse.readFileSync(path.join(section.content.notes, `${section.bcvRange}.tsv`)).toString().split("\n");
            for (const notesRow of notesRows) {
                const cells = notesRow.split('\t');
                if (pivotIds.has(cells[4])) {
                    notes[cells[4]] = cells[6];
                }
            }
        }
        const docSpecs = [];
        let scriptureN = 0;
        for (const scripture of section.content.lhs) {
            docSpecs.push({
                id: `xxx_yyy${scriptureN}`,
                path: scripture.src,
                type: scripture.type,
                text: scripture.text
            });
            scriptureN++;
        }
        const pk = pkWithDocs(section.bcvRange, docSpecs, options.verbose);
        const bookName = getBookName(pk, "xxx_yyy0", section.bcvRange);
        let sentences = [];
        let chapterN = 0;
        options.verbose && console.log(`       Sentences`);
        const qualified_id = `${section.id}_${section.bcvRange}`;
        for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
            if (section.firstSentence && (sentenceN + 1) < section.firstSentence) {
                continue;
            }
            if (section.lastSentence && (sentenceN + 1) > section.lastSentence) {
                continue;
            }
            const cv = cvForSentence(sentenceJson);
            const newChapterN = cv.split(':')[0];
            if (chapterN !== newChapterN) {
                sentences.push(maybeChapterNotes(newChapterN, 'chapter', notes, templates, options.verbose));
                chapterN = newChapterN;
            }
            options.verbose && console.log(`         ${sentenceN + 1}`);
            let leftContent = [];
            let greekContent = null;
            for (const content of docSpecs) {
                const cvRecord = quoteForCv(pk, content, section.bcvRange, cv);
                if (cvRecord.type === "greek") {
                    greekContent = getGreekContent(sentenceJson.chunks);
                }
            }
            let first = true;
            for (const content of docSpecs) {
                const cvRecord = quoteForCv(pk, content, section.bcvRange, cv);
                let lhsText = sentenceJson.sourceString;
                if (sentenceJson.forceTrans && cvRecord.type !== "greek") {
                    lhsText = sentenceJson.forceTrans[content.id];
                } else if (cvRecord.type !== "greek") {
                    lhsText = trimLhsText(cvRecord, greekContent);
                }
                let sentence = templates[`${first ? "first" : "other"}Left`]
                    .replace('%%LANGCLASS%%', cvRecord.type === "greek" ? "greekLeft" : "transLeft")
                    .replace('%%LABEL%%', content.text)
                    .replace('%%CONTENT%%', lhsText);
                leftContent.push(sentence);
                first = false;
            }
            let jxlRows = [];
            let sentenceNotes = [];
            for (const [chunkN, chunk] of sentenceJson.chunks.entries()) {
                const source = chunk.source.map(s => s.content).join(' ');
                const gloss = chunk.gloss;
                let noteFound = false;
                if (notePivot[`${sentenceN + 1}`] && notePivot[`${sentenceN + 1}`][`${chunkN + 1}`]) {
                    noteFound = true;
                    for (const noteId of notePivot[`${sentenceN + 1}`][`${chunkN + 1}`]) {
                        if (!notes[noteId]) {
                            continue;
                        }
                        sentenceNotes.push(
                            cleanNoteLine(notes[noteId])
                        );
                    }
                }
                const bookTestament = books[section.bcvRange];
                const row = templates.jxlRow
                    .replace('%%SOURCE%%', source)
                    .replace('%%SOURCECLASS%%', bookTestament === "OT" ? "jxlHebrew" : "jxlGreek")
                    .replace('%%GLOSS%%', gloss.replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`))
                    .replace('%%NOTECALLERS%%', (noteFound ? `${sentenceNotes.map(note => `<p class="note">${note}</p>`).join('')}` : ""));
                jxlRows.push(row);
                sentenceNotes = [];
            }
            const jxl = templates.jxl
                .replace('%%ROWS%%', jxlRows.join('\n'));
            const sentence = templates.sentence
                .replace('%%SENTENCEN%%', sentenceN + 1)
                .replace('%%NSENTENCES%%', jxlJson.length)
                .replace('%%BOOKNAME%%', bookName)
                .replace('%%SENTENCEREF%%', cv)
                .replace('%%LEFTCONTENT%%', leftContent.join('\n'))
                .replace('%%JXL%%', jxl)
                .replace(
                    '%%NOTES%%',
                    sentenceNotes.length === 0 ?
                        "" :
                        ``);
            sentences.push(sentence);
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id}.html`),
            templates['juxta_page']
                .replace('%%TITLE%%', `${section.id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`)
                .replace('%%SENTENCES%%', sentences.join(''))
        );
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
            makeFromDouble: true
        });
    }
}

module.exports = jxlSpreadSection;
