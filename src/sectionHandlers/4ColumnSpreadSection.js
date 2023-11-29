const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, doPuppet, bcvNotes} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const do4ColumnSpreadSection = async ({section, config, bookCode, outputDirName, outputPath, templates}) => {
    if (!section.texts || section.texts.length !== 4) {
        throw new Error("4 Column Spread Section requires exactly 4 text definitions");
    }
    const pk = pkWithDocs(bookCode, section.texts);
    const bookName = getBookName(pk, config.docIdForNames, bookCode);
    const cvTexts = getCVTexts(bookCode, pk);
    const notes = section.showNotes ? bcvNotes(config, bookCode) : {};
    fse.writeFileSync(
        path.join(outputPath, outputDirName, 'pdf', "cv.json"),
        JSON.stringify(cvTexts, null, 2)
    );
    const verses = [];
    verses.push(templates['4_column_spread_title'].replace('%%BOOKNAME%%', bookName));
    const headerHtml = templates['4_column_header_page']
        .replace(
            "%%TITLE%%",
            `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
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
                `<div class="col3">${cvRecord.texts[section.texts[2].id] || "-"}</div><div class="col4">${cvRecord.texts[section.texts[3].id] || "-"}${(notes[cvRecord.cv] || [])
                    .map(nr => cleanNoteLine(nr))
                    .map(note => `<p class="note">${note}</p>`)
                    .join('\n')}</div>`
            );
        verses.push(verseHtml);
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['4_column_spread_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
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
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

module.exports = do4ColumnSpreadSection;
