const fse = require("fs-extra");
const path = require("path");
const {
    pkWithDocs,
    getBookName,
    cvForSentence,
    quoteForCv,
    tidyLhsText,
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
        const mergeCvs = (cvs) => {
            const chapter = cvs[0]
                .split(":")[0];
            const firstCvFirstV = cvs[0]
                .split(":")[1]
                .split('-')[0];
            const lastCvLastV = cvs.reverse()[0]
                .split(":")[1]
                .split('-').reverse()[0];
            return `${chapter}:${firstCvFirstV}${firstCvFirstV === lastCvLastV ? "" : `-${lastCvLastV}`}`;
        }
        const jxlJson = jsonFile.bookCode ? jsonFile.sentences : jsonFile;
        const sentenceMerges = []; // True means "merge with next sentence"
        let sentenceN = 0;
        for (const sentence of jxlJson) {
            let sentenceLastV = cvForSentence(sentence)
                .split(":")[1]
                .split('-')
                .reverse()[0];
            let nextSentenceFirstV = (sentenceN + 1) === jxlJson.length ?
                999 :
                cvForSentence(jxlJson[sentenceN + 1])
                    .split(":")[1]
                    .split('-')[0];
            sentenceMerges.push(sentenceLastV === nextSentenceFirstV);
            sentenceN++;
        }
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
        options.verbose && console.log(`       Sentences`);
        const qualified_id = `${section.id}_${section.bcvRange}`;
        let jxls = [];
        let cvs = [];
        let sentenceNs = [];
        for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
            if (section.firstSentence && (sentenceN + 1) < section.firstSentence) {
                continue;
            }
            if (section.lastSentence && (sentenceN + 1) > section.lastSentence) {
                continue;
            }
            cvs.push(cvForSentence(sentenceJson));
            options.verbose && console.log(`         ${sentenceN + 1}`);
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
            jxls.push(templates.jxl
                .replace('%%ROWS%%', jxlRows.join('\n'))
            );
            if (!sentenceMerges[sentenceN]) {
                const cvRef = mergeCvs(cvs);
                let leftContent = [];
                let first = true;
                for (const content of docSpecs) {
                    const cvRecord = quoteForCv(pk, content, section.bcvRange, cvRef);
                    let lhsText = sentenceJson.sourceString;
                    lhsText = tidyLhsText(cvRecord);
                    let sentence = templates[`${first ? "first" : "other"}Left`]
                        .replace('%%LANGCLASS%%', cvRecord.type === "greek" ? "greekLeft" : "transLeft")
                        .replace('%%LABEL%%', content.text)
                        .replace('%%CONTENT%%', lhsText);
                    leftContent.push(sentence);
                    first = false;
                }                const sentence = templates.sentence
                    .replace(/%%BOOKNAME%%/g, bookName)
                    .replace(/%%SENTENCEREF%%/g, cvRef)
                    .replace('%%LEFTCONTENT%%', leftContent.join('\n'))
                    .replace('%%JXL%%', jxls.join("\n"))
                    .replace(
                        '%%NOTES%%',
                        sentenceNotes.length === 0 ?
                            "" :
                            ``);
                sentences.push(sentence);
                jxls = [];
                cvs = [];
                sentenceNs = [];            }
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
