const path = require('path');
const fse = require('fs-extra');

const jxlJson = fse.readJsonSync(path.resolve(process.argv[2]));

// console.log(JSON.stringify(jxlJson, null, 2));

function bGtA(a, b) {
    const aT = a.split('-').map(v => parseInt(v));
    const bT = b.split('-').map(v => parseInt(v));
    if (aT[0] > bT[0]) {
        return false;
    } else if (aT[0] < bT[0]) {
        return true;
    } else if (aT[1] > bT[1]) {
        return false;
    } else if (aT[1] < bT[1]) {
        return true;
    } else {
        throw new Error(`Attempt to compare identical values (${a}) in bGtA`);
    }
}

// Build cv lookup, where value is [firstOcc, lastOcc] as sentence-chunk-word (all zero-indexed)
const sentenceCvs = {};
for (const [nSentence, sentence] of jxlJson.entries()) {
    sentenceCvs[nSentence] = {};
    for (const [nChunkSource, chunkSources] of sentence.chunks.map(c => c.source).entries()) {
        for (const [nChunkWord, chunkWordCv] of chunkSources.map(cs => cs.cv).entries()) {
            const chunkWordKey = `${nChunkSource}-${nChunkWord}`;
            if (!sentenceCvs[nSentence][chunkWordCv]) {
                sentenceCvs[nSentence][chunkWordCv] = {firstOcc: chunkWordKey};
            }
            sentenceCvs[nSentence][chunkWordCv]["lastOcc"] = chunkWordKey;
        }
    }
}
// Find overlapping ranges within each sentence (since UI doesn't allow moving chunks between sentences)
// Also collect unique cvs for later

const uniqueCvs = new Set([]);
const overlaps = [];
for (const sentence of Object.values(sentenceCvs)) {
    const sentenceEntries = Object.entries(sentence);
    for (let nSentenceEntry = 0; nSentenceEntry < sentenceEntries.length - 1; nSentenceEntry++) {
        const [cv, occs] = sentenceEntries[nSentenceEntry];
        uniqueCvs.add(cv);
        for (let nSentenceEntry2 = nSentenceEntry + 1; nSentenceEntry2 < sentenceEntries.length; nSentenceEntry2++) {
            if (nSentenceEntry === nSentenceEntry2) {
                continue;
            }
            const [cv2, occs2] = sentenceEntries[nSentenceEntry2];
            if (
                !bGtA(occs.lastOcc, occs2.firstOcc) ||
                !bGtA(occs.firstOcc, occs2.lastOcc)
            ) {
                let overlapFound = false;
                for (const overlap of overlaps) {
                    if (overlap.has(cv) || overlap.has(cv2)) {
                        overlap.add(cv);
                        overlap.add(cv2);
                        overlapFound = true;
                        break;
                    }
                }
                if (!overlapFound) {
                    overlaps.push(new Set([cv, cv2]));
                }
            }
        }
    }
}

// Iterate to add verses intersecting with a verse range into that verse range
let changed = null;
do {
    changed = false;
    for (const overlap of overlaps) {
        const overlapArray = Array.from(overlap);
        const chapter = parseInt(overlapArray[0].split(':')[0]);
        let minV = 200;
        let maxV = 0;
        for (const v of overlapArray.map(c => parseInt(c.split(':')[1]))) {
            if (v < minV) {
                minV = v;
            }
            if (v > maxV) {
                maxV = v;
            }
        }
        for (const uniqueCv of Array.from(uniqueCvs)) {
            const [uniqueChapter, uniqueVerse] = uniqueCv.split(":").map(val => parseInt(val));
            if (
                chapter === uniqueChapter &&
                uniqueVerse > minV &&
                uniqueVerse < maxV &&
                !overlap.has(uniqueCv)
            ) {
                overlap.add(uniqueCv);
                changed = true;
            }
        }
    }
} while (changed);

// Produce final JSON with the sentence/chunk/word position at which to display each verse or verse range
let cv = "";
let ret = [];
for (const sentence of jxlJson) {
    ret.push({});
    for (const [nChunkSource, chunkSources] of sentence.chunks.map(c => c.source).entries()) {
        for (const [nChunkWord, chunkWordCv] of chunkSources.map(cs => cs.cv).entries()) {
            let newCv = null;
            for (const verseSet of overlaps) {
                if (verseSet.has(chunkWordCv)) {
                    let minV = 200;
                    let maxV = 0;
                    const cvArray = Array.from(verseSet).map(cv => cv.split(':'));
                    for (const v of cvArray.map(cv=> parseInt(cv[1]))) {
                        if (v < minV) {
                            minV = v;
                        }
                        if (v > maxV) {
                            maxV = v;
                        }
                    }
                    newCv = `${cvArray[0][0]}:${minV}-${maxV}`;
                    break;
                }
            }
            newCv = newCv || chunkWordCv;
            if (newCv !== cv) {
                cv = newCv;
                ret[ret.length - 1][`${nChunkSource}-${nChunkWord}`] = cv;
            }
        }
    }
}
console.log(JSON.stringify(ret, null, 2));
