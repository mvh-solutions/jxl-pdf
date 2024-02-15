const path = require("path");
const {loadTemplates} = require("./helpers");
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
        const fileContent = fse.readFileSync(path.join(__dirname, "..", "static", "resources", filename));
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
