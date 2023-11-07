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
    quoteForCv,
    getCVTexts
}
