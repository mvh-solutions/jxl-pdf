const path = require("path");
const {loadTemplates} = require("./helpers");
const fse = require("fs-extra");
const {
    do2ColumnSection,
    do4ColumnSpreadSection,
    doBookNoteSection,
    doFrontSection,
    doJxlSpreadSection,
    doBcvBibleSection,
    doParaBibleSection,
    doBiblePlusNotesSection
} = require("../src/sectionHandlers");

const doPdf = async ({configPath, outputDirName, cliBookCode}) => {
    const outputPath = path.resolve('static/html');

    let bookCode = null;
    const checkBookCode = (sectionId) => {
        if (!bookCode) {
            throw new Error(`bookCode not set for section '${sectionId}`);
        }
    }

    const templates = loadTemplates();
    const config = fse.readJsonSync(path.resolve(configPath));
    fse.mkdirsSync(path.join(outputPath, outputDirName, 'pdf'));

    let links = [];
    let manifest = [];

    const doSection = async (section, nested) => {
        nested && console.log(`## Section ${section.id.replace('%%bookCode%%', bookCode)} (${section.type} in setBooks)`);
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
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "jxlSpread":
                checkBookCode(section.id);
                await doJxlSpreadSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "4ColumnSpread":
                checkBookCode(section.id);
                await do4ColumnSpreadSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "2Column":
                checkBookCode(section.id);
                await do2ColumnSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "bookNote":
                checkBookCode(section.id);
                await doBookNoteSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "bcvBible":
                checkBookCode(section.id);
                await doBcvBibleSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "paraBible":
                checkBookCode(section.id);
                await doParaBibleSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
                );
                break;
            case "biblePlusNotes":
                checkBookCode(section.id);
                await doBiblePlusNotesSection(
                    {section, config, bookCode, outputDirName, outputPath, templates}
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
    }

    for (const section of config.sections) {
        console.log(`## Section ${section.id ? `${section.id} (${section.type})` : section.type}`);

        switch (section.type) {
            case "setBook":
                if (section.source && section.source === "cli" && cliBookCode) {
                    bookCode = cliBookCode;
                } else if (section.source && section.source === "literal" && section.bookCode) {
                    bookCode = section.bookCode;
                } else {
                    throw new Error(`Could not set bookCode using '${JSON.stringify(section)}': maybe you need to provide a bookCode at the command line?`);
                }
                console.log(`       bookCode = ${bookCode}`);
                break;
            case "setBooks":
                for (const bc of section.bookCodes) {
                    bookCode = bc;
                    console.log(`       bookCode = ${bookCode}`);
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
        path.join(outputPath, outputDirName, "index.html"),
        templates['web_index_page']
            .replace("%%LINKS%%", links.join("\n"))
    );
    fse.writeJsonSync(
        path.join(outputPath, outputDirName, 'pdf', "manifest.json"),
        manifest
    )
}

module.exports = doPdf;
