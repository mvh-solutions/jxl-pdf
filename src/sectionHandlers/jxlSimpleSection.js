const fse = require("fs-extra");
const path = require("path");
const {
    cvForSentence,
    maybeChapterNotes,
    cleanNoteLine,
    doPuppet
} = require("../helpers");

const doJxlSimpleSection = async ({section, templates, bookCode, options}) => {
    const jsonFile = fse.readJsonSync(path.resolve(path.join('data', section.jxl.path, `${bookCode}.json`)))
    const jxlJson = jsonFile.bookCode ? jsonFile.sentences : jsonFile;
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
        const notesRows = fse.readFileSync(path.join('data', options.configContent.notes, `${bookCode}.tsv`)).toString().split("\n");
        for (const notesRow of notesRows) {
            const cells = notesRow.split('\t');
            if (pivotIds.has(cells[4])) {
                notes[cells[4]] = cells[6];
            }
        }
    }

    const bookName = bookCode;
    let sentences = [];
    let chapterN = 0;
    options.verbose && console.log(`       Sentences`);
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
            sentences.push(maybeChapterNotes(newChapterN, 'chapter', notes, templates, options.verbose));
            chapterN = newChapterN;
        }
        options.verbose && console.log(`         ${sentenceN + 1}`);
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
        const sentence = templates.simple_juxta_sentence
            .replace('%%SENTENCEN%%', sentenceN + 1)
            .replace('%%NSENTENCES%%', jxlJson.length)
            .replace('%%BOOKNAME%%', bookName)
            .replace('%%SENTENCEREF%%', cv)
            .replace('%%JXL%%', jxl)
            .replace(
                '%%NOTES%%',
                sentenceNotes.length === 0 ?
                    "" :
                    ``);
        sentences.push(sentence);
    }
    fse.writeFileSync(
        path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['simple_juxta_page']
            .replace('%%TITLE%%', `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`)
            .replace('%%SENTENCES%%', sentences.join(''))
    );
    await doPuppet({
        verbose: options.verbose,
        htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
    });
}

module.exports = doJxlSimpleSection;
