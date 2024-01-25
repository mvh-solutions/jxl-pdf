const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const do2BiblePlusNotesSection = async ({section, templates, bookCode, options}) => {
    const pk = pkWithDocs(bookCode, [section.text]);
    const bookName = getBookName(pk, section.text.id, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    if (!section.showNotes) {
        throw new Error("BiblePlusNotes section requires notes");
    }
    const notes = bcvNotes(options.configContent, bookCode);
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
        path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
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
    await doPuppet({
        sectionId: section.id.replace('%%bookCode%%', bookCode),
        htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
    });
}

module.exports = do2BiblePlusNotesSection;
