const fse = require("fs-extra");
const path = require("path");
const {
    doPuppet,
    pkWithDocs,
    getBookName,
    cvForSentence,
    maybeChapterNotes,
    quoteForCv,
    getGreekContent,
    trimLhsText,
    cleanNoteLine,
    getCVTexts
} = require("../src/helpers");

const doFrontSection = async ({section, serverPort, bookCode, outputDirName, outputPath, templates}) => {
    const content = templates['non_juxta_page']
        .replace(
            "%%TITLE%%",
            `${section.id} - ${section.type}`
        )
        .replace(
            "%%BODY%%",
            fse.readFileSync(path.resolve(path.join('data', `${section.path}.html`))).toString()
        )
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        content
    );
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

const doJxlSpreadSection = async ({section, serverPort, config, bookCode, outputDirName, outputPath, templates}) => {

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
            .replace('%%TITLE%%', `${bookCode} - ${section.id} - ${section.type}`)
            .replace('%%SENTENCES%%', sentences.join(''))
    );
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

const doBookNoteSection = async ({section, serverPort, config, bookCode, outputDirName, outputPath, templates}) => {
    const notes = {};
    const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
    for (const notesRow of notesRows) {
        const cells = notesRow.split('\t');
        if (cells[1] === "front" && cells[2] === "intro") {
            const noteKey = `${cells[1]}_${cells[2]}`;
            notes[noteKey] = cells[6];
        }
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['non_juxta_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                maybeChapterNotes("front", "book", notes, templates)
            )
    );
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

const do4ColumnSpreadSection = async ({section, serverPort, config, bookCode, outputDirName, outputPath, templates}) => {
    if (!section.texts || section.texts.length !== 4) {
        throw new Error("4 Column Spread Section requires exactly 4 text definitions");
    }
    const pk = pkWithDocs(bookCode, section.texts);
    const bookName = getBookName(pk, config.docIdForNames, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    fse.writeFileSync(
        path.join(outputPath, outputDirName, 'pdf', "cv.json"),
        JSON.stringify(cvTexts, null, 2)
    );
    const verses = [];
    verses.push(templates['4_column_spread_title'].replace('%%BOOKNAME%%', bookName));
    const headerHtml = templates['4_column_header_page']
        .replace(
            "%%TITLE%%",
            `${section.id} - ${section.type}`
        )
        .replace(/%%TRANS1TITLE%%/g, section.texts[0].label)
        .replace(/%%TRANS2TITLE%%/g, section.texts[1].label)
        .replace(/%%TRANS3TITLE%%/g, section.texts[2].label)
        .replace(/%%TRANS4TITLE%%/g, section.texts[3].label);
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.html`),
        headerHtml
    );
    await doPuppet(
        serverPort,
        `${section.id.replace('%%bookCode%%', bookCode)}_superimpose`,
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.pdf`)),
        true,
        outputDirName
    );
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
                `<div class="col3">${cvRecord.texts[section.texts[2].id] || "-"}</div><div class="col4">${cvRecord.texts[section.texts[3].id] || "-"}</div>`
            );
        verses.push(verseHtml);
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['4_column_spread_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
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
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

const do2ColumnSection = async ({section, serverPort, bookCode, outputDirName, outputPath, templates}) => {
    if (!section.texts || section.texts.length !== 2) {
        throw new Error("2 Column Section requires exactly 2 text definitions");
    }
    const pk = pkWithDocs(bookCode, section.texts);
    const bookName = getBookName(pk, section.texts[0].id, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    const verses = [];
    verses.push(templates['2_column_title'].replace('%%BOOKNAME%%', bookName));
    const headerHtml = templates['2_column_header_page']
        .replace(
            "%%TITLE%%",
            `${section.id} - ${section.type}`
        )
        .replace(/%%TRANS1TITLE%%/g, section.texts[0].label)
        .replace(/%%TRANS2TITLE%%/g, section.texts[1].label);
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.html`),
        headerHtml
    );
    await doPuppet(
        serverPort,
        `${section.id.replace('%%bookCode%%', bookCode)}_superimpose`,
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.pdf`)),
        true,
        outputDirName
    );
    verses.push(`
<section class="columnHeadings">
    <section class="leftColumn">
        <h2 class="verseRecordHeadLeft">${section.texts[0].label}</h2>
    </section>
    <section class="rightColumn">
        <h2 class="verseRecordHeadRight">${section.texts[1].label}</h2>
    </section>
</section>
`);
    for (const cvRecord of cvTexts) {
        const verseHtml = templates['2_column_verse']
            .replace("%%TRANS1TITLE%%", section.texts[0].label)
            .replace("%%TRANS2TITLE%%", section.texts[1].label)
            .replace(
                '%%LEFTCOLUMN%%',
                `<div class="col1"><span class="cv">${cvRecord.cv}</span> ${cvRecord.texts[section.texts[0].id] || "-"}</div>`
            )
            .replace(
                '%%RIGHTCOLUMN%%',
                `<div class="col2">${cvRecord.texts[section.texts[1].id] || "-"}</div>`
            );
        verses.push(verseHtml);
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['2_column_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
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
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

module.exports = {
    doFrontSection,
    doBookNoteSection,
    do4ColumnSpreadSection,
    doJxlSpreadSection,
    do2ColumnSection
}
