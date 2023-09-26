const path = require("path");
const fse = require("fs-extra");
const {Proskomma} = require("proskomma-core");

// General Helper Functions
const readTemplate = templateName => fse.readFileSync(path.join('src', 'templates', templateName + '.html')).toString();

// jxlSpread Helper Functions
const cvForSentence = sentence => {
    const cvSet = new Set([]);
    sentence.chunks.forEach(c => c.source.forEach(se => cvSet.add(se.cv)));
    const cvValues = Array.from(cvSet);
    const cv1 = cvValues[0];
    const cv2 = cvValues[cvValues.length - 1];
    if (cv1 === cv2) {
        return cv1;
    }
    const [c1, v1] = cv1.split(':');
    const [c2, v2] = cv2.split(':');
    if (c1 === c2) {
        return `${c1}:${v1}-${v2}`;
    }
    return `${cv1}-${cv2}`
};

const trimLhsText = (cvRecord, greekContent) => {
    if (!greekContent) {
        throw new Error('Trimming text requires Greek content: make sure this is first in the config LHS array');
    }
    let tokens = cvRecord.tokens;
    while (tokens.length > 0) {
        const firstTokenGreek = tokens[0].scopes.length === 0 ? "banana" : tokens[0].scopes[0].split('/').reverse()[0];
        if (greekContent.has(firstTokenGreek)) {
            break;
        }
        tokens = tokens.slice(1);
    }
    let punctuation = [];
    while (tokens.length > 0) {
        const lastTokenGreek = tokens[tokens.length - 1].scopes.length === 0 ? "banana" : tokens[tokens.length - 1].scopes[0].split('/').reverse()[0];
        if (greekContent.has(lastTokenGreek)) {
            break;
        }
        if (lastTokenGreek === "banana") {
            punctuation.push(tokens[tokens.length - 1].payload);
        } else {
            punctuation = [];
        }
        tokens.pop();
    }
    return (
        tokens.map(cvr => cvr.payload).join('') +
        punctuation.reverse().join('')
    ).replace(/\\s/g, " ")
        .trim();
}

const quoteForCv = (pk, sentenceRecord, bookCode, cv) => {
    const cvRecord = pk
        .gqlQuerySync(`{docSet(id:"${sentenceRecord.id}") { document(bookCode:"${bookCode}") {cv(chapterVerses: "${cv}") {tokens {subType payload scopes(startsWith: ["attribute/milestone/zaln/x-content"])}}}}}`)
        .data
        .docSet
        .document
        .cv
        .map(cvr => cvr.tokens)
        .reduce((a, b) => [...a, ...b], []);
    return {
        type: sentenceRecord.type,
        tokens: cvRecord.map(cvr => {
            return {...cvr, payload: cvr.payload.replace(/\\s/g, " ")}
        }),
    }
};

const getGreekContent = chunks => {
    const payloadSet = new Set([]);
    chunks.forEach(
        ch => ch.source.forEach(
            s => payloadSet.add(s.content)
        )
    );
    return payloadSet;
}

const getBookName = (pk, docSetId, bookCode) => {
    const headers = pk
        .gqlQuerySync(`{docSet(id:"${docSetId}") { document(bookCode:"${bookCode}") {headers {key value}}}}`)
        .data
        .docSet
        .document
        .headers;
    for (const key of ['toc2', 'toc3', 'h', 'toc']) {
        const keySearch = headers.filter(h => h.key === key);
        if (keySearch.length === 1) {
            return keySearch[0].value;
        }
    }
    return bookCode;
}

const cleanNoteLine = noteLine => noteLine
    .trim()
    .replace(/^#+ +/, "")
    .replace(/^-+ +/, "")
    .replace(/\((Pour|Voir)[^)]+\)/g, "")
    .replace(/\(\[.*?\)\)/g, "")
    .replace(/\*\*([^*]+)\*\*/g, (m, m1) => `<span class="b">${m1}</span>`)
    .replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`)
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")

const maybeChapterNotes = (chapterN, noteType, notes) => {
    const chapterNoteRecord = notes[`${chapterN}_intro`];
    if (chapterNoteRecord) {
        console.log(`   Notes for Chapter ${chapterN}`);
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

// Section handlers
const doFrontSection = (section, notes, notePivot) => {
    fse.writeFileSync(
        path.join(outputPath, `${section.id}.html`),
        templates['non_juxta_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                fse.readFileSync(path.resolve(path.join('data', `${section.path}.html`))).toString()
            )
    );
}

const doJxlSpreadSection = (section, notes, notePivot) => {

    const jxlJson = fse.readJsonSync(path.resolve(path.join('data', section.jxl.path, `${bookCode}.json`)));
    let pivotIds = new Set([]);
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
            notePivot[cells[0]][cells[1]] = cells[4].trim();
            pivotIds.add(cells[4].trim());
        }
        const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
        for (const notesRow of notesRows) {
            const cells = notesRow.split('\t');
            if (pivotIds.has(cells[4])) {
                notes[cells[4]] = cells[6];
            }
        }
    }

    const pk = new Proskomma();
    console.log("   Loading USFM into Proskomma");
    for (const lhs of section.lhs) {
        console.log(`     ${lhs.id}`);
        const [lang, abbr] = lhs.id.split('_');
        const contentString = fse.readFileSync(path.join('data', lhs.id, `${bookCode}.usfm`)).toString();
        pk.importDocument({lang, abbr}, 'usfm', contentString);
    }
    const bookName = getBookName(pk, config.docIdForNames, bookCode);
    let sentences = [];
    let chapterN = 0;
    for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
        const cv = cvForSentence(sentenceJson);
        const newChapterN = cv.split(':')[0];
        if (chapterN !== newChapterN) {
            sentences.push(maybeChapterNotes(newChapterN, 'chapter', notes));
            chapterN = newChapterN;
        }
        console.log(`      ${sentenceN + 1}`);
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
            let sentence = templates[`${first ? "first" : "other"}Left`]
                .replace('%%LANGCLASS%%', cvRecord.type === "greek" ? "greekLeft" : "transLeft")
                .replace('%%LABEL%%', content.label)
                .replace('%%CONTENT%%', cvRecord.type === "greek" ? sentenceJson.sourceString : trimLhsText(cvRecord, greekContent));
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
                const noteId = notePivot[`${sentenceN + 1}`][`${chunkN + 1}`];
                sentenceNotes.push(
                    cleanNoteLine(notes[noteId])
                );
            }
            const row = templates.jxlRow
                .replace('%%GREEK%%', greek)
                .replace('%%GLOSS%%', gloss.replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`))
                .replace('%%NOTECALLERS%%', (noteFound ? `<span class="note_caller">${sentenceNotes.length}</span>` : ""));
            jxlRows.push(row);
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
                    `<section class="jxl_notes">${sentenceNotes.map((note, n) => `<p class="note"><span class="note_n">${n + 1}</span>&nbsp;:&nbsp;${note}</p>`).join('')}</section>`);
        sentences.push(sentence);
    }
    fse.writeFileSync(
        path.join(outputPath, `${section.id}.html`),
        templates['juxta_page']
            .replace('%%TITLE%%', `${bookCode} - ${section.id} - ${section.type}`)
            .replace('%%SENTENCES%%', sentences.join(''))
    );
}

const doBookNoteSection = (section, notes, notePivot) => {
    fse.writeFileSync(
        path.join(outputPath, `${section.id}.html`),
        templates['non_juxta_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                maybeChapterNotes("front", "book", notes)
            )
    );
}

// Script
const usage = "USAGE: node make_html.js <configPath> <bookCode> <outputDir>";
if (process.argv.length !== 5) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const bookCode = process.argv[3];
const outputPath = path.resolve(process.argv[4]);

const templates = {};
for (const template of ['juxta_page', 'non_juxta_page', 'web_index_page', 'web_index_page_link', 'sentence', 'firstLeft', 'otherLeft', 'jxl', 'jxlRow', 'chapterNote', 'bookNote', 'markdownPara']) {
    templates[template] = readTemplate(template);
}

const config = fse.readJsonSync(path.resolve(configPath));
fse.mkdirsSync(outputPath);

let links = [];
let notes = {};
let notePivot = {};
const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
for (const notesRow of notesRows) {
    const cells = notesRow.split('\t');
    if (cells[2] === "intro") {
        const noteKey = `${cells[1]}_${cells[2]}`;
        notes[noteKey] = cells[6];
    }
}
for (const section of config.sections) {
    links.push(
        templates['web_index_page_link']
            .replace(/%%ID%%/g, section.id)
    );
    console.log(`## Section ${section.id} (${section.type})`);
    switch (section.type) {
        case "front":
            doFrontSection(section, notes, notePivot);
            break;
        case "jxlSpread":
            doJxlSpreadSection(section, notes, notePivot);
            break;
        case "bookNote":
            doBookNoteSection(section, notes, notePivot);
            break;
        default:
            throw new Error(`Unknown section type '${section.type}' (id '${section.id}')`);
    }
}
fse.writeFileSync(
    path.join(outputPath, "index.html"),
    templates['web_index_page']
        .replace("%%LINKS%%", links.join("\n"))
);
