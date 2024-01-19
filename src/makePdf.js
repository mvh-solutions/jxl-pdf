// import { PDFDocument, CustomFontEmbedder, rgb } from 'pdf-lib';
const { PDFDocument, PageSizes } = require('pdf-lib');
const {loadTemplate, doPuppet} = require("./helpers");
var fontkit = require('fontkit');

// open a font synchronously
const fse = require("fs-extra");
const path = require("path");

// {
//     left: 55,
//     bottom: 485,
//     right: 300,
//     top: 575,
// }


const doPageNumber = async ({outputDirName, outputPath, numPages}) => {
    let masterTemplate = loadTemplate('page_number_master');
    let pageNumTemplate = loadTemplate('page_number_page');
    const pageNumberPages = [...Array(numPages).keys()];
    const pageNumbersHtml = pageNumberPages.map((pageNum) => pageNumTemplate.replace('%%PAGENUM%%', pageNum+1)).join('');
    const content = masterTemplate
        .replace(
            "%%CONTENT%%",
            pageNumbersHtml
        )
    fse.writeFileSync(
        path.resolve(path.join(outputPath, outputDirName, '__pageNumbers.html')),
        content
    );
    let fullPathPdf = path.resolve(path.join(outputPath, outputDirName, 'pdf', '__pageNumbers.pdf'));
    await doPuppet(
        '__pageNumbers',
        fullPathPdf,
        true,
        outputDirName
    );
    
    return fullPathPdf;
}

const makePageNumber = async (pdfDoc, showPageArray, dirName, numPages) => {
    const fullPathPageNum = await doPageNumber({outputDirName: dirName, outputPath: './static/html/', numPages});

    let currentPdfBytes = fse.readFileSync(fullPathPageNum);
    let currentPdf = await PDFDocument.load(currentPdfBytes);
    let currentPdfPageToCopy, page, preamble;

    for(let i = 0; i < numPages; i++) {
        if(!showPageArray[i]) continue;
        currentPdfPageToCopy = currentPdf.getPage(i);
        page = pdfDoc.getPage(i);
        
        preamble = await pdfDoc.embedPage(currentPdfPageToCopy);
        page.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: page.getWidth() / 2 - currentPdfPageToCopy.getWidth() / 2,
            y: page.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2,
        });
    }

    await pdfDoc.save();
    return pdfDoc;
}



const makeFromDouble = async function(manifestStep, pageSize, fontBytes) {
    let currentPdfPageToCopy, preamble, page1,page2;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    for(let i = 0; i < manifestStep.numPages; i++) {
        currentPdfPageToCopy = manifestStep.pdf.getPage(i);
        
        // Embed the second page of the constitution and clip the preamble
        preamble = await pdfDoc.embedPage(currentPdfPageToCopy);
        
        page1 = pdfDoc.addPage(pageSize);
        page2 = pdfDoc.addPage(pageSize);


        // console.log("x ==", -(PageSizes.A3[1] - (pageSize[0] * 2))/2);
        page1.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: -(PageSizes.A3[1] - (pageSize[0] * 2))/2,
            y: page1.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2,
        });

        page2.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: -((PageSizes.A3[1] - (pageSize[0] * 2))/2 + pageSize[0]),
            y: page2.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2,
        });
    }

    await pdfDoc.save();
    manifestStep.numPages *= 2;
    manifestStep.pdf = pdfDoc;
}

const makeFromSingle = async function(manifestStep, pageSize, fontBytes) {
    let currentPdfPageToCopy, preamble, page;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    await pdfDoc.embedFont(fontBytes);

    for(let i = 0; i < manifestStep.numPages; i++) {
        currentPdfPageToCopy = manifestStep.pdf.getPage(i);
        
        // Embed the second page of the constitution and clip the preamble
        preamble = await pdfDoc.embedPage(currentPdfPageToCopy);

        
        page = pdfDoc.addPage(pageSize);
        page.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: page.getWidth() / 2 - currentPdfPageToCopy.getWidth() / 2,
            y: page.getHeight() / 2 - currentPdfPageToCopy.getHeight() / 2,
        });
    }

    await pdfDoc.save();
    manifestStep.pdf = pdfDoc;
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
}

const makePdf = async function ({dirName="output", pageSize=[521.57, 737.0]}) {
    if(pageSize[0] < 72 || pageSize[1] < 72 || pageSize[0] > 841.89 || pageSize[1] > 1190.55) {
        throw new Error(`Illegal pageSize : ${pageSize[0]} x ${pageSize[1]}`);
    }
    const fontBytes = fse.readFileSync('./fonts/GentiumBookPlus-Regular.ttf');

    const fullPath = './static/html/' + dirName + '/pdf/';
    
    const manifest = fse.readJsonSync(fullPath + 'manifest.json');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    let currentPdf, currentPdfBytes, currentPath;
    let showPageArray = [];

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
        superimposeStep = manifest.filter((s) => s.for === manifestStep.id)[0];
        
        // if we need to superimposes
        if(superimposeStep) {
            await makeSuperimposed(manifestStep, superimposeStep.pdf);
        }
        
        if(manifestStep.makeFromDouble) {
            await makeFromDouble(manifestStep, pageSize, fontBytes);
        } else {
            await makeFromSingle(manifestStep, pageSize, fontBytes);
        }

        nextPageSide = numPages%2 == 0 ? "recto" : "verso";

        if(nextPageSide !== manifestStep.startOn) {
            pdfDoc.addPage(pageSize);
            numPages += 1;
            showPageArray.push(false);
        }

        for(let i = 0; i < manifestStep.numPages; i++) {
            currentPdfPageToCopy = manifestStep.pdf.getPage(i);
            
            // Embed the second page of the constitution and clip the preamble
            preamble = await pdfDoc.embedPage(currentPdfPageToCopy);

            
            page = pdfDoc.addPage(pageSize);
            page.drawPage(preamble);

            numPages += 1;
            showPageArray.push(manifestStep.showPageNumber);
        }
    }
    
    const pdfDocWithPageNum = await makePageNumber(pdfDoc, showPageArray, dirName, numPages);

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDocWithPageNum.save();
    fse.writeFileSync("output/my_final_pdf_with_pageNum.pdf", pdfBytes);
}

makePdf({dirName:"output"});
module.exports = makePdf;