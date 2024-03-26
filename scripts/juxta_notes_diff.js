const fse = require('fs-extra');
const textDiff = require('text-diff');

const usage = "node scripts/juxta_notes_diff.js ~/repos/door43/fr_tn/fr_tn_51-PHP.tsv data/fra_tn/PHP.tsv data/jxl2note/PHP.tsv";

if (process.argv.length !== 5) {
    console.log(`Expected exactly four arguments\nUSAGE : ${usage}`);
    process.exit(1);
}
let hits = 0;
let misses = 0;
const differ = new(textDiff);

const tnData = fse.readFileSync(process.argv[2])
    .toString()
    .split("\n")
    .map(r => r.split('\t'));

const jxTnData = fse.readFileSync(process.argv[3])
    .toString()
    .split("\n")
    .map(r => r.split('\t'));

const jxCodes = fse.readFileSync(process.argv[4])
    .toString()
    .split("\n")
    .map(r => r.split('\t').reverse()[0])
    .filter(c => c)
    .map(c => c.split(';')
        .map(v => v.split("_")[3])
    )
    .reduce((a, b) => [...a, ...b])

for (const row of jxTnData) {
    if (row.length > 1) {
        const jxCode = row[3];
        if (jxCodes.includes(jxCode)) {
            hits++;
            const hitText = tnData.filter(r => r[3] === jxCode)[0][8];
            console.log(`${jxCode}\thit\t${row[6]}\t${hitText}\t${differ.main(hitText, row[6]).map(i => '[' + (i[0] === -1 ? "- " : i[0] === 1 ? "+ " : "= ") + i[1] +  ']').join(', ')}`);
        } else {
            misses++;
            console.log(`${row[3]}\tmiss`);
        }
    }
}
console.log(`${hits} hits, ${misses} misses`);
