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

            while(checkCounts++ <= maxChecks){
                let html = await page.content();
                let currentHTMLSize = html.length;

                let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
                if(lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize)
                    countStableSizeIterations++;
                else
                    countStableSizeIterations = 0; //reset the counter

                if(countStableSizeIterations >= minStableSizeIterations) {
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
            format: orientation === 'landscape' ? 'A3' : 'A5',
            landscape: orientation === 'landscape',
            timeout: 300000
        }); // 5 minutes
        console.log(`     Saved PDF to ${pdfOutputPath}`);
        await browser.close();
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
        console.log("     Loading USFM into Proskomma");
        for (const lhs of section.lhs) {
            console.log(`       ${lhs.id}`);
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
            console.log(`       ${sentenceN + 1}`);
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
    for (const template of ['juxta_page', 'non_juxta_page', 'web_index_page', 'web_index_page_link', 'sentence', 'firstLeft', 'otherLeft', 'jxl', 'jxlRow', 'chapterNote', 'bookNote', 'markdownPara']) {
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
        if (cells[2] === "intro") {
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
            makeFromDouble: section.type === "jxlSpread"
        })
        switch (section.type) {
            case "front":
                await doFrontSection(section, notes, notePivot);
                break;
            case "jxlSpread":
                await doJxlSpreadSection(section, notes, notePivot);
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