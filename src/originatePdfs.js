const path = require("path");
const {loadTemplates, setupOneCSS, checkCssSubstitution} = require("./helpers");
const {sectionHandlerLookup} = require('./sectionHandlerLookup');
const fse = require("fs-extra");

const setupCSS = options => {
    const cssFragments = {};
    const cssFragmentFilenames = fse.readdirSync(path.join(__dirname, "..", "static", "cssFragments"))
        .filter(name => name.endsWith(".css"));
    for (const filename of cssFragmentFilenames) {
        const fileContent = fse.readFileSync(path.join(__dirname, "..", "static", "cssFragments", filename)).toString();
        const contentKey = filename.split('.')[0].replace(/%/g, "");
        cssFragments[contentKey] = fileContent;
    }
    const cssFilenames = fse.readdirSync(path.join(__dirname, "..", "static", "resources"))
        .filter(name => name.endsWith(".css"));
    for (const filename of cssFilenames) {
        let fileContent = fse.readFileSync(path.join(__dirname, "..", "static", "resources", filename)).toString();
        for (const [fragKey, fragContent] of Object.entries(cssFragments)) {
            fileContent = setupOneCSS(fileContent, fragKey, "%%%", fragContent);
        }
        checkCssSubstitution(filename, fileContent, "%%%");
        const pageFormat = options.pageFormat;
        const spaceOption = 0; // MAKE THIS CONFIGURABLE
        const pageBodyWidth = pageFormat.pageSize[0] - (pageFormat.margins.inner[spaceOption] + pageFormat.margins.outer[spaceOption]);
        const pageBodyHeight = pageFormat.pageSize[1] - (pageFormat.margins.top[spaceOption] + pageFormat.margins.bottom[spaceOption]);
        for (const [placeholder, value] of [
            ["PAGEWIDTH", pageFormat.pageSize[0]],
            ["PAGEBODYWIDTH", pageBodyWidth],
            ["DOUBLEPAGEWIDTH", pageFormat.pageSize[0] * 2],
            ["PAGEHEIGHT", pageFormat.pageSize[1]],
            ["MARGINTOP", pageFormat.margins.top[spaceOption]],
            ["FIRSTPAGEMARGINTOP", pageFormat.margins.firstPageTop[spaceOption]],
            ["MARGINBOTTOM", pageFormat.margins.bottom[spaceOption]],
            ["FOOTEROFFSET", pageFormat.footerOffset[spaceOption]],
            ["MARGININNER", pageFormat.margins.inner[spaceOption]],
            ["DOUBLEMARGININNER", pageFormat.margins.inner[spaceOption] * 2],
            ["MARGINOUTER", pageFormat.margins.outer[spaceOption]],
            ["PAGENUMBERTOPMARGIN", pageBodyHeight + pageFormat.margins.top[spaceOption] + pageFormat.footerOffset[spaceOption]],
            ["COLUMNGAP", pageFormat.columnGap[spaceOption]],
            ["HALFCOLUMNGAP", pageFormat.columnGap[spaceOption] / 2],
            ["2COLUMNWIDTH", (pageBodyWidth - pageFormat.columnGap[spaceOption]) / 2],
            ["3COLUMNWIDTH", (pageBodyWidth - (pageFormat.columnGap[spaceOption] * 2)) / 3],
            ["BODYFONT", options.fonts.body],
            ["BODYFONT2", options.fonts.body2 || options.fonts.body],
            ["HEADINGFONT", options.fonts.heading],
            ["FOOTNOTEFONT", options.fonts.footnote],
            ["GREEKFONT", options.fonts.greek],
            ["HEBREWFONT", options.fonts.hebrew],
            ["BODYFONTSIZE", options.fontSizes.body.font],
            ["BODYLINEHEIGHT", options.fontSizes.body.height],
            ["DOUBLEBODYLINEHEIGHT", options.fontSizes.body.height * 2],
            ["BODYHALFLINEHEIGHT", options.fontSizes.body.height],
            ["BODYBOTTOMMARGIN", options.fontSizes.body.bottomMargin],
            ["BODYBOTTOMBORDERWIDTH", options.fontSizes.body.bottomBorderWidth],
            ["BODYBOTTOMPADDING", options.fontSizes.body.bottomPadding],
            ["H4FONTSIZE", options.fontSizes.h4.font],
            ["H4LINEHEIGHT", options.fontSizes.h4.height],
            ["H4HALFLINEHEIGHT", options.fontSizes.h4.height],
            ["H4BOTTOMMARGIN", options.fontSizes.h4.bottomMargin],
            ["H4BOTTOMBORDERWIDTH", options.fontSizes.h4.bottomBorderWidth],
            ["H4BOTTOMPADDING", options.fontSizes.h4.bottomPadding],
            ["H3FONTSIZE", options.fontSizes.h3.font],
            ["H3LINEHEIGHT", options.fontSizes.h3.height],
            ["H3HALFLINEHEIGHT", options.fontSizes.h3.height],
            ["H3BOTTOMMARGIN", options.fontSizes.h3.bottomMargin],
            ["H3BOTTOMBORDERWIDTH", options.fontSizes.h3.bottomBorderWidth],
            ["H3BOTTOMPADDING", options.fontSizes.h3.bottomPadding],
            ["H2FONTSIZE", options.fontSizes.h2.font],
            ["H2LINEHEIGHT", options.fontSizes.h2.height],
            ["H2HALFLINEHEIGHT", options.fontSizes.h2.height],
            ["H2BOTTOMMARGIN", options.fontSizes.h2.bottomMargin],
            ["H2BOTTOMBORDERWIDTH", options.fontSizes.h2.bottomBorderWidth],
            ["H2BOTTOMPADDING", options.fontSizes.h2.bottomPadding],
            ["H1FONTSIZE", options.fontSizes.h1.font],
            ["H1LINEHEIGHT", options.fontSizes.h1.height],
            ["H1HALFLINEHEIGHT", options.fontSizes.h1.height],
            ["H1BOTTOMMARGIN", options.fontSizes.h1.bottomMargin],
            ["H1BOTTOMBORDERWIDTH", options.fontSizes.h1.bottomBorderWidth],
            ["H1BOTTOMPADDING", options.fontSizes.h1.bottomPadding],
            ["FOOTNOTEFONTSIZE", options.fontSizes.footnote.font],
            ["FOOTNOTELINEHEIGHT", options.fontSizes.footnote.height],
            ["FOOTNOTEHALFLINEHEIGHT", options.fontSizes.footnote.height],
            ["FOOTNOTEBOTTOMMARGIN", options.fontSizes.footnote.bottomMargin],
            ["FOOTNOTEBOTTOMBORDERWIDTH", options.fontSizes.footnote.bottomBorderWidth],
            ["FOOTNOTEBOTTOMPADDING", options.fontSizes.footnote.bottomPadding],
            ["FOOTNOTECALLEROFFSET", options.fontSizes.body.font - options.fontSizes.footnote.font],
            ["RULEPADDING", options.fontSizes.rule.bottomPadding],
            ["RULEWIDTH", options.fontSizes.rule.bottomBorderWidth],
            ["RULEMARGIN", options.fontSizes.rule.bottomMargin],
        ]) {
            fileContent = setupOneCSS(fileContent, placeholder, "%%", value);
        }
        checkCssSubstitution(filename, fileContent, "%%");
        fse.writeFileSync(path.join(options.workingDir, "html", "resources", filename), fileContent);
    }
    options.verbose && console.log(`   ${cssFilenames.length} CSS file(s) customized`);
}

const originatePdfs = async (options, doPdfCallback=null) => {
    // Set up workspace - options.workingDir should already exist
    fse.mkdirsSync(options.htmlPath);
    fse.mkdirsSync(path.join(options.workingDir, "html", "resources"));
    setupCSS(options);
    fse.copySync(path.join(__dirname, "..", "static", "resources", "paged.polyfill.js"), path.join(options.workingDir, "html", "resources", "paged.polyfill.js"));
    fse.mkdirsSync(path.join(options.workingDir, "html", "page_resources"));
    options.resourcesDir && fse.copySync(path.resolve(options.resourcesDir), path.join(options.workingDir, "html", "page_resources"));
    fse.mkdirsSync(options.pdfPath);

    const checkBookCode = (sectionId) => {
        if (!bookCode) {
            throw new Error(`bookCode not set for section '${sectionId}`);
        }
    }

    const templates = loadTemplates();

    let links = [];
    let manifest = [];
    let wrapperRange = null;

    const doSection = async (section, nested) => {
        options.verbose && nested && console.log(`   Section ${section.id.replace('%%bookCode%%', wrapperRange)} (${section.type} in wrapper)`);
        if (section.forceSkip) {
            options.verbose && console.log(`      Force skip in config file; continuing...`);
            return;
        }
        links.push(
            templates['web_index_page_link']
                .replace(/%%ID%%/g, section.id.replace('%%bookCode%%', wrapperRange))
        );
        if (["4ColumnSpread", "2Column"].includes(section.type)) {
            links.push(
                templates['web_index_page_link']
                    .replace(/%%ID%%/g, `${section.id.replace('%%bookCode%%', wrapperRange)}_superimpose`)
            );
            manifest.push({
                id: `${section.id.replace('%%bookCode%%', wrapperRange)}_superimpose`,
                type: "superimpose",
                for: section.id.replace('%%bookCode%%', wrapperRange)
            });
        }
        const sectionHandler = sectionHandlerLookup[section.type];
        if (!sectionHandler) {
            throw new Error(`Unknown section type '${section.type}' (id '${section.id}')`);
        }
        await sectionHandler.doSection({section, templates, wrapperRange, manifest, options});
        if (section.forceQuit) {
            console.log("** Force quit in config file **");
            process.exit(0);
        }
    }

    for (const section of options.configContent.sections) {
        options.verbose && console.log(`   Section ${section.id ? `${section.id} (${section.type})` : section.type}`);
        doPdfCallback && doPdfCallback({
            type: "section",
            level: 1,
            msg: `Section or wrapper ${section.type}`,
            args: [section.type]
        });

        switch (section.type) {
            case "obsWrapper":
                options.verbose && console.log(`      obsRanges`);
                for (const obsRange of section.ranges) {
                    options.verbose && console.log(`      obsRange = ${obsRange}`);
                    const [firstStory, lastStory] = obsRange.split('-').map(n => parseInt(n));
                    for (const section2 of section.sections) {
                        doPdfCallback && doPdfCallback({
                            type: "wrappedSection",
                            level: 2,
                            msg: `Wrapped section ${section2.type}`,
                            args: [section2.type, obsRange]
                        });
                        await doSection({...section2, firstStory, lastStory: lastStory || firstStory, doPdfCallback}, true);
                    }
                }
                break;
            case "bcvWrapper":
                options.verbose && console.log(`      bcvRanges`);
                for (const bcvRange of section.ranges) {
                    options.verbose && console.log(`      bcvRange = ${bcvRange}`);
                    for (const section2 of section.sections) {
                        doPdfCallback && doPdfCallback({
                            type: "wrappedSection",
                            level: 2,
                            msg: `Wrapped section ${section2.type}`,
                            args: [section2.type, bcvRange]
                        });
                        await doSection({...section2, bcvRange, doPdfCallback}, true);
                    }
                }
                break;
            default:
                await doSection({...section, doPdfCallback}, false);
        }
    }
    fse.writeFileSync(
        path.join(options.htmlPath, "index.html"),
        templates['web_index_page']
            .replace("%%LINKS%%", links.join("\n"))
    );
    fse.writeJsonSync(
        options.manifestPath,
        manifest
    )
}

module.exports = originatePdfs;
