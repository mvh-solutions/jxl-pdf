const fse = require("fs-extra");
const path = require("path");

const loadTemplates = () => {
    const templates = {};
    for (const templateName of [
        'juxta_page',
        'non_juxta_page',
        '4_column_spread_page',
        '4_column_spread_verse',
        '4_column_spread_title',
        '4_column_header_page',
        '2_column_page',
        '2_column_header_page',
        '2_column_verse',
        '2_column_title',
        'web_index_page',
        'web_index_page_link',
        'sentence', 'firstLeft',
        'otherLeft',
        'jxl',
        'jxlRow',
        'chapterNote',
        'bookNote',
        'markdownPara'
    ]) {
        templates[templateName] = fse.readFileSync(path.join('src', 'templates', templateName + '.html')).toString();
    }
    return templates;
}

module.exports = loadTemplates;
