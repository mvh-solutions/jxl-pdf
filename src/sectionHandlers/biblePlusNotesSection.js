const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const do2BiblePlusNotesSection = async ({section, bookCode, config, outputDirName, outputPath, templates}) => {
    const pk = pkWithDocs(bookCode, [section.text]);
    const bookName = getBookName(pk, section.text.id, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    if (!section.showNotes) {
        throw new Error("BiblePlusNotes section requires notes");
    }
    const notes = bcvNotes(config, bookCode);
    const verses = [
        `<h1>${bookName}</h1>`
    ];
    for (const cvRecord of cvTexts) {
        const verseHtml = templates['bible_plus_notes_verse']
            .replace("%%TRANS1TITLE%%", section.text.label)
            .replace("%%TRANS2TITLE%%", section.text.label)
            .replace(
                '%%LEFTCOLUMN%%',
                `<div class="col1"><span class="cv">${cvRecord.cv}</span> ${cvRecord.texts[section.text.id] || "-"}</div>`
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
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['bible_plus_notes_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
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
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

module.exports = do2BiblePlusNotesSection;
