const {pkWithDocs, getBookName, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const {SofriaRenderFromProskomma, render} = require("proskomma-json-tools");

const Section = require('./section');

class paraBibleSection extends Section {

    requiresBook() {
        return true;
    }

    signature() {
        return {
            sectionType: "paraBible",
            requiresBook: true,
            fields: [
                {
                    id: "startOn",
                    label: {
                        en: "Start Page Side",
                        fr: "Côté pour première page"
                    },
                    typeLiteral: "verso",
                    nValues: [1, 1]
                },
                {
                    id: "showPageNumber",
                    label: {
                        en: "Show Page Number",
                        fr: "Afficher numéro de page"
                    },
                    typeName: "boolean",
                    nValues: [1, 1]
                },
                {
                    id: "scriptureText",
                    label: {
                        en: "Scripture Text Label",
                        "fr": "Etiquette pour texte biblique"
                    },
                    typeName: "string",
                    nValues: [1, 1]
                },
                {
                    id: "scriptureSrc",
                    label: {
                        en: "Scripture Text Source",
                        "fr": "Source pour texte biblique"
                    },
                    typeName: "translationText",
                    nValues: [1, 1]
                },
                {
                    id: "scriptureType",
                    label: {
                        en: "Scripture Text Type",
                        "fr": "Type de texte biblique"
                    },
                    typeEnum: [
                        {
                            id: "greek",
                            label: {
                                en: "Greek",
                                fr: "Grec"
                            },
                        },
                        {
                            id: "hebrew",
                            label: {
                                en: "Hebrew",
                                fr: "Hébreu"
                            },
                        },
                        {
                            id: "translation",
                            label: {
                                en: "Translation",
                                fr: "Traduction"
                            },
                        }
                    ],
                    nValues: [1, 1]
                },
            ]
        };
    }

    async doSection({section, templates, bookCode, options}) {
        const pk = pkWithDocs(bookCode, [section.text], options.verbose);
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
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = paraBibleSection;
