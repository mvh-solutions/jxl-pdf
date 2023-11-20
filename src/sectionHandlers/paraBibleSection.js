const {pkWithDocs, getBookName, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const {SofriaRenderFromProskomma, render} = require("proskomma-json-tools");
const doParaBibleSection = async ({section, serverPort, bookCode, config, outputDirName, outputPath, templates}) => {
    const pk = pkWithDocs(bookCode, [section.text]);
    const bookName = getBookName(pk, section.text.id, bookCode);
    const notes = section.showNotes ? bcvNotes(config, bookCode) : {};
    const docId = pk.gqlQuerySync('{documents { id } }').data.documents[0].id;
    const actions = render.sofria2web.renderActions.sofria2WebActions;
    const renderers = render.sofria2web.sofria2html.renderers;
    const cl = new SofriaRenderFromProskomma({proskomma: pk, actions: actions, debugLevel: 0})
    const output = {};
    const sectionConfig = section.config;
    sectionConfig.renderers = renderers;
    sectionConfig.selectedBcvNotes = [];

    cl.renderDocument({docId, config: section.config, output});
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['para_bible_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                output.paras
            )
            .replace(
                "%%BOOKNAME%%",
                bookName
            )
    );
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}

module.exports = doParaBibleSection;
