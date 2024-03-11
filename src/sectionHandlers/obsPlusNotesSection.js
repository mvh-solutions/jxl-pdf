const fse = require("fs-extra");
const path = require("path");
const {doPuppet, setupOneCSS, checkCssSubstitution} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');

const getObsNotes = (notesPath, notesRef) => {
    return fse.readFileSync(path.resolve(path.join('data', notesPath, 'tn.tsv'))).toString()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith(`${notesRef}\t`))
        .map(l => l.split(`\t`))
        .map(lc => `<p class="note\"><b>${lc[4]}</b> ${lc[6]}</p>`)
        .join("\n");
}

const doObsPlusNotesSection = async ({section, templates, bookCode, options}) => {
    let markdowns = [];
    for (const mdName of fse.readdirSync(path.resolve(path.join('data', `${section.obsPath}`)))) {
        const [name, suffix] = mdName.split('.');
        let storyNotes = "";
	if (section.obsNotesPath) {
	    storyNotes = getObsNotes(section.obsNotesPath, `${parseInt(name)}:0`);
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
            marked.parse(fse.readFileSync(path.resolve(path.join('data', `${section.obsPath}/${mdName}`))).toString())
        );
	if (section.obsNotesPath) {
        markdown = markdown.replace(/<\/h1>/g, `</h1><section class=\"storynotes\">\n${storyNotes}\n</section>\n`);
        markdown = markdown.replace(/<p><img/g, "<section class=\"storysection\">\n<p class=\"storypara\"><img");
        markdown = markdown.replace(/jpg"><\/p>\n<p>/g, "jpg\">");
        markdown = markdown.replace(/<\/p>\n<section/g, "</p>\n<section class=\"storynotes\">%%%%NOTES%%%%</section>\n</section>\n<section");
        let noteParaN = 1;
        while (RegExp(/%%%%NOTES%%%%/).test(markdown)) {
            const noteParaRef = `${parseInt(name)}:${noteParaN}`;
            markdown = markdown.replace("%%%%NOTES%%%%", getObsNotes(section.obsNotesPath, noteParaRef));
            noteParaN++;
        }
	}
        markdowns.push(markdown + "\n</section>");

    }
    fse.writeFileSync(
        path.join(
            options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        templates['obs_plus_notes_page']
            .replace(
                "%%TITLE%%",
                `${section.id.replace('%%bookCode%%', bookCode)} - ${section.type}`
            )
            .replace(
                "%%BODY%%",
                markdowns.join('\n\n')
            )
    );
    const cssPath = path.join(options.workingDir, "html", "resources", "obs_plus_notes_page_styles.css");
    let css = fse.readFileSync(cssPath).toString();
    const spaceOption = 0; // MAKE THIS CONFIGURABLE
    for (const [placeholder, values] of options.pageFormat.sections.obsPlusNotes.cssValues) {
        css = setupOneCSS(css, placeholder, "%", values[0]);
    }
    checkCssSubstitution("obs_plus_notes_page_styles.css", css,"%");
    fse.writeFileSync(cssPath, css);
    await doPuppet({
        verbose: options.verbose,
        htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
    });
}
module.exports = doObsPlusNotesSection;
