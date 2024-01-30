const {
    PDFDocument,
    PageSizes
} = require('pdf-lib');
const {
    loadTemplate,
    doPuppet
} = require("./helpers");
const fontKit = require('fontkit');
const fse = require("fs-extra");
const path = require("path");

/**
 * Generates HTML for page numbers and converts it to a PDF.
 * @param {Object} params - Parameters for generating page numbers.
 *   - options: Object - Configuration options including paths and verbose flag.
 *   - numPages: number - Total number of pages.
 * @returns {Promise<string>} - Path to the generated page numbers PDF.
 */
const doPageNumber = async ({
    options,
    numPages
}) => {
    const masterTemplate = loadTemplate('page_number_master');
    const pageNumTemplate = loadTemplate('page_number_page');
    const pageNumbersHtml = [...Array(numPages).keys()]
        .map((pageNum) => pageNumTemplate
            .replace('%%PAGENUM%%', pageNum + 1)).join('');
    fse.writeFileSync(
        path.resolve(path.join(options.htmlPath, '__pageNumbers.html')),
        masterTemplate
        .replace(
            "%%CONTENT%%",
            pageNumbersHtml
        )
    );
    const pageNumbersPdfPath = path.resolve(path.join(options.pdfPath, '__pageNumbers.pdf'));
    await doPuppet({
        verbose: options.verbose,
        htmlPath: path.join(options.htmlPath, `__pageNumbers.html`),
        pdfPath: pageNumbersPdfPath
    });
    return pageNumbersPdfPath;
}

/**
 * Adds page numbers to the given PDF document.
 * @param {Object} params - Parameters for adding page numbers.
 *   - options: Object - Configuration options.
 *   - pdfDoc: PDFDocument - The PDF document to modify.
 *   - showPageNumbersArray: boolean[] - Array indicating which pages to number.
 *   - numPages: number - Total number of pages.
 * @returns {Promise<PDFDocument>} - The modified PDF document with page numbers.
 */
const makePageNumber = async ({
    options,
    pdfDoc,
    showPageNumbersArray,
    numPages
}) => {
    const pageNumbersPdfPath = await doPageNumber({
        options,
        numPages
    });
    const pageNumbersPdf = await PDFDocument.load(fse.readFileSync(pageNumbersPdfPath));
    for (let i = 0; i < numPages; i++) {
        if (!showPageNumbersArray[i]) {
            continue;
        }
        const numbersPage = pageNumbersPdf.getPage(i);
        const contentPage = pdfDoc.getPage(i);
        const preamble = await pdfDoc.embedPage(numbersPage);
        contentPage.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: contentPage.getWidth() / 2 - numbersPage.getWidth() / 2,
            y: contentPage.getHeight() / 2 - numbersPage.getHeight() / 2,
        });
    }
    await pdfDoc.save();
    return pdfDoc;
}

/**
 * Creates a PDF from double pages of the source PDF.
 * @param {JSON} manifestStep - Information about the PDF processing step.
 * @param {Array<number>} pageSize - The size of the page to create.
 * @param {Uint8Array} fontBytes - The font data for the PDF.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
const makeFromDouble = async function (manifestStep, pageSize, fontBytes) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);
    for (let i = 0; i < manifestStep.numPages; i++) {
        const pdfPageToCopy = manifestStep.pdf.getPage(i);

        // Embed the second page and clip the preamble
        const preamble = await pdfDoc.embedPage(pdfPageToCopy);
        const page1 = pdfDoc.addPage(pageSize);
        const page2 = pdfDoc.addPage(pageSize);
        page1.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: -(PageSizes.A3[1] - (pageSize[0] * 2)) / 2,
            y: page1.getHeight() / 2 - pdfPageToCopy.getHeight() / 2,
        });
        page2.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: -((PageSizes.A3[1] - (pageSize[0] * 2)) / 2 + pageSize[0]),
            y: page2.getHeight() / 2 - (pdfPageToCopy.getHeight() / 2),
        });
    }
    await pdfDoc.save();
    manifestStep.numPages *= 2;
    manifestStep.pdf = pdfDoc;
}

/**
 * Creates a PDF from single pages of the source PDF.
 * @param {Object} manifestStep - Information about the PDF processing step.
 * @param {Array<number>} pageSize - The size of the page to create.
 * @param {Uint8Array} fontBytes - The font data for the PDF.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
const makeFromSingle = async function (manifestStep, pageSize, fontBytes) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);
    for (let i = 0; i < manifestStep.numPages; i++) {
        const pdfPageToCopy = manifestStep.pdf.getPage(i);

        // Embed the page and clip the preamble
        const preamble = await pdfDoc.embedPage(pdfPageToCopy);
        const page = pdfDoc.addPage(pageSize);
        page.drawPage(preamble, {
            xScale: 1,
            yScale: 1,
            x: page.getWidth() / 2 - pdfPageToCopy.getWidth() / 2,
            y: page.getHeight() / 2 - pdfPageToCopy.getHeight() / 2,
        });
    }
    await pdfDoc.save();
    manifestStep.pdf = pdfDoc;
}

/**
 * Superimposes content from one PDF onto another.
 * @param {JSON} manifestStep - Information about the source PDF.
 * @param {PDFDocument} superimposePdf - The PDF document to superimpose.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
const makeSuperimposed = async function (manifestStep, superimposePdf) {
    let currentPage;
    let startOn = manifestStep.startOn;
    for (let i = 1; i < manifestStep.numPages; i++) {
        currentPage = manifestStep.pdf.getPage(i);
        startOn = startOn === "recto" ? "verso" : "recto";
        const preamble = await manifestStep.pdf.embedPage(superimposePdf.getPages()[startOn === "recto" ? 0 : 1]);
        currentPage.drawPage(preamble);
    }
    manifestStep.pdf.save();
}

/**
 * Assembles a single PDF from multiple sources based on a manifest file. 
 * The final PDF is saved to the specified output location.
 * 
 * @param {object} options - Configuration for assembling PDFs.
 *   Includes:
 *   - workingDir: Directory path for temporary files.
 *   - pdfPath: Path where source PDFs are located.
 *   - output: Output file path for the assembled PDF.
 *   - pageFormat: Format specification for pages in the PDF.
 *   - verbose: Boolean to enable verbose logging.
 */
const assemblePdfs = async function (options) {
    const fontBytes = fse.readFileSync('./fonts/GentiumBookPlus-Regular.ttf');
    const manifest = fse.readJsonSync(path.join(options.workingDir, 'manifest.json'));
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontKit);
    await pdfDoc.embedFont(fontBytes);
    let showPageNumbersArray = [];
    // Store original PDFs in manifest dictionary
    options.verbose && console.log(`      Augment manifest`);
    for (const manifestStep of manifest) {
        const currentPath = path.join(options.pdfPath, `${manifestStep.id}.pdf`)
        const currentPdfBytes = fse.readFileSync(currentPath);
        const currentPdf = await PDFDocument.load(currentPdfBytes);
        manifestStep.pdf = currentPdf;
        manifestStep.numPages = currentPdf.getPageCount();
    }

    let numPages = 0;
    options.verbose && console.log(`      Manifest steps`);
    for (const manifestStep of manifest) {
        // Loop over non-superimpose steps
        if (manifestStep.type === "superimpose") {
            continue
        }
        options.verbose && console.log(`         ${manifestStep.id} - ${manifestStep.numPages} originated page(s)`);

        // if we need to superimposes
        const superimposeStep = manifest.filter((s) => s.for === manifestStep.id)[0];
        if (superimposeStep) {
            options.verbose && console.log(`            Superimpose`);
            await makeSuperimposed(manifestStep, superimposeStep.pdf);
        }

        // Chop up single or double pages
        if (manifestStep.makeFromDouble) {
            options.verbose && console.log(`            Double Pages`);
            await makeFromDouble(manifestStep, options.pageFormat, fontBytes);
        } else {
            options.verbose && console.log(`            Single Pages`);
            await makeFromSingle(manifestStep, options.pageFormat, fontBytes);
        }

        // Add blank pages to the documents to respect start side
        const nextPageSide = numPages % 2 === 0 ? "recto" : "verso";
        if (nextPageSide !== manifestStep.startOn) {
            options.verbose && console.log(`            Add blank page to start on ${nextPageSide}`);
            pdfDoc.addPage(options.pageFormat);
            numPages += 1;
            showPageNumbersArray.push(false);
        }

        for (let i = 0; i < manifestStep.numPages; i++) {
            const pdfPageToCopy = manifestStep.pdf.getPage(i);

            // Embed the content and clip the preamble
            const preamble = await pdfDoc.embedPage(pdfPageToCopy);
            const page = pdfDoc.addPage(options.pageFormat);
            page.drawPage(preamble);
            numPages += 1;
            showPageNumbersArray.push(manifestStep.showPageNumber);
        }
    }

    // Generate page numbers PDF and merge with content PDF
    options.verbose && console.log(`   Add page numbers`);
    const pdfDocWithPageNum = await makePageNumber({
        options,
        pdfDoc,
        showPageNumbersArray,
        numPages
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDocWithPageNum.save();
    fse.writeFileSync(options.output, pdfBytes);
    options.verbose && console.log(`   Assembled PDF (with ${pdfDocWithPageNum.getPageCount()} pages) written to ${options.output}`);
}

module.exports = assemblePdfs;