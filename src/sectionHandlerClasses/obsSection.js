const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');
const Section = require('./section');

class obsSection extends Section {

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
