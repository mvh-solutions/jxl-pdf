const fse = require("fs-extra");
const path = require("path");
const {doPuppet, setupOneCSS, checkCssSubstitution} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');
const Section = require('./section');

const getObsNotes = (notesPath, notesRef) => {
    return fse.readFileSync(path.resolve(path.join(notesPath, 'tn.tsv'))).toString()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith(`${notesRef}\t`))
        .map(l => l.split(`\t`))
        .map(lc => `<p class="note\"><b>${lc[4]}</b> ${lc[6]}</p>`)
        .join("\n");
}

class obsPlusNotesSection extends Section {

    requiresWrapper() {
        return ["obs"];
    }

    signature() {
        return {
            sectionType: "obsPlusNotes",
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
                {
                    id: "notes",
                    label: {
                        en: "Notes Source",
                        fr: "Source pour notes"
                    },
                    typeName: "obsNotes",
                    nValues: [1, 1]
                },
            ]
        }
    }

    async doSection({section, templates, bookCode, manifest, options}) {
        let isFirst = false;
        for (const mdName of fse.readdirSync(path.resolve(section.content.obs))) {
            const [name, suffix] = mdName.split('.');
            let storyNotes = "";
            if (section.obsNotesPath) {
                storyNotes = getObsNotes(section.content.notes, `${parseInt(name)}:0`);
            }
            if (suffix !== 'md' || !parseInt(name)) {
                continue;
            }
            if (section.firstStory && parseInt(name) < section.firstStory) {
                continue;
            }
            if (section.lastStory && parseInt(name) > section.lastStory) {
                continue;
            }
            let markdown = DOMPurify.sanitize(
                marked.parse(fse.readFileSync(path.resolve(`${section.content.obs}/${mdName}`)).toString())
            );
            if (section.content.notes) {
                markdown = markdown.replace(/<\/h1>/g, `</h1><section class=\"storynotes\">\n${storyNotes}\n</section>\n`);
                markdown = markdown.replace(/<p><img/g, "<section class=\"storysection\">\n<p class=\"storypara\"><img");
                markdown = markdown.replace(/jpg"><\/p>\n<p>/g, "jpg\">");
                markdown = markdown.replace(/<\/p>\n<section/g, "</p>\n<section class=\"storynotes\">%%%%NOTES%%%%</section>\n</section>\n<section");
                let noteParaN = 1;
                while (RegExp(/%%%%NOTES%%%%/).test(markdown)) {
                    const noteParaRef = `${parseInt(name)}:${noteParaN}`;
                    markdown = markdown.replace("%%%%NOTES%%%%", getObsNotes(section.content.notes, noteParaRef));
                    noteParaN++;
                }
            }
            const cssPath = path.join(options.workingDir, "html", "resources", "obs_plus_notes_page_styles.css");
            let css = fse.readFileSync(cssPath).toString();
            const spaceOption = 0; // MAKE THIS CONFIGURABLE
            for (const [placeholder, values] of options.pageFormat.sections.obsPlusNotes.cssValues) {
                css = setupOneCSS(css, placeholder, "%", values[0]);
            }
            checkCssSubstitution("obs_plus_notes_page_styles.css", css, "%");
            fse.writeFileSync(cssPath, css);
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
            await doPuppet({
                verbose: options.verbose,
                htmlPath: path.join(options.htmlPath, `${section.id}_${name}.html`),
                pdfPath: path.join(options.pdfPath, `${section.id}_${name}.pdf`)
            });
            manifest.push({
                id: `${section.id}_${name}`,
                type: section.type,
                startOn: isFirst ? section.startOn : "either",
                showPageNumber: section.showPageNumber,
                makeFromDouble: false
            });
            isFirst = false;
        }
    }
}
module.exports = obsPlusNotesSection;
