const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
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
            templates['markdown_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
                    DOMPurify.sanitize(
                        marked.parse(fse.readFileSync(path.resolve(path.join(`${section.content.md}`))).toString())
                    )
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
        manifest.push({
            id: `${section.id}`,
            type: section.type,
            startOn: section.startOn,
            showPageNumber: section.showPageNumber,
            makeFromDouble: false
        });
    }
}

module.exports = MarkdownSection;
