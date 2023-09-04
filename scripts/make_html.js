const path = require('path');
const fse = require('fs-extra');
const { Proskomma } = require('proskomma-core');

const cvForSentence = sentence => {
    const cvSet = new Set([]);
    sentence.chunks.forEach(c => c.source.forEach(se => cvSet.add(se.cv)));
    const cvValues = Array.from(cvSet);
    const cv1 = cvValues[0];
    const cv2 = cvValues[cvValues.length - 1];
    if (cv1 === cv2){
        return cv1;
    }
    const [c1, v1] = cv1.split(':');
    const [c2, v2] = cv2.split(':');
    if (c1 === c2) {
        return `${c1}:${v1}-${v2}`;
    }
    return `${cv1}-${cv2}`
};

const quoteForCv = (pk, docSetId, bookCode, cv) => {
    const cvRecord = pk
        .gqlQuerySync(`{docSet(id:"${docSetId}") { document(bookCode:"${bookCode}") {cv(chapterVerses: "${cv}") {tokens {payload scopes(startsWith: ["attribute/spanWithAtts/w/lemma"])}}}}}`)
        .data
        .docSet
        .document
        .cv
        .map(cvr => cvr.tokens)
        .reduce((a, b) => [...a, ...b], []);
    return cvRecord.map(cvr => cvr.payload.replace(/\\s/g, " ")).join('');
};

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

const usage = "USAGE: node make_html.js <configPath> <bookCode> <outputPath>";
if (process.argv.length !== 5) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const bookCode = process.argv[3];
const outputPath = path.resolve(process.argv[4]);
const config = fse.readJsonSync(configPath);
const jxlJson = fse.readJsonSync(path.join('data', config.jxl.path, `${bookCode}.json`));

const pk = new Proskomma();
console.log("Loading USFM into Proskomma");
for (const lhs of config.lhs) {
    console.log(`  ${lhs.id}`);
    const [lang, abbr] = lhs.id.split('_');
    const contentString = fse.readFileSync(path.join('data', lhs.id, `${bookCode}.usfm`)).toString();
    pk.importDocument({lang, abbr}, 'usfm', contentString);
}
const bookName = getBookName(pk, config.docIdForNames, bookCode);

const readTemplate = templateName => fse.readFileSync(path.join('src', 'templates', templateName + '.html')).toString();

const templates = {};
for (const template of ['index', 'sentence', 'greekLeft', 'transLeft', 'jxl', 'jxlRow']) {
    templates[template] = readTemplate(template);
}

let sentences = [];
for (const [sentenceN, sentenceJson] of jxlJson.entries()) {
    const cv = cvForSentence(sentenceJson);
    let leftContent = [];
    for (const content of config.lhs) {
        let sentence = templates[`${content.type}Left`]
            .replace('%%LABEL%%', content.label)
            .replace('%%CONTENT%%', quoteForCv(pk, content.id, bookCode, cv));
        leftContent.push(sentence);
    }
    let jxlRows = [];
    for (const chunk of sentenceJson.chunks) {
        const greek = chunk.source.map(s => s.content).join(' ');
        const gloss = chunk.gloss;
        const row = templates.jxlRow
            .replace('%%GREEK%%', greek)
            .replace('%%GLOSS%%', gloss);
        jxlRows.push(row);
    }
    const jxl = templates.jxl.replace('%%ROWS%%', jxlRows.join('\n'));
    const sentence = templates.sentence
        .replace('%%SENTENCEN%%', sentenceN + 1)
        .replace('%%NSENTENCES%%', jxlJson.length)
        .replace('%%BOOKNAME%%', bookName)
        .replace('%%SENTENCEREF%%', cv)
        .replace('%%LEFTCONTENT%%', leftContent.join('\n'))
        .replace('%%JXL%%', jxl);
    sentences.push(sentence);
}
const index = templates.index
    .replace('%%TITLE%%', `${bookCode} - ${configPath}`)
    .replace('%%SENTENCES%%', sentences.join(''));

fse.writeFileSync(path.resolve(outputPath), index);
