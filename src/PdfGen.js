const _originatePdfs = require('./originatePdfs');
const _assemblePdfs = require('./assemblePdfs');
const fonts = require('../resources/fonts.json');
const pages = require('../resources/pages.json');
const sizes = require('../resources/sizes.json');
const handlers = require('./sectionHandlerClasses');
const {sectionHandlerLookup} = require('./sectionHandlerLookup');
const fse = require("fs-extra");
const path = require("path");
const os = require("os");

class PdfGen {

    constructor(options) {
        this.options = options;
    }

    static handlerInfo() {
        const ret = {};
        Object.entries(handlers)
            .forEach(h => {
                const rec = new h[1]().signature();
                ret[rec["sectionType"] || h[0]] = rec;
            });
        return ret;
    }

    static pageInfo() {
        return {
            fonts,
            pages,
            sizes
        }
    }

    async doPdf() {
        const workingDir = path.resolve(path.join(os.homedir(), ".jxlpdf/working"));
        const options = {
            pdfPath: path.join(workingDir, "pdf"),
            htmlPath: path.join(workingDir, "html", "pages"),
            manifestPath: path.join(workingDir, "manifest.json"),
            steps: ["originate", "assemble"],
            workingDir,
            pageFormat: pages[this.options.global.pages],
            fonts: fonts[this.options.global.fonts],
            fontSizes: sizes[this.options.global.sizes],
            configContent: this.options,
        };
        this.options = options;
        console.log(options);
        // Check that output file will not accidentally overwrite an existing file
/*
        if (fse.pathExistsSync(options.output) && !options.forceOverwrite) {
            throw new Error(`Output path '${options.output}' would be overwritten but 'forceOverwrite' flag is not set.`);
        }

        // Attempt to read config file and add JSON to options
        if (!(fse.pathExistsSync(options.config)) || !(fse.lstatSync(options.config).isFile())) {
            throw new Error(`Config file path '${options.config}' does not exist or is not a file`);
        }
        try {
            options.configContent = fse.readJsonSync(options.config);
        } catch (err) {
            throw new Error(`Could not read config file ${options.config} as JSON: ${err.message}`);
        }
*/
        // In CLEAR mode, delete working dir and exit
        if (options.steps.includes("clear")) {
            options.verbose && console.log("** CLEAR **");
            if (fse.pathExistsSync(options.workingDir)) {
                options.verbose && console.log(`   Deleting working dir ${options.workingDir}`);
                fse.removeSync(options.workingDir);
            } else {
                options.verbose && console.log(`   Working dir ${options.workingDir} not found - abandoning.`);
            }
            process.exit(0);
        }

        if (options.steps.includes("originate")) {
            options.verbose && console.log("** ORIGINATE **");
            if (fse.pathExistsSync(options.workingDir)) {
                options.verbose && console.log(`   Deleting working dir ${options.workingDir}`);
                fse.removeSync(options.workingDir);
            } else {
                options.verbose && console.log(`   Creating working dir ${options.workingDir}`);
            }
            fse.mkdirsSync(options.workingDir);
            await this.originatePdfs();
        }
        if (options.steps.includes("assemble")) {
            options.verbose && console.log("** ASSEMBLE **");
            if (!fse.pathExistsSync(options.manifestPath)) {
                throw new Error("Cannot run assemble without first originating content");
            }
            await this.assemblePdfs();
        }
    }

    validateConfig(configOb) {
        const ret = [];
        let skip = false;
        // Top-level checks, abort on first error
        if (typeof configOb !== "object" || Array.isArray(configOb)) {
            ret.push("config is not an object");
            skip = true;
        }
        if (!skip && !("global" in configOb)) {
            ret.push("config has no 'global' key");
            skip = true;
        }
        if (!skip && (!(typeof configOb.global === "object")) || Array.isArray(configOb.global)) {
            ret.push("config 'global' value is not an object");
            skip = true;
        }
        if (!skip && !configOb.sections) {
            ret.push("config has no 'sections' key");
            skip = true;
        }
        if (!skip && !Array.isArray(configOb.sections)) {
            ret.push("config 'sections' value is not an array");
            skip = true;
        }
        // globals checks, abort at end on error
        if (!skip) {
            const globalSpecKeys = Object.fromEntries(
                Object.entries(this.constructor.pageInfo())
                    .map(([k, v]) => [k, Object.keys(v)])
            );
            for (const globalKey of Object.keys(configOb.global)) {
                if (!globalSpecKeys[globalKey]) {
                    ret.push(`Unexpected global key '${globalKey}'`);
                    skip = true;
                    continue;
                }
                if (!globalSpecKeys[globalKey].includes(configOb.global[globalKey])) {
                    const globalSpecKeysString = globalSpecKeys[globalKey]
                        .map(v => `'${v}'`)
                        .join(", ");
                    ret.push(`Unexpected value '${configOb.global[globalKey]}' for global key '${globalKey}'. Expected one of ${globalSpecKeysString}`);
                    skip = true;
                }
            }
        }
        // Sections checks
        if (!skip) {
            const sections = configOb.sections;
            if (sections.length === 0) {
                ret.push("Top-level section has zero length");
            } else {
                // Iterate over sections
                let sectionN = 0;
                while (sectionN < sections.length && !skip) {
                    const section = sections[sectionN];
                    if (sectionHandlerLookup[section.type]) { // A section
                        if (!this.validateSection(section, null, ret, sectionN)) {
                            skip = true;
                            break;
                        }
                    } else if (["bcvWrapper", "obsWrapper", "juxtaWrapper"].includes(section.type)) { // A wrapper
                        const wrapperOnly = {};
                        for (const [key, value] of Object.entries(section)) {
                            if (key === "sections") {
                                continue;
                            }
                            wrapperOnly[key] = value;
                        }
                        for (const subSection of section.sections) {
                            if (!this.validateSection(subSection, wrapperOnly, ret, sectionN)) {
                             skip = true;
                             break;
                            }
                        }
                    } else {
                        ret.push(`Unknown section or wrapper type '${section.type}'${section.id ? ` near section ${section.id} ` : ""}(#${sectionN})`);
                        skip = true;
                        break;
                    }
                    sectionN++;
                }
            }
        }
        return ret;
    }

    validateSection(section, wrapper, errors, sectionN) {
        if (!section.id) {
            errors.push(`Section has no id (#${sectionN})`);
            return false;
        }
        if (!section.type) {
            errors.push(`Section '${section.id}' has no type (#${sectionN})`);
            return false;
        }
        const sectionHandler = sectionHandlerLookup[section.type];
        if (!sectionHandler) {
            errors.push(`Unknown section type '${section.type}' near section '${section.id}' (#${sectionN})`);
            return false;
        }
        const signature = sectionHandler.signature();
        // console.log(JSON.stringify(signature, null, 2));
        if (signature.requiresWrapper.length > 0) {
            if (!wrapper) {
                errors.push(`No wrapper for section '${section.id}' of type '${section.type}' (expected '${signature.requiresWrapper[0]}) (#${sectionN})'`);
                return false;
            }
            if (wrapper.type !== `${signature.requiresWrapper[0]}Wrapper`) {
                errors.push(`Expected wrapper of type '${signature.requiresWrapper[0]}' for section '${section.id}' but found '${wrapper.type}' (#${sectionN})`);
                return false;
            }
        }
        const signatureFieldIds = signature.fields.map(f => f.id);
        for (const sectionFieldId of Object.keys(section.content)) {
            if (!signatureFieldIds.includes(sectionFieldId)) {
                errors.push(`Unexpected field '${sectionFieldId}' in Section '${section.id}' of type '${section.type}' (#${sectionN})`);
            }
        }
        for (const requiredFieldId of signature.fields.filter(f => f.nValues[0] > 0).map(f => f.id)) {
            if (!section.content[requiredFieldId]) {
                errors.push(`Missing field '${requiredFieldId}' in Section '${section.id}' of type '${section.type}' (#${sectionN})`);
            }
        }
        if (errors.length > 0) {
            return false;
        }
        let foundError = false;
        for (const [key, value] of Object.entries(section.content)) {
            if (
                !this.validateSectionField(
                    key,
                    value,
                    signature.fields.filter(f => f.id === key)[0],
                    errors,
                    section.id,
                    sectionN
                )
            ) {
                foundError = true;
            }
        }
        return !foundError;
    }

    validateSectionField(fieldId, fieldContent, fieldSpec, errors, sectionId, sectionN) {
        const normalizedContent = Array.isArray(fieldContent) ? fieldContent : [fieldContent];
        if (normalizedContent.length < fieldSpec.nValues[0] || normalizedContent.length > fieldSpec.nValues[1]) {
            errors.push(`${normalizedContent.length} values for field '${fieldId}' in Section '${sectionId}' (#${sectionN}) - expected ${fieldSpec.nValues[0]}-${fieldSpec.nValues[1]} value(s)`);
            return false;
        }
        if (fieldSpec.typeName) {
            if (fieldSpec.typeName === "boolean") {
                const badValues = normalizedContent.filter(c => !!c !== c);
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not booleans`);
                    return false;
                }
            } else if (fieldSpec.typeName === "string") {
                const badValues = normalizedContent.filter(c => typeof c !== "string");
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not strings`);
                    return false;
                }
            } else if (["ob", "tNotes", "translationText"].includes(fieldSpec.typeName) && typeof fieldContent !== "string") {
                const badValues = normalizedContent.filter(c => typeof c !== "string");
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not path strings`);
                    return false;
                }
            }
        }
        if (fieldSpec.typeEnum) {
            const enumIds = fieldSpec.typeEnum.map(e => e.id);
            const badValues = normalizedContent.filter(c => !enumIds.includes(c));
            if (badValues.length > 0) {
                errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) not found enum [${fieldSpec.typeEnum.map(e => e.id).join(", ")}]`);
                return false;
            }
        }
        return true;
    }

    async originatePdfs() {
        return await _originatePdfs(this.options);
    }

    async assemblePdfs() {
        return await _assemblePdfs(this.options);
    }
}

module.exports = PdfGen;
