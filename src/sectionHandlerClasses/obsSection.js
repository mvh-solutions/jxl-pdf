const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
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
                    id: "obs",
                    label: {
                        en: "OBS Source",
                        fr: "Source pour OBS"
                    },
                    typeName: "obs",
                    nValues: [1, 1]
                },
                {
                    id: "firstStory",
                    label: {
                        en: "First Story Number",
                        fr: "N° de première histoire OBS"
                    },
                    typeName: "integer",
                    nValues: [0, 1]
                },
                {
                    id: "lastStory",
                    label: {
                        en: "Last Story Number",
                        fr: "N° de dernière histoire OBS"
                    },
                    typeName: "integer",
                    nValues: [0, 1]
                },
            ]
        }
    }

    async doSection({section, templates, bookCode, options}) {
        let markdowns = [];
        for (const mdName of fse.readdirSync(path.resolve(path.join('data', `${section.path}`)))) {
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
            markdowns.push(
                DOMPurify.sanitize(
                    marked.parse(fse.readFileSync(path.resolve(path.join('data', `${section.path}/${mdName}`))).toString())
                )
            );
        }
        fse.writeFileSync(
            path.join(
                options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            templates['obs_page']
                .replace(
                    "%%TITLE%%",
                    `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
                )
                .replace(
                    "%%BODY%%",
                    markdowns.join('\n\n')
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}
module.exports = obsSection;
