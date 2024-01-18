// import { PDFDocument, CustomFontEmbedder, rgb } from 'pdf-lib';
const { PDFDocument, PageSizes } = require('pdf-lib');
var fontkit = require('fontkit');

// open a font synchronously
const fse = require("fs-extra");

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

const makeFromDouble = function(manifestStep) {
    return manifestStep.pdf;
}

const makeSuperimposed = async function(manifestStep, superimposePdf) {
    let currentPage;
    let startOn = manifestStep.startOn;
    for(let i = 1; i < manifestStep.numPages; i++) {
        currentPage = manifestStep.pdf.getPage(i);
        startOn = startOn === "recto" ? "verso" : "recto";

        preamble = await manifestStep.pdf.embedPage(superimposePdf.getPages()[startOn === "recto" ? 0 : 1]);
        currentPage.drawPage(preamble);
    }

    manifestStep.pdf.save();
    // return manifestStep.pdf;
}

const makePdf = async function (dirName="output") {
    const fontBytes = fse.readFileSync('./fonts/GentiumBookPlus-Regular.ttf');

    const fullPath = './static/html/' + dirName + '/pdf/';
    const manifest = fse.readJsonSync(fullPath + 'manifest.json');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    let currentPdf, currentPdfBytes, currentPath;


    for(const pdfManifest of manifest) {
        currentPath = fullPath + pdfManifest.id + '.pdf';
        currentPdfBytes = fse.readFileSync(currentPath);
        currentPdf = await PDFDocument.load(currentPdfBytes);

        pdfManifest.pdf = currentPdf;
        pdfManifest.numPages = currentPdf.getPageCount();
    }

    // Add a blank pages to the documents
    let page;
    let currentPdfPageToCopy, preamble, docPdf;
    let numPages = 0;
    let nextPageSide;
    let superimposeStep;
    for(const manifestStep of manifest) {
        if(manifestStep.type === "superimpose") continue;
        superimposeStep = manifest.filter((s) => s.for = manifestStep.id)[0];
        
        // if we need to superimposes
        if(superimposeStep) {
            await makeSuperimposed(manifestStep, superimposeStep.pdf);
        }
        
        // const pdfBytes = await manifestStep.pdf.save();
        // fse.writeFileSync("base_pdf_" + manifestStep.id + ".pdf", pdfBytes);

        
        if (manifestStep.makeFromDouble) {
            // TODO if makeFromDouble
            manifestStep.pdf = makeFromDouble(manifestStep);
        }

        nextPageSide = numPages%2 == 0 ? "recto" : "verso";

        if(nextPageSide !== manifestStep.startOn) {
            pdfDoc.addPage(EXECUTIVE);
            numPages += 1;
        }

        for(let i = 0; i < manifestStep.numPages; i++) {
            currentPdfPageToCopy = manifestStep.pdf.getPage(i);
            
            // Embed the second page of the constitution and clip the preamble
            preamble = await pdfDoc.embedPage(currentPdfPageToCopy);

            
            page = pdfDoc.addPage(EXECUTIVE);
            page.drawPage(preamble, {
                xScale: 1,
                yScale: 1,
                x: page.getWidth() / 2 - currentPdfPageToCopy.getWidth() / 2,
                y: page.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2 - 50,
            });

            numPages += 1;

            // TODO showPageNumber
        }

    }

    // Get the width and height of the page
    // const { width, height } = page.getSize();

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    fse.writeFileSync("output/my_final_pdf.pdf", pdfBytes);
}

makePdf('output');
// module.exports = makePdf;