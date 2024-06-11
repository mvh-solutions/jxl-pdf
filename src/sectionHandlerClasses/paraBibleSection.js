const {pkWithDocs, getBookName, bcvNotes, doPuppet} = require("../helpers");
const fse = require("fs-extra");
const path = require("path");
const {SofriaRenderFromProskomma, render} = require("proskomma-json-tools");

const Section = require('./section');

class paraBibleSection extends Section {

    requiresWrapper() {
        return ["bcv"];
    }

    signature() {
        return {
            sectionType: "paraBible",
            requiresWrapper: this.requiresWrapper(),
            fields: [
                {
                    id: "startOn",
                    label: {
                        en: "Start Page Side",
                        fr: "Côté pour première page"
                    },
                    typeLiteral: "recto",
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
                {
                    id: "showWordAtts",
                    typeLiteral: false,
                    label: {
                        en: "Show Word Atts",
                        fr: "Afficher attributs des mots"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showTitles",
                    typeName: "boolean",
                    label: {
                        en: "Show Titles",
                        fr: "Afficher titres de livre"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showHeadings",
                    typeName: "boolean",
                    label: {
                        en: "Show Headings",
                        fr: "Afficher titres de section"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showIntroductions",
                    typeName: "boolean",
                    label: {
                        en: "Show Introductions",
                        fr: "Afficher introductions"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showFootnotes",
                    typeName: "boolean",
                    label: {
                        en: "Show Footnotes",
                        fr: "Afficher notes de bas de page"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showXrefs",
                    typeName: "boolean",
                    label: {
                        en: "Show Cross-references",
                        fr: "Afficher références croisées"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showXrefs",
                    typeName: "boolean",
                    label: {
                        en: "Show Cross-references",
                        fr: "Afficher références croisées"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showParaStyles",
                    typeName: "boolean",
                    label: {
                        en: "Show Paragraph Styles",
                        fr: "Afficher styles de paragraphes"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showCharacterMarkup",
                    typeName: "boolean",
                    label: {
                        en: "Show Character Markup",
                        fr: "Afficher styles de caractère"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showChapterLabels",
                    typeName: "boolean",
                    label: {
                        en: "Show Chapter Numbers",
                        fr: "Afficher numéros de chapitre"
                    },
                    nValues: [1, 1]
                },
                {
                    id: "showVersesLabels",
                    typeName: "boolean",
                    label: {
                        en: "Show Verse Numbers",
                        fr: "Afficher numéros de versets"
                    },
                    nValues: [1, 1]
                }
            ]
        };
    }

    async doSection({section, templates, manifest, options}) {
        if (!section.bcvRange) {
            throw new Error(`No bcvRange found for section ${section.id}`);
        }
        const sectionConfig = {
            "showWordAtts": section.content.showWordAtts,
            "showTitles": section.content.showTitles,
            "showHeadings": section.content.showHeadings,
            "showIntroductions": section.content.showIntroductions,
            "showFootnotes": section.content.showFootnotes,
            "showXrefs": section.content.showXrefs,
            "showParaStyles": section.content.showParaStyles,
            "showCharacterMarkup": section.content.showCharacterMarkup,
            "showChapterLabels": section.content.showChapterLabels,
            "showVersesLabels": section.content.showVersesLabels
        }
        const pk = pkWithDocs(section.bcvRange, [{id: "xxx_yyy", path: section.content.scriptureSrc}], options.verbose);
        const bookName = getBookName(pk, "xxx_yyy", section.bcvRange);
        const notes = section.showNotes ? bcvNotes(config, section.bcvRange) : {};
        const docId = pk.gqlQuerySync('{documents { id } }').data.documents[0].id;
        const actions = render.sofria2web.renderActions.sofria2WebActions;
        const renderers = render.sofria2web.sofria2html.renderers;
        const cl = new SofriaRenderFromProskomma({proskomma: pk, actions: actions, debugLevel: 0})
        const output = {};
        sectionConfig.renderers = renderers;
        sectionConfig.selectedBcvNotes = [];
        const qualified_id = `${section.id}_${section.bcvRange}`;
        cl.renderDocument({docId, config: sectionConfig, output});
        fse.writeFileSync(
            path.join(options.htmlPath, `${qualified_id}.html`),
            templates['para_bible_page']
                .replace(
                    "%%TITLE%%",
                    `${qualified_id} - ${section.type}`
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
            htmlPath: path.join(options.htmlPath, `${qualified_id}.html`),
            pdfPath: path.join(options.pdfPath, `${qualified_id}.pdf`)
        });
        manifest.push({
            id: `${qualified_id}`,
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: false
        });
    }
}

module.exports = paraBibleSection;
