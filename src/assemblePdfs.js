const { PDFDocument, PageSizes } = require('pdf-lib');
const {loadTemplate, doPuppet} = require("./helpers");
const fontKit = require('fontkit');
const fse = require("fs-extra");
const path = require("path");

const doPageNumber = async ({options, numPages}) => {
    let masterTemplate = loadTemplate('page_number_master');
    let pageNumTemplate = loadTemplate('page_number_page');
    const pageNumberPages = [...Array(numPages).keys()];
    const pageNumbersHtml = pageNumberPages.map((pageNum) => pageNumTemplate.replace('%%PAGENUM%%', pageNum + 1)).join('');
    const content = masterTemplate
        .replace(
            "%%CONTENT%%",
            pageNumbersHtml
        )
    fse.writeFileSync(
        path.resolve(path.join(options.htmlPath, '__pageNumbers.html')),
        content
    );
    let pageNumbersPdfPath = path.resolve(path.join(options.pdfPath, '__pageNumbers.pdf'));
    await doPuppet({
        sectionId: "__pageNumbers",
        htmlPath: path.join(options.htmlPath, `__pageNumbers.html`),
        pdfPath: path.join(options.pdfPath, '__pageNumbers.pdf')
    });
    return pageNumbersPdfPath;
}

const makePageNumber = async ({options, pdfDoc, showPageArray, numPages}) => {
    const pageNumbersPdfPath = await doPageNumber({options, numPages});

    let pageNumbersPdf = await PDFDocument.load(fse.readFileSync(pageNumbersPdfPath));

    for (let i = 0; i < numPages; i++) {
        if (!showPageArray[i]) {
            continue;
        }
        let currentPdfPageToCopy = pageNumbersPdf.getPage(i);
        let page = pdfDoc.getPage(i);

        let preamble = await pdfDoc.embedPage(currentPdfPageToCopy);
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
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);

    for(let i = 0; i < manifestStep.numPages; i++) {
        currentPdfPageToCopy = manifestStep.pdf.getPage(i);

        // Embed the second page of the constitution and clip the preamble
        preamble = await pdfDoc.embedPage(currentPdfPageToCopy);

        page1 = pdfDoc.addPage(pageSize);
        page2 = pdfDoc.addPage(pageSize);

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
            y: page2.getHeight() / 2 - (currentPdfPageToCopy.getHeight() / 2),
        });
    }

    await pdfDoc.save();
    manifestStep.numPages *= 2;
    manifestStep.pdf = pdfDoc;
}

const makeFromSingle = async function(manifestStep, pageSize, fontBytes) {
    let currentPdfPageToCopy, preamble, page;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);

    for (let i = 0; i < manifestStep.numPages; i++) {
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

        const preamble = await manifestStep.pdf.embedPage(superimposePdf.getPages()[startOn === "recto" ? 0 : 1]);
        currentPage.drawPage(preamble);
    }

    manifestStep.pdf.save();
}

const assemblePdfs = async function (options) {
    const fontBytes = fse.readFileSync('./fonts/GentiumBookPlus-Regular.ttf');
    const manifest = fse.readJsonSync(path.join(options.workingDir, 'manifest.json'));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);

    let showPageArray = [];

    for (const pdfManifest of manifest) {
        const currentPath = path.join(options.pdfPath, `${pdfManifest.id}.pdf`)
        const currentPdfBytes = fse.readFileSync(currentPath);
        const currentPdf = await PDFDocument.load(currentPdfBytes);

        pdfManifest.pdf = currentPdf;
        pdfManifest.numPages = currentPdf.getPageCount();
    }

    // Add a blank pages to the documents
    let page;
    let currentPdfPageToCopy, preamble, docPdf;
    let numPages = 0;
    for (const manifestStep of manifest) {
        if (manifestStep.type === "superimpose") {
            continue
        }
        const superimposeStep = manifest.filter((s) => s.for === manifestStep.id)[0];

        // if we need to superimposes
        if (superimposeStep) {
            await makeSuperimposed(manifestStep, superimposeStep.pdf);
        }

        if (manifestStep.makeFromDouble) {
            await makeFromDouble(manifestStep, options.pageFormat, fontBytes);
        } else {
            await makeFromSingle(manifestStep, options.pageFormat, fontBytes);
        }

        const nextPageSide = numPages%2 === 0 ? "recto" : "verso";

        if (nextPageSide !== manifestStep.startOn) {
            pdfDoc.addPage(options.pageFormat);
            numPages += 1;
            showPageArray.push(false);
        }

        for (let i = 0; i < manifestStep.numPages; i++) {
            currentPdfPageToCopy = manifestStep.pdf.getPage(i);

            // Embed the second page of the constitution and clip the preamble
            preamble = await pdfDoc.embedPage(currentPdfPageToCopy);


            page = pdfDoc.addPage(options.pageFormat);
            page.drawPage(preamble);

            numPages += 1;
            showPageArray.push(manifestStep.showPageNumber);
        }
    }

    const pdfDocWithPageNum = await makePageNumber({options, pdfDoc, showPageArray, numPages});

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDocWithPageNum.save();
    fse.writeFileSync(options.output, pdfBytes);
}

module.exports = assemblePdfs;
