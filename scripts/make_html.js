const path = require('path');
const fse = require('fs-extra');

const usage = "USAGE: node make_html.js <configPath> <outputPath>";
if (process.argv.length !== 4) {
    console.log(`Wrong number of arguments!\n${usage}`);
    process.exit(1);
}

const configPath = process.argv[2];
const outputPath = process.argv[3];

const readTemplate = templateName => fse.readFileSync(path.resolve(path.join('..', 'src', 'templates', templateName + '.html'))).toString();

const indexTemplate = readTemplate('index');
const sentenceTemplate = readTemplate('sentence');
const greekLeftTemplate = readTemplate('greekLeft');
const transLeftTemplate = readTemplate('transLeft');
const jxlTemplate = readTemplate('jxl');

const leftContent = greekLeftTemplate + transLeftTemplate.repeat(3);
const sentence = sentenceTemplate
    .replace('%%LEFTCONTENT%%', leftContent)
    .replace('%%JXL%%', jxlTemplate);

const index = indexTemplate.replace('%%SENTENCES%%', sentence.repeat(5));

fse.writeFileSync(path.resolve(outputPath), index);
