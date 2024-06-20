const fse = require("fs-extra");
const path = require("path");
const cleanNoteLine = noteLine => noteLine
    .trim()
    .replace(/^#+ +/, "")
    .replace(/^-+ +/, "")
    .replace(/\(([Pp]our|[Vv]oir)[^)]+\)/g, "")
    .replace(/\(\[.*?\)\)/g, "")
    .replace(/\*\*([^*]+)\*\*/g, (m, m1) => `<span class="b">${m1}</span>`)
    .replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`)
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")

const formatNote = (noteRecord, templates) => {
    const noteText = noteRecord.split(/\\n\\n/);
    const noteHeading = noteText[0].replace(/^# +/, "");
    let noteParas = [];
    for (const noteLine of noteText.slice(1)) {
        let paraClass = "note_body";
        if (noteLine.startsWith("####")) {
            paraClass = "note_h4"
        } else if (noteLine.startsWith("###")) {
            paraClass = "note_h3"
        } else if (noteLine.startsWith("##")) {
            paraClass = "note_h2"
        } else if (noteLine.trim().startsWith("-")) {
            paraClass = "note_list2"
        } else if (/^[0-9]+\./.test(noteLine.trim())) {
            paraClass = "note_list1"
        }
        noteParas.push(
            templates.markdownPara
                .replace("%%CLASS%%", paraClass)
                .replace(
                    "%%NOTE%%",
                    cleanNoteLine(noteLine)
                )
        );
    }
    return [noteHeading, noteParas.join('\n')];

}
const maybeChapterNotes = (chapterN, noteType, notes, templates, verbose=false) => {
    const chapterNoteRecord = notes[`${chapterN}_intro`];
    if (chapterNoteRecord) {
        verbose && console.log(`     Notes for Chapter ${chapterN}`);
        const chapterNoteText = chapterNoteRecord.split(/(<br>)+/).filter(l => l.replace('<br>', '').length > 0);
        const chapterNoteHeading = chapterNoteText[0].replace(/^# +/, "");
        let noteParas = [];
        for (const noteLine of chapterNoteText.slice(1)) {
            let paraClass = "note_body";
            if (noteLine.startsWith("####")) {
                paraClass = "note_h4"
            } else if (noteLine.startsWith("###")) {
                paraClass = "note_h3"
            } else if (noteLine.startsWith("##")) {
                paraClass = "note_h2"
            } else if (noteLine.trim().startsWith("-")) {
                paraClass = "note_list2"
            } else if (/^[0-9]+\./.test(noteLine.trim())) {
                paraClass = "note_list1"
            }
            noteParas.push(
                templates.markdownPara
                    .replace("%%CLASS%%", paraClass)
                    .replace(
                        "%%NOTE%%",
                        cleanNoteLine(noteLine)
                    )
            );
        }
        return templates[`${noteType || 'chapter'}Note`]
            .replace('%%NOTETITLE%%', chapterNoteHeading)
            .replace('%%NOTEBODY%%', noteParas.join('\n'))
    } else {
        return "";
    }
}

const bcvNotes = (notesPath, bookCode) => {
    const notes = {};
    const fileWithBook = fse.readdirSync(notesPath).filter(p => p.includes(bookCode))[0];
    if (!fileWithBook) {
        throw new Error(`No notes for ${bookCode} found in bcvNotes`);
    }
    const notesRows = fse.readFileSync(path.join(notesPath, fileWithBook)).toString().split("\n");
    for (const notesRow of notesRows) {
        const cells = notesRow.split('\t');
        const rowKey = cells[0];
        if (!(rowKey in notes)) {
            notes[rowKey] = [];
        }
        notes[rowKey].push(cells[6]);
    }
    return notes;
}


module.exports = {
    cleanNoteLine,
    maybeChapterNotes,
    bcvNotes,
    formatNote
}
