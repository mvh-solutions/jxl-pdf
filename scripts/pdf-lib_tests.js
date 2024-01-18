// import { PDFDocument, CustomFontEmbedder, rgb } from 'pdf-lib';
const { PDFDocument, PageSizes } = require('pdf-lib');
var fontkit = require('fontkit');

// open a font synchronously
const fse = require("fs-extra");
// const { S } = require('../lib/pdfjs/build/pdf.worker');

// {
//     left: 55,
//     bottom: 485,
//     right: 300,
//     top: 575,
// }

const PAGE_SIZES = {
    "A0" : PageSizes.A0,
    "A1" : PageSizes.A1,
    "A2" : PageSizes.A2,
    "A3" : PageSizes.A3,
    "A4" : PageSizes.A4,
    "A5" : PageSizes.A5,
    "A6" : PageSizes.A6,
    "A7" : PageSizes.A7,
    "LETTER" : PageSizes.Letter,
    "letter" : PageSizes.Letter,
    "EXECUTIVE" : [504.0, 720.0],
    "EXECUTIVE_LULU_WITH_BLEED" : [521.57, 737.0]
}

const EXECUTIVE = PAGE_SIZES["EXECUTIVE_LULU_WITH_BLEED"];

const makePdf = async function (dirName="output") {
    const fontBytes = fse.readFileSync('./fonts/GentiumBookPlus-Regular.ttf');

    const fullPath = './static/html/' + dirName + '/pdf/';
    const manifest = fse.readJsonSync(fullPath + 'manifest.json');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    let currentPdf, currentPdfBytes, currentPath;
    let pageNumTotal = 0;
    let pdfDict = {};
    let pdfArray = [];


    for(let obj of manifest) {
        currentPath = fullPath + obj.id + '.pdf';
        currentPdfBytes = fse.readFileSync(currentPath);
        currentPdf = await PDFDocument.load(currentPdfBytes);
        pdfDict[obj.id] = currentPdf;
        pdfArray.push(currentPdf);

        pageNumTotal += currentPdf.getPageCount();
    }

    // Add a blank pages to the documents
    let page;
    let currentNbPages, currentPdfPageToCopy, preamble, preambleDims;
    for(let docPdfs of pdfArray) {
        currentNbPages = docPdfs.getPageCount();
        for(let i = 0; i < currentNbPages; i++) {
            currentPdfPageToCopy = docPdfs.getPage(i);
            
            // Embed the second page of the constitution and clip the preamble
            preamble = await pdfDoc.embedPage(currentPdfPageToCopy);
            // preambleDims = preamble.scale(1)

            page = pdfDoc.addPage(EXECUTIVE);
            page.drawPage(preamble, {
                xScale: 1,
                yScale: 1,
                x: page.getWidth() / 2 - currentPdfPageToCopy.getWidth() / 2,
                y: page.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2 - 50,
            })
        }

    }

    // Get the width and height of the page
    // const { width, height } = page.getSize();


    console.log("pdfDoc.getPageCount() ==", pdfDoc.getPageCount());
    console.log("pageNumTotal ==", pageNumTotal);
    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    fse.writeFileSync("my_final_pdf.pdf", pdfBytes);
}

makePdf('output');
module.exports = makePdf;