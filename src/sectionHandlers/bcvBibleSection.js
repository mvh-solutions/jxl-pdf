const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const doBcvBibleSection = async ({section, templates, bookCode, options}) => {
    const pk = pkWithDocs(bookCode, [section.text], options.verbose);
    const bookName = getBookName(pk, section.text.id, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    const notes = section.showNotes ? bcvNotes(options.configContent, bookCode) : {};
    const verses = [
        `<h1>${bookName}</h1>`
    ];
    for (const cvRecord of cvTexts) {
        const verseHtml = templates['bcv_bible_verse']
            .replace("%%CV%%", cvRecord.cv)
            .replace(
                '%%VERSECONTENT%%',
                `${cvRecord.texts[section.text.id] || "-"}${(notes[cvRecord.cv] || [])
                    .map(nr => cleanNoteLine(nr))
                    .map(note => `<p class="note">${note}</p>`)
                    .join('\n')}`
            );
        verses.push(verseHtml);
    }
    fse.writeFileSync(
        path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['bcv_bible_page']
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
        verbose: options.verbose,
        htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
    });
}

module.exports = doBcvBibleSection;
