const {pkWithDocs, getBookName, getCVTexts, cleanNoteLine, bcvNotes, doPuppet, setupOneCSS, checkCssSubstitution} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const Section = require('./section');

class bcvBibleSection extends Section {
    async doSection({section, templates, bookCode, options}) {
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
        const cssPath = path.join(options.workingDir, "html", "resources", "bcv_bible_page_styles.css");
        let css = fse.readFileSync(cssPath).toString();
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        for (const [placeholder, values] of options.pageFormat.sections.bcvBible.cssValues) {
            css = setupOneCSS(css, placeholder, "%", values[0]);
        }
        checkCssSubstitution("bcv_bible_page_styles.css", css, "%");
        fse.writeFileSync(cssPath, css);
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = bcvBibleSection;
