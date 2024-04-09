const fse = require("fs-extra");
const path = require("path");

const TEMPLATE_NAMES = [
    'page_number_master',
    'page_number_page',
    'juxta_page',
    'simple_juxta_page',
    'non_juxta_page',
    'markdown_page',
    'obs_page',
    'obs_plus_notes_page',
    '4_column_spread_page',
    '4_column_spread_verse',
    '4_column_spread_title',
    '4_column_header_page',
    '2_column_page',
    '2_column_header_page',
    '2_column_verse',
    '2_column_title',
    'bcv_bible_page',
    'bcv_bible_verse',
    'para_bible_page',
    'bible_plus_notes_page',
    'bible_plus_notes_verse',
    'web_index_page',
    'web_index_page_link',
    'sentence',
    'simple_juxta_sentence',
    'firstLeft',
    'otherLeft',
    'jxl',
    'jxlRow',
    'chapterNote',
    'bookNote',
    'markdownPara'
];

const loadTemplates = () => {
    const templates = {};
    for (const templateName of TEMPLATE_NAMES) {
        templates[templateName] = fse.readFileSync(path.resolve(path.join(__dirname, '..', 'templates', templateName + '.html'))).toString();
    }
    return templates;
}

const loadTemplate = (templateName) => {
    if(!TEMPLATE_NAMES.includes(templateName)) {
        throw new Error("Illegal template name :" + templateName);
    }
    return fse.readFileSync(path.resolve(path.join(__dirname, '..', 'templates', templateName + '.html'))).toString();
}

module.exports = {
    loadTemplates,
    loadTemplate
};
