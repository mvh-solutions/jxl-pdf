const {pkWithDocs, getBookName, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const {SofriaRenderFromProskomma, render} = require("proskomma-json-tools");

const doParaBibleSection = async ({section, templates, bookCode, options}) => {
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
        path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
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
    await doPuppet({
        sectionId: section.id.replace('%%bookCode%%', bookCode),
        htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
    });
}

module.exports = doParaBibleSection;
