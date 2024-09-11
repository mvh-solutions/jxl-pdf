const fse = require("fs-extra");
const path = require("path");
const {doPuppet, resolvePath} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');
const Section = require('./section');

class obsSection extends Section {

    requiresWrapper() {
        return ["obs"];
    }

    signature() {
        return {
            sectionType: "obs",
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
                    id: "obs",
                    label: {
                        en: "OBS Source",
                        fr: "Source pour OBS"
                    },
                    typeName: "obs",
                    nValues: [1, 1]
                },
             ]
        }
    }

    async doSection({section, templates, manifest, options}) {
        let isFirst = true;
        for (const mdName of fse.readdirSync(resolvePath(section.content.obs))) {
            const [name, suffix] = mdName.split('.');
            if (suffix !== 'md' || !parseInt(name)) {
                continue;
            }
            if (section.firstStory && parseInt(name) < section.firstStory) {
                continue;
            }
            if (section.lastStory && parseInt(name) > section.lastStory) {
                continue;
            }
            const markdown = DOMPurify.sanitize(
                    marked.parse(fse.readFileSync(resolvePath(`${section.content.obs}/${mdName}`)).toString())
            );
            fse.writeFileSync(
                path.join(options.htmlPath, `${section.id}_${name}.html`),
                templates['obs_page']
                    .replace(
                        "%%TITLE%%",
                        `${section.id.replace('%%bookCode%%', name)} - ${section.type}`
                    )
                    .replace(
                        "%%BODY%%",
                        markdown
                    )
            );
            section.doPdfCallback && section.doPdfCallback({
                type: "pdf",
                level: 3,
                msg: `Originating PDF ${path.join(options.pdfPath, `${section.id}_${name}.pdf}`)} for OBS story '${mdName}'`,
                args: [`${path.join(options.pdfPath, `${section.id}_${name}.pdf`)}`, mdName]
            });
            await doPuppet({
                verbose: options.verbose,
                htmlPath: path.join(options.htmlPath, `${section.id}_${name}.html`),
                pdfPath: path.join(options.pdfPath, `${section.id}_${name}.pdf`)
            });
            manifest.push({
                id: `${section.id}_${name}`,
                type: section.type,
                startOn: isFirst ? section.content.startOn : "either",
                showPageNumber: section.content.showPageNumber,
                makeFromDouble: false
            });
            isFirst = false;
        }
    }
}
module.exports = obsSection;
