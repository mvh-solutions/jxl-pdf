const puppeteer = require("puppeteer");
const fse = require("fs-extra");
const path = require("path");
const {Proskomma} = require("proskomma-core");

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
        .replace(/{([^}]+)}/g, (res, m1) => `<i>${m1}</i>`)
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

const maybeChapterNotes = (chapterN, noteType, notes, templates) => {
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

const doPuppet = async (serverPort, sectionId, pdfOutputPath, orientation, outputDirName) => {

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

const vrNumbers = vrs => {
    let [fromV, toV] = vrs.split('-').map(vs => parseInt(vs));
    let ret = [];
    while (fromV <= toV + 1) {
        ret.push(fromV++);
    }
    return ret;
}

const getCVTexts = (bookCode, pk) => {
    const cvQuery = `{
            docSets {
            id
            document(bookCode: """${bookCode}""") {
                id
                cvIndexes {
                    chapter
                    verseNumbers {
                        number
                        range
                    }
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
                        verseRanges: cvi.verseNumbers
                            .filter(vr => vr.range.includes("-")),
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
    const verseRanges = {};
    for (const ds of result) {
        cvLookup[ds.id] = {};
        const seenRanges = new Set([]);
        for (const chapter of ds.chapters) {
            if (!verseRanges[chapter.chapterN]) {
                verseRanges[chapter.chapterN] = {};
            }
            for (const vr of chapter.verseRanges) {
                verseRanges[chapter.chapterN][vr.number] = !seenRanges.has(vr.range) ? vr.range : null;
                seenRanges.add(vr.range);
            }
            cvLookup[ds.id][chapter.chapterN] = {};
            for (const verse of chapter.verses) {
                cvLookup[ds.id][chapter.chapterN][verse.verseN] = verse.text
                    .replace(/\\s/g, " ")
                    .replace(/ ;/g, "&nbsp;;")
                    .replace(/ :/g, "&nbsp;:")
                    .replace(/ !/g, "&nbsp;!")
                    .replace(/{([^}]+)}/g, (res, m1) => `<i>${m1}</i>`)
                    .trim();
                ;
            }
        }
    }
    let ret = [];
    for (const chapter of result[0].chapters) {
        for (const verse of chapter.verses) {
            const retRecord = {
                texts: {}
            };
            if (verseRanges[chapter.chapterN] && verse.verseN in verseRanges[chapter.chapterN]) { // verseRange record exists
                retRecord.cv = `${chapter.chapterN}:${verseRanges[chapter.chapterN][verse.verseN]}`;
                for (const ds of Object.keys(cvLookup)) {
                    if (cvLookup[ds][chapter.chapterN]) {
                        if (
                            verseRanges[chapter.chapterN][verse.verseN] &&
                            cvLookup[ds][chapter.chapterN][verseRanges[chapter.chapterN][verse.verseN]]
                        ) { // verseRange for which the verseRange exists directly
                            retRecord.texts[ds] = cvLookup[ds][chapter.chapterN][verseRanges[chapter.chapterN][verse.verseN]];
                        } else if (verse.verseN in cvLookup[ds][chapter.chapterN]) { // verseRange for which there is single verse content;
                            if (!verseRanges[chapter.chapterN][verse.verseN]) { // verseRange is null, so already handled for a previous verse
                                continue;
                            }
                            for (const vrNumber of vrNumbers(verseRanges[chapter.chapterN][verse.verseN])) {
                                if (!retRecord.texts[ds]) {
                                    retRecord.texts[ds] = cvLookup[ds][chapter.chapterN][vrNumber] || "??";
                                } else {
                                    retRecord.texts[ds] += ` ${cvLookup[ds][chapter.chapterN][vrNumber] || "??"}`;
                                }
                            }
                        }
                    }
                }
            } else {
                retRecord.cv = `${chapter.chapterN}:${verse.verseN}`;
                for (const ds of Object.keys(cvLookup)) {
                    if (cvLookup[ds][chapter.chapterN] && verse.verseN in cvLookup[ds][chapter.chapterN]) {
                        retRecord.texts[ds] = cvLookup[ds][chapter.chapterN][verse.verseN];
                    }
                }
            }
            if (Object.keys(retRecord.texts).length > 0) {
                ret.push(retRecord);
            }
        }
    }
    return ret;
}

module.exports = {
    cvForSentence,
    trimLhsText,
    quoteForCv,
    getGreekContent,
    getBookName,
    cleanNoteLine,
    maybeChapterNotes,
    doPuppet,
    pkWithDocs,
    getCVTexts
}
