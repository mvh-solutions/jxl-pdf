const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
const marked = require('marked');
const DOMPurify = require('isomorphic-dompurify');

const Section = require('./section');

class MarkdownSection extends Section {

    requiresBook() {
        return false;
    }

    async doSection({section, templates, bookCode, options}) {
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
                        marked.parse(fse.readFileSync(path.resolve(path.join('data', `${section.path}.md`))).toString())
                    )
                )
        );
        await doPuppet({
            verbose: options.verbose,
            htmlPath: path.join(options.htmlPath, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
            pdfPath: path.join(options.pdfPath, `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)
        });
    }
}

module.exports = MarkdownSection;
