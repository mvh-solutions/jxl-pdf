const fse = require('fs-extra');
const path = require('path');

if (process.argv.length !== 3) {
    throw new Error('Wrong number of args\nUSAGE: node index.js <juxtaJson>');
}

const json = fse.readJsonSync(path.resolve(process.argv[2]));

for (const [sentenceN, sentence] of json.entries()) {
    for (const [chunkN, chunk] of sentence.chunks.entries()) {
        const greek = chunk.source.map(s => s.content).join(" ");
        console.log(`${sentenceN + 1}\t${chunkN + 1}\t${greek}\t${chunk.gloss}`);
    }
}
