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

const doJxlSpreadSection = async ({section, config, bookCode, outputDirName, outputPath, templates}) => {
    const jxlJson = fse.readJsonSync(path.resolve(path.join('data', section.jxl.path, `${bookCode}.json`)));
    let pivotIds = new Set([]);
    const notes = {};
    const notePivot = {};
    if (section.jxl.notes && section.jxl.notes.pivot) {
        const pivotRows = fse.readFileSync(path.join('data', section.jxl.notes.pivot, `${bookCode}.tsv`)).toString().split("\n");
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
        const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
        for (const notesRow of notesRows) {
            const cells = notesRow.split('\t');
            if (pivotIds.has(cells[4])) {
                notes[cells[4]] = cells[6];
            }
        }
    }

    const pk = pkWithDocs(bookCode, section.lhs);
    const bookName = getBookName(pk, config.docIdForNames, bookCode);
    let sentences = [];
    let chapterN = 0;
    console.log(`       Sentences`);
    for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
        if (section.firstSentence && (sentenceN+1) < section.firstSentence) {
            continue;
        }
        if (section.lastSentence && (sentenceN+1) > section.lastSentence) {
            continue;
        }
        const cv = cvForSentence(sentenceJson);
        const newChapterN = cv.split(':')[0];
        if (chapterN !== newChapterN) {
            sentences.push(maybeChapterNotes(newChapterN, 'chapter', notes, templates));
            chapterN = newChapterN;
        }
        console.log(`         ${sentenceN + 1}`);
        let leftContent = [];
        let greekContent = null;
        for (const content of section.lhs) {
            const cvRecord = quoteForCv(pk, content, bookCode, cv);
            if (cvRecord.type === "greek") {
                greekContent = getGreekContent(sentenceJson.chunks);
            }
        }
        let first = true;
        for (const content of section.lhs) {
            const cvRecord = quoteForCv(pk, content, bookCode, cv);
            let lhsText = sentenceJson.sourceString;
            if (sentenceJson.forceTrans && cvRecord.type !== "greek") {
                lhsText = sentenceJson.forceTrans[content.id];
            } else if (cvRecord.type !== "greek") {
                lhsText = trimLhsText(cvRecord, greekContent);
            }
            let sentence = templates[`${first ? "first" : "other"}Left`]
                .replace('%%LANGCLASS%%', cvRecord.type === "greek" ? "greekLeft" : "transLeft")
                .replace('%%LABEL%%', content.label)
                .replace('%%CONTENT%%', lhsText);
            leftContent.push(sentence);
            first = false;
        }
        let jxlRows = [];
        let sentenceNotes = [];
        for (const [chunkN, chunk] of sentenceJson.chunks.entries()) {
            const greek = chunk.source.map(s => s.content).join(' ');
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
            const row = templates.jxlRow
                .replace('%%GREEK%%', greek)
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
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['juxta_page']
            .replace('%%TITLE%%', `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`)
            .replace('%%SENTENCES%%', sentences.join(''))
    );
    await doPuppet(
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

module.exports = doJxlSpreadSection;
