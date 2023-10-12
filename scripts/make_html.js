const path = require("path");
const fse = require("fs-extra");
const {Proskomma} = require("proskomma-core");
const puppeteer = require('puppeteer');

const doScript = async () => {
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
            .replace(/ ;/g, "&nbsp;;")
            .replace(/ :/g, "&nbsp;:")
            .replace(/ !/g, "&nbsp;!")
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
        .replace(/\(([Pp]our|[Vv]oir)[^)]+\)/g, "")
        .replace(/\(\[.*?\)\)/g, "")
        .replace(/\*\*([^*]+)\*\*/g, (m, m1) => `<span class="b">${m1}</span>`)
        .replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`)
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")

    const maybeChapterNotes = (chapterN, noteType, notes) => {
        const chapterNoteRecord = notes[`${chapterN}_intro`];
        if (chapterNoteRecord) {
            console.log(`     Notes for Chapter ${chapterN}`);
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

    const doPuppet = async (serverPort, sectionId, pdfOutputPath, orientation) => {

        const waitTillHTMLRendered = async (page, timeout = 30000) => {
            const checkDurationMsecs = 1000;
            const maxChecks = timeout / checkDurationMsecs;
            let lastHTMLSize = 0;
            let checkCounts = 1;
            let countStableSizeIterations = 0;
            const minStableSizeIterations = 3;

            while (checkCounts++ <= maxChecks) {
                let html = await page.content();
                let currentHTMLSize = html.length;

                let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
                if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize)
                    countStableSizeIterations++;
                else
                    countStableSizeIterations = 0; //reset the counter

                if (countStableSizeIterations >= minStableSizeIterations) {
                    console.log("     Page rendered fully");
                    break;
                }

                lastHTMLSize = currentHTMLSize;
                await page.waitForTimeout(checkDurationMsecs);
            }
        };

        console.log(`     Running Puppet`);
        const browser = await puppeteer.launch({headless: "new"});
        const page = await browser.newPage();
        await page.goto(`http://localhost:${serverPort}/html/${outputDirName}/${sectionId}.html`, {waitUntil: 'load'});
        page.on("pageerror", function (err) {
                theTempValue = err.toString();
                console.log("Page error: " + theTempValue);
            }
        )
        await waitTillHTMLRendered(page);
        await page.pdf({
            path: pdfOutputPath,
            format: orientation === 'landscape' ? 'A3' : 'A3',
            landscape: orientation === 'landscape',
            timeout: 300000
        }); // 5 minutes
        console.log(`     Saved PDF to ${pdfOutputPath}`);
        await browser.close();
    }

    const pkWithDocs = (bookCode, docSpecs) => {
        const pk = new Proskomma();
        console.log("     Loading USFM into Proskomma");
        for (const docSpec of docSpecs) {
            console.log(`       ${docSpec.id}`);
            const [lang, abbr] = docSpec.id.split('_');
            const contentString = fse.readFileSync(path.join('data', docSpec.id, `${bookCode}.usfm`)).toString();
            pk.importDocument({lang, abbr}, 'usfm', contentString);
        }
        return pk;
    }

    const getCVTexts = (bookCode, pk) => {
        const cvQuery = `{
            docSets {
            id
            document(bookCode: """${bookCode}""") {
                id
                cvIndexes {
                    chapter
                    verses {
                        verse {
                            verseRange
                            text(normalizeSpace: true)
                        }
                    }
                }
            }
        }
        }
    `;
        const result = pk.gqlQuerySync(cvQuery)
            .data
            .docSets
            .map(
                ds => ({
                    id: ds.id,
                    chapters: ds.document.cvIndexes.map(
                        cvi => ({
                            chapterN: cvi.chapter,
                            verses: cvi.verses
                                .filter(vs => vs.verse.length > 0)
                                .map(
                                    vs => ({
                                        verseN: vs.verse[0].verseRange,
                                        text: vs.verse[0].text
                                    })
                                )
                        })
                    )
                })
            );
        const cvLookup = {};
        for (const ds of result) {
            cvLookup[ds.id] = {};
            for (const chapter of ds.chapters) {
                cvLookup[ds.id][chapter.chapterN] = {};
                for (const verse of chapter.verses) {
                    cvLookup[ds.id][chapter.chapterN][verse.verseN] = verse.text
                        .replace(/\\s/g, " ")
                        .replace(/ ;/g, "&nbsp;;")
                        .replace(/ :/g, "&nbsp;:")
                        .replace(/ !/g, "&nbsp;!")
                        .trim();;
                }
            }
        }
        let ret = [];
        for (const chapter of result[0].chapters) {
            for (const verse of chapter.verses) {
                const cv = `${chapter.chapterN}:${verse.verseN}`;
                const retRecord = {
                    cv,
                    texts: {}
                };
                for (const ds of Object.keys(cvLookup)) {
                    if (cvLookup[ds][chapter.chapterN] && cvLookup[ds][chapter.chapterN][verse.verseN]) {
                        retRecord.texts[ds] = cvLookup[ds][chapter.chapterN][verse.verseN];
                    }
                }
                if (Object.keys(retRecord.texts).length > 0) {
                    ret.push(retRecord);
                }
            }
        }
        return ret;
    }

// Section handlers
    const doFrontSection = async (section, notes, notePivot) => {
        const content = templates['non_juxta_page']
            .replace(
                "%%TITLE%%",
                `${section.id} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                fse.readFileSync(path.resolve(path.join('data', `${section.path}.html`))).toString()
            )
        fse.writeFileSync(
            path.join(outputPath, outputDirName, `${section.id}.html`),
            content
        );
        await doPuppet(serverPort, section.id, path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id}.pdf`)));
    }

    const doJxlSpreadSection = async (section, notes, notePivot) => {

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
                const noteIds = cells[4].split(";").map(n => n.trim());
                notePivot[cells[0]][cells[1]] = noteIds;
                for (const noteId of noteIds) {
                    pivotIds.add(noteId);
                }
            }
            const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
            for (const notesRow of notesRows) {
                const cells = notesRow.split('\t');
                if (pivotIds.has(cells[4])) {
                    notes[cells[4]] = cells[6];
                }
            }
        }

        const pk = pkWithDocs(bookCode, section.lhs);
        const bookName = getBookName(pk, config.docIdForNames, bookCode);
        let sentences = [];
        let chapterN = 0;
        console.log(`       Sentences`);
        for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
            const cv = cvForSentence(sentenceJson);
            const newChapterN = cv.split(':')[0];
            if (chapterN !== newChapterN) {
                sentences.push(maybeChapterNotes(newChapterN, 'chapter', notes));
                chapterN = newChapterN;
            }
            console.log(`         ${sentenceN + 1}`);
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
                let lhsText = sentenceJson.sourceString;
                if (sentenceJson.forceTrans && cvRecord.type !== "greek") {
                    lhsText = sentenceJson.forceTrans[content.id];
                } else if (cvRecord.type !== "greek") {
                    lhsText = trimLhsText(cvRecord, greekContent);
                }
                let sentence = templates[`${first ? "first" : "other"}Left`]
                    .replace('%%LANGCLASS%%', cvRecord.type === "greek" ? "greekLeft" : "transLeft")
                    .replace('%%LABEL%%', content.label)
                    .replace('%%CONTENT%%', lhsText);
                leftContent.push(sentence);
                first = false;
            }
            let jxlRows = [];
            let sentenceNotes = [];
            for (const [chunkN, chunk] of sentenceJson.chunks.entries()) {
                let noteN = [];
                const greek = chunk.source.map(s => s.content).join(' ');
                const gloss = chunk.gloss;
                let noteFound = false;
                if (notePivot[`${sentenceN + 1}`] && notePivot[`${sentenceN + 1}`][`${chunkN + 1}`]) {
                    noteFound = true;
                    for (const noteId of notePivot[`${sentenceN + 1}`][`${chunkN + 1}`]) {
                        sentenceNotes.push(
                            cleanNoteLine(notes[noteId])
                        );
                        noteN.push(sentenceNotes.length);
                    }
                }
                const row = templates.jxlRow
                    .replace('%%GREEK%%', greek)
                    .replace('%%GLOSS%%', gloss.replace(/\*([^*]+)\*/g, (m, m1) => `<i>${m1}</i>`))
                    .replace('%%NOTECALLERS%%', (noteFound ? `${sentenceNotes.map((note, n) => `<p class="note">${note}</p>`).join('')}` : ""));
                jxlRows.push(row);
                sentenceNotes = [];
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
                        ``);
            sentences.push(sentence);
        }
        fse.writeFileSync(
            path.join(outputPath, outputDirName, `${section.id}.html`),
            templates['juxta_page']
                .replace('%%TITLE%%', `${bookCode} - ${section.id} - ${section.type}`)
                .replace('%%SENTENCES%%', sentences.join(''))
        );
        await doPuppet(
            serverPort,
            section.id,
            path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id}.pdf`)),
            true
        );
    }

    const doBookNoteSection = async (section, notes, notePivot) => {
        fse.writeFileSync(
            path.join(outputPath, outputDirName, `${section.id}.html`),
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
        await doPuppet(
            serverPort,
            section.id,
            path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id}.pdf`))
        );
    }

    const do4ColumnSpreadSection = async (section, notes, notePivot) => {
        if (!section.texts || section.texts.length !== 4) {
            throw new Error("4 Column Spread Section requires exactly 4  text definitions");
        }
        const pk = pkWithDocs(bookCode, section.texts);
        const bookName = getBookName(pk, config.docIdForNames, bookCode);
        const cvTexts = getCVTexts(bookCode, pk);
        const verses = [];
        for (const cvRecord of cvTexts) {
            const verseHtml = templates['4_column_spread_verse']
                .replace(/%%BCV%%/g, `${bookName} ${cvRecord.cv}`)
                .replace(
                    '%%VERSOCOLUMNS%%',
                    `<div class="col1">${cvRecord.texts.fra_lsg || "-"}</div><div class="col2">${cvRecord.texts.grc_ugnt || "-"}</div>`
                )
                .replace(
                    '%%RECTOCOLUMNS%%',
                    `<div class="col3">${cvRecord.texts.fra_tlx || "-"}</div><div class="col4">${cvRecord.texts.fra_tsx || "-"}</div>`
                );
            verses.push(verseHtml);
        }
        fse.writeFileSync(
            path.join(outputPath, outputDirName, `${section.id}.html`),
            templates['4_column_spread_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id} - ${section.type}`
                )
                .replace(
                    "%%VERSES%%",
                    verses.join('\n')
                )
        );
        await doPuppet(
            serverPort,
            section.id,
            path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id}.pdf`))
        );
    }

// Script
    const usage = "USAGE: node make_html.js <configPath> <bookCode> <serverPort> <outputDirName>";
    if (process.argv.length !== 6) {
        console.log(`Wrong number of arguments!\n${usage}`);
        process.exit(1);
    }

    const configPath = process.argv[2];
    const bookCode = process.argv[3];
    const serverPort = process.argv[4];
    const outputDirName = process.argv[5];
    const outputPath = path.resolve('static/html');

    const templates = {};
    for (const template of [
        'juxta_page',
        'non_juxta_page',
        '4_column_spread_page',
        '4_column_spread_verse',
        'web_index_page',
        'web_index_page_link',
        'sentence', 'firstLeft',
        'otherLeft',
        'jxl',
        'jxlRow',
        'chapterNote',
        'bookNote',
        'markdownPara'
    ]) {
        templates[template] = readTemplate(template);
    }

    const config = fse.readJsonSync(path.resolve(configPath));
    fse.mkdirsSync(path.join(outputPath, outputDirName, 'pdf'));

    let links = [];
    let notes = {};
    let notePivot = {};
    let manifest = [];
    const notesRows = fse.readFileSync(path.join('data', config.notes, `${bookCode}.tsv`)).toString().split("\n");
    for (const notesRow of notesRows) {
        const cells = notesRow.split('\t');
        if (cells[1] === "front" && cells[2] === "intro") {
            const noteKey = `${cells[1]}_${cells[2]}`;
            notes[noteKey] = cells[6];
        }
    }
    for (const section of config.sections) {
        console.log(`## Section ${section.id} (${section.type})`);
        links.push(
            templates['web_index_page_link']
                .replace(/%%ID%%/g, section.id)
        );
        manifest.push({
            id: section.id,
            type: section.type,
            startOn: section.startOn,
            showPageNumber: section.showPageNumber,
            makeFromDouble: ["jxlSpread", "4ColumnSpread"].includes(section.type)
        })
        switch (section.type) {
            case "front":
                await doFrontSection(section, notes, notePivot);
                break;
            case "jxlSpread":
                await doJxlSpreadSection(section, notes, notePivot);
                break;
            case "4ColumnSpread":
                await do4ColumnSpreadSection(section, notes, notePivot);
                break;
            case "bookNote":
                await doBookNoteSection(section, notes, notePivot);
                break;
            default:
                throw new Error(`Unknown section type '${section.type}' (id '${section.id}')`);
        }
    }
    fse.writeFileSync(
        path.join(outputPath, outputDirName, "index.html"),
        templates['web_index_page']
            .replace("%%LINKS%%", links.join("\n"))
    );
    fse.writeJsonSync(
        path.join(outputPath, outputDirName, 'pdf', "manifest.json"),
        manifest
    )
}

doScript().then();
