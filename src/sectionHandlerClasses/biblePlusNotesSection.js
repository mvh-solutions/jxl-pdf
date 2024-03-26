const {
    pkWithDocs,
    getBookName,
    getCVTexts,
    cleanNoteLine,
    bcvNotes,
    doPuppet,
    setupOneCSS,
    checkCssSubstitution
} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const Section = require('./section');

class biblePlusNotesSection extends Section {

    requiresBook() {
        return true;
    }

    async doSection({section, templates, bookCode, options}) {
        const pk = pkWithDocs(bookCode, [section.text], options.verbose);
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
        const cssPath = path.join(options.workingDir, "html", "resources", "bible_plus_notes_page_styles.css");
        let css = fse.readFileSync(cssPath).toString();
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        for (const [placeholder, values] of options.pageFormat.sections.biblePlusNotes.cssValues) {
            css = setupOneCSS(css, placeholder, "%", values[0]);
        }
        checkCssSubstitution("bible_plus_notes_page_styles.css", css, "%");
        fse.writeFileSync(cssPath, css);
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = biblePlusNotesSection;
