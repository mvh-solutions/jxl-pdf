const fse = require("fs-extra");
const path = require("path");
const {Proskomma} = require('proskomma-core');

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

const pkWithDocs = (bookCode, docSpecs, verbose=false) => {
    const pk = new Proskomma();
    verbose && console.log("     Loading USFM into Proskomma");
    for (const docSpec of docSpecs) {
        verbose && console.log(`       ${docSpec.id}`);
        const matchingBookUsfm = fse.readdirSync(path.resolve(docSpec.path)).filter(f => f.includes(bookCode)) [0];
        if (!matchingBookUsfm) {
            throw new Error(`No match for bookCode '${bookCode}' in ${docSpec.id} in directory '${docSpec.path}'`)
        }
        const contentString = fse.readFileSync(path.resolve(path.join(docSpec.path, `${matchingBookUsfm}`))).toString();
        const [lang, abbr] = docSpec.id.split('_');
        pk.importDocument({lang, abbr}, 'usfm', contentString);
    }
    return pk;
}

module.exports = {
    getBookName,
    pkWithDocs
}
