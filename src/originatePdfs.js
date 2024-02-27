const path = require("path");
const {loadTemplates, setupOneCSS, checkCssSubstitution} = require("./helpers");
const fse = require("fs-extra");
const {
    do2ColumnSection,
    do4ColumnSpreadSection,
    doBookNoteSection,
    doFrontSection,
    doJxlSpreadSection,
    doJxlSimpleSection,
    doBcvBibleSection,
    doParaBibleSection,
    doBiblePlusNotesSection
} = require("./sectionHandlers");
const setupCSS = options => {
    const cssFilenames = fse.readdirSync(path.join(__dirname, "..", "static", "resources"))
        .filter(name => name.endsWith(".css"));
    for (const filename of cssFilenames) {
        let fileContent = fse.readFileSync(path.join(__dirname, "..", "static", "resources", filename)).toString();
        const pageFormat = options.pageFormat;
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        const pageBodyWidth = pageFormat.pageSize[0] - (pageFormat.margins.inner[spaceOption] + pageFormat.margins.outer[spaceOption]);
        for (const [placeholder, value] of [
            ["PAGEWIDTH", pageFormat.pageSize[0]],
            ["PAGEBODYWIDTH", pageBodyWidth],
            ["DOUBLEPAGEWIDTH", pageFormat.pageSize[0] * 2],
            ["PAGEHEIGHT", pageFormat.pageSize[1]],
            ["MARGINTOP", pageFormat.margins.top[spaceOption]],
            ["FIRSTPAGEMARGINTOP", pageFormat.margins.firstPageTop[spaceOption]],
            ["MARGINBOTTOM", pageFormat.margins.bottom[spaceOption]],
            ["FOOTEROFFSET", pageFormat.footerOffset[spaceOption]],
            ["MARGININNER", pageFormat.margins.inner[spaceOption]],
            ["DOUBLEMARGININNER", pageFormat.margins.inner[spaceOption] * 2],
            ["MARGINOUTER", pageFormat.margins.outer[spaceOption]],
            ["PAGENUMBERTOPMARGIN", (pageFormat.pageSize[1] + pageFormat.footerOffset[spaceOption]) - pageFormat.margins.bottom[spaceOption]],
            ["COLUMNGAP", pageFormat.columnGap[spaceOption]],
            ["HALFCOLUMNGAP", pageFormat.columnGap[spaceOption] / 2],
            ["2COLUMNWIDTH", (pageBodyWidth - pageFormat.columnGap[spaceOption]) / 2],
            ["3COLUMNWIDTH", (pageBodyWidth - (pageFormat.columnGap[spaceOption] * 2)) / 3],
            ["BODYFONT", options.fonts.body],
            ["BODYFONT2", options.fonts.body2 || options.fonts.body],
            ["HEADINGFONT", options.fonts.heading],
            ["FOOTNOTEFONT", options.fonts.footnote],
            ["GREEKFONT", options.fonts.greek],
            ["HEBREWFONT", options.fonts.hebrew],
            ["BODYFONTSIZE", options.fontSizes.body.font],
            ["BODYLINEHEIGHT", options.fontSizes.body.height],
            ["DOUBLEBODYLINEHEIGHT", options.fontSizes.body.height * 2],
            ["BODYHALFLINEHEIGHT", options.fontSizes.body.height],
            ["BODYBOTTOMMARGIN", options.fontSizes.body.bottomMargin],
            ["BODYBOTTOMBORDERWIDTH", options.fontSizes.body.bottomBorderWidth],
            ["BODYBOTTOMPADDING", options.fontSizes.body.bottomPadding],
            ["H4FONTSIZE", options.fontSizes.h4.font],
            ["H4LINEHEIGHT", options.fontSizes.h4.height],
            ["H4HALFLINEHEIGHT", options.fontSizes.h4.height],
            ["H4BOTTOMMARGIN", options.fontSizes.h4.bottomMargin],
            ["H4BOTTOMBORDERWIDTH", options.fontSizes.h4.bottomBorderWidth],
            ["H4BOTTOMPADDING", options.fontSizes.h4.bottomPadding],
            ["H3FONTSIZE", options.fontSizes.h3.font],
            ["H3LINEHEIGHT", options.fontSizes.h3.height],
            ["H3HALFLINEHEIGHT", options.fontSizes.h3.height],
            ["H3BOTTOMMARGIN", options.fontSizes.h3.bottomMargin],
            ["H3BOTTOMBORDERWIDTH", options.fontSizes.h3.bottomBorderWidth],
            ["H3BOTTOMPADDING", options.fontSizes.h3.bottomPadding],
            ["H2FONTSIZE", options.fontSizes.h2.font],
            ["H2LINEHEIGHT", options.fontSizes.h2.height],
            ["H2HALFLINEHEIGHT", options.fontSizes.h2.height],
            ["H2BOTTOMMARGIN", options.fontSizes.h2.bottomMargin],
            ["H2BOTTOMBORDERWIDTH", options.fontSizes.h2.bottomBorderWidth],
            ["H2BOTTOMPADDING", options.fontSizes.h2.bottomPadding],
            ["H1FONTSIZE", options.fontSizes.h1.font],
            ["H1LINEHEIGHT", options.fontSizes.h1.height],
            ["H1HALFLINEHEIGHT", options.fontSizes.h1.height],
            ["H1BOTTOMMARGIN", options.fontSizes.h1.bottomMargin],
            ["H1BOTTOMBORDERWIDTH", options.fontSizes.h1.bottomBorderWidth],
            ["H1BOTTOMPADDING", options.fontSizes.h1.bottomPadding],
            ["FOOTNOTEFONTSIZE", options.fontSizes.footnote.font],
            ["FOOTNOTELINEHEIGHT", options.fontSizes.footnote.height],
            ["FOOTNOTEHALFLINEHEIGHT", options.fontSizes.footnote.height],
            ["FOOTNOTEBOTTOMMARGIN", options.fontSizes.footnote.bottomMargin],
            ["FOOTNOTEBOTTOMBORDERWIDTH", options.fontSizes.footnote.bottomBorderWidth],
            ["FOOTNOTEBOTTOMPADDING", options.fontSizes.footnote.bottomPadding],
            ["FOOTNOTECALLEROFFSET", options.fontSizes.body.font - options.fontSizes.footnote.font],
            ["RULEPADDING", options.fontSizes.rule.bottomPadding],
            ["RULEWIDTH", options.fontSizes.rule.bottomBorderWidth],
            ["RULEMARGIN", options.fontSizes.rule.bottomMargin],
        ]) {
            fileContent = setupOneCSS(fileContent, placeholder, "%%", value);
        }
        checkCssSubstitution(filename, fileContent,"%%");
        fse.writeFileSync(path.join(options.workingDir, "html", "resources", filename), fileContent);
    }
    options.verbose && console.log(`   ${cssFilenames.length} CSS file(s) customized`);
}

const originatePdfs = async options => {
    // Set up workspace - options.workingDir should already exist
    fse.mkdirsSync(options.htmlPath);
    fse.mkdirsSync(path.join(options.workingDir, "html", "resources"));
    setupCSS(options);
    fse.copySync(path.join(__dirname, "..", "static", "resources", "paged.polyfill.js"), path.join(options.workingDir, "html", "resources", "paged.polyfill.js"));
    fse.mkdirsSync(path.join(options.workingDir, "html", "page_resources"));
    fse.copySync(path.join(__dirname, "..", "static", "page_resources"), path.join(options.workingDir, "html", "page_resources"));
    fse.mkdirsSync(options.pdfPath);

    const checkBookCode = (sectionId) => {
        if (!bookCode) {
            throw new Error(`bookCode not set for section '${sectionId}`);
        }
    }

    const templates = loadTemplates();

    let links = [];
    let manifest = [];
    let bookCode = null;

    const doSection = async (section, nested) => {
        options.verbose && nested && console.log(`   Section ${section.id.replace('%%bookCode%%', bookCode)} (${section.type} in setBooks)`);
        if (section.forceSkip) {
            options.verbose && console.log(`      Force skip in config file; continuing...`);
            return;
        }
        links.push(
            templates['web_index_page_link']
                .replace(/%%ID%%/g, section.id.replace('%%bookCode%%', bookCode))
        );
        if (["4ColumnSpread", "2Column"].includes(section.type)) {
            links.push(
                templates['web_index_page_link']
                    .replace(/%%ID%%/g, `${section.id.replace('%%bookCode%%', bookCode)}_superimpose`)
            );
            manifest.push({
                id: `${section.id.replace('%%bookCode%%', bookCode)}_superimpose`,
                type: "superimpose",
                for: section.id.replace('%%bookCode%%', bookCode)
            });
        }
        switch (section.type) {
            case "front":
                await doFrontSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "jxlSpread":
                checkBookCode(section.id);
                await doJxlSpreadSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "jxlSimple":
                checkBookCode(section.id);
                await doJxlSimpleSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "4ColumnSpread":
                checkBookCode(section.id);
                await do4ColumnSpreadSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "2Column":
                checkBookCode(section.id);
                await do2ColumnSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "bookNote":
                checkBookCode(section.id);
                await doBookNoteSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "bcvBible":
                checkBookCode(section.id);
                await doBcvBibleSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "paraBible":
                checkBookCode(section.id);
                await doParaBibleSection(
                    {section, templates, bookCode, options}
                );
                break;
            case "biblePlusNotes":
                checkBookCode(section.id);
                await doBiblePlusNotesSection(
                    {section, templates, bookCode, options}
                );
                break;
            default:
                throw new Error(`Unknown section type '${section.type}' (id '${section.id}')`);
        }
        manifest.push({
            id: section.id.replace('%%bookCode%%', bookCode),
            type: section.type,
            startOn: section.startOn,
            showPageNumber: section.showPageNumber,
            makeFromDouble: ["jxlSpread", "4ColumnSpread"].includes(section.type)
        });
        if (section.forceQuit) {
            console.log("** Force quit in config file **");
            process.exit(0);
        }
    }

    for (const section of options.configContent.sections) {
        options.verbose && console.log(`   Section ${section.id ? `${section.id} (${section.type})` : section.type}`);

        switch (section.type) {
            case "setBook":
                if (section.source && section.source === "cli" && options.book) {
                    bookCode = options.book;
                } else if (section.source && section.source === "literal" && section.bookCode) {
                    bookCode = section.bookCode;
                } else {
                    throw new Error(`Could not set bookCode using '${JSON.stringify(section)}': maybe you need to provide a bookCode at the command line?`);
                }
                options.verbose && console.log(`      bookCode = ${bookCode} (from 'setBook')`);
                break;
            case "setBooks":
                for (const bc of section.bookCodes) {
                    bookCode = bc;
                    options.verbose && console.log(`      bookCode = ${bookCode} (from 'setBooks')`);
                    for (const section2 of section.sections) {
                        await doSection(section2, true);
                    }
                    bookCode = null;
                }
                break;
            default:
                await doSection(section, false);
        }
    }
    fse.writeFileSync(
        path.join(options.htmlPath, "index.html"),
        templates['web_index_page']
            .replace("%%LINKS%%", links.join("\n"))
    );
    fse.writeJsonSync(
        options.manifestPath,
        manifest
    )
}

module.exports = originatePdfs;
