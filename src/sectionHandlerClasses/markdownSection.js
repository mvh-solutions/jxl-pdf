const fse = require("fs-extra");
const path = require("path");
const {doPuppet, resolvePath} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');

const Section = require('./section');

class MarkdownSection extends Section {

    requiresWrapper() {
        return [];
    }

    signature() {
        return {
            sectionType: "markdown",
            requiresWrapper: this.requiresWrapper(),
            fields: [
                {
                    id: "startOn",
                    label: {
                        en: "Start Page Side",
                        fr: "Côté pour première page"
                    },
                    typeEnum: [
                        {
                            id: "recto",
                            label: {
                                en: "Recto",
                                fr: "Recto"
                            },
                        },
                        {
                            id: "verso",
                            label: {
                                en: "Verso",
                                fr: "Verso"
                            },
                        },
                        {
                            id: "either",
                            label: {
                                en: "Next Page",
                                fr: "Page suivante"
                            },
                        }
                    ],
                    nValues: [1, 1],
                    suggestedDefault: "recto"
                },
                {
                    id: "showPageNumber",
                    label: {
                        en: "Show Page Number",
                        fr: "Afficher numéro de page"
                    },
                    typeName: "boolean",
                    nValues: [1, 1],
                    suggestedDefault: true
                },
                {
                    id: "forceMono",
                    label: {
                        en: "Use monospace font",
                        fr: "Utiliser police monospace"
                    },
                    typeName: "boolean",
                    nValues: [0, 1],
                    suggestedDefault: false
                },
                {
                    id: "md",
                    label: {
                        en: "Markdown Source",
                        fr: "Source pour markdown"
                    },
                    typeName: "md",
                    nValues: [1, 1]
                },
            ]
        }
    }

    async doSection({section, templates, bookCode, manifest, options}) {
        fse.writeFileSync(
            path.join(
                options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            templates[section.content.forceMono ? 'markdown_mono_page': 'markdown_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
                    DOMPurify.sanitize(
                        marked.parse(fse.readFileSync(resolvePath(path.join(`${section.content.md}`))).toString())
                    )
                )
        );
        section.doPdfCallback && section.doPdfCallback({
            type: "pdf",
            level: 3,
            msg: `Originating PDF ${path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)} for Markdown'`,
            args: [path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)]
        });
        await doPuppet({
            browser: options.browser,
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
        manifest.push({
            id: `${section.id}`,
            type: section.type,
            startOn: section.content.startOn,
            showPageNumber: section.content.showPageNumber,
            makeFromDouble: false
        });
    }
}

module.exports = MarkdownSection;
