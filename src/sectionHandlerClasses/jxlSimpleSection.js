const fse = require("fs-extra");
const path = require("path");
const {
    cvForSentence,
    maybeChapterNotes,
    cleanNoteLine,
    doPuppet
} = require("../helpers");
const books = require("../../resources/books.json");
const Section = require('./section');

class jxlSimpleSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "jxlSimple",
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
                    id: "jxl",
                    label: {
                        en: "Juxta Source",
                        fr: "Source pour Juxta"
                    },
                    typeName: "juxta",
                    nValues: [1, 1]
                },
                {
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
            ]
        }
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

        const bookName = section.bcvRange;
        let sentences = [];
        const qualified_id = `${section.id}_${section.bcvRange}`;
        options.verbose && console.log(`       Sentences`);
        let jxls = [];
        let cvs = [];
        for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
            if (section.content.firstSentence && (sentenceN + 1) < section.content.firstSentence) {
                continue;
            }
            if (section.content.lastSentence && (sentenceN + 1) > section.content.lastSentence) {
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
                const sentence = templates.simple_juxta_sentence
                    .replace('%%BOOKNAME%%', bookName)
                    .replace('%%SENTENCEREF%%', cvRef)
                    .replace('%%JXL%%', jxls.join("\n"))
                    .replace(
                        '%%NOTES%%',
                        sentenceNotes.length === 0 ?
                            "" :
                            ``);
                sentences.push(sentence);
                jxls = [];
                cvs = [];
            }
        }
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id}.html`),
            templates['simple_juxta_page']
                .replace('%%TITLE%%', `${section.id.replace('%%bookCode%%', section.bcvRange)} - ${section.type}`)
                .replace('%%SENTENCES%%', sentences.join(''))
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${qualified_id}.html`),
            pdfPath: path.join(options.pdfPath, `${qualified_id}.pdf`)
        });
        manifest.push({
            id: qualified_id,
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: false
        });
    }
}

module.exports = jxlSimpleSection;
