const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const do2ColumnSection = async ({section, bookCode, config, outputDirName, outputPath, templates}) => {
    if (!section.texts || section.texts.length !== 2) {
        throw new Error("2 Column Section requires exactly 2 text definitions");
    }
    const pk = pkWithDocs(bookCode, section.texts);
    const bookName = getBookName(pk, section.texts[0].id, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    const notes = section.showNotes ? bcvNotes(config, bookCode) : {};
    const verses = [];
    verses.push(templates['2_column_title'].replace('%%BOOKNAME%%', bookName));
    const headerHtml = templates['2_column_header_page']
        .replace(
            "%%TITLE%%",
            `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
        )
        .replace(/%%TRANS1TITLE%%/g, section.texts[0].label)
        .replace(/%%TRANS2TITLE%%/g, section.texts[1].label);
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose.html`),
        headerHtml
    );
    await doPuppet(
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
                `<div class="col2">${cvRecord.texts[section.texts[1].id] || "-"}${(notes[cvRecord.cv] || [])
                    .map(nr => cleanNoteLine(nr))
                    .map(note => `<p class="note">${note}</p>`)
                    .join('\n')}</div>`
            );
        verses.push(verseHtml);
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['2_column_page']
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

module.exports = do2ColumnSection;
