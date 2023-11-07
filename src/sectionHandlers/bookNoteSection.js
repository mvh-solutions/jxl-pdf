const fse = require("fs-extra");
const path = require("path");
const {maybeChapterNotes, doPuppet} = require("../helpers");
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

module.exports = doBookNoteSection;
