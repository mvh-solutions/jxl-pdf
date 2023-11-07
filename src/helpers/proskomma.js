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

module.exports = {
    getBookName,
    pkWithDocs
}
