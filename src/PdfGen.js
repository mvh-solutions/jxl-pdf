const _originatePdfs = require('./originatePdfs');
const _assemblePdfs = require('./assemblePdfs');
const fonts = require('../resources/fonts.json');
const pages = require('../resources/pages.json');
const sizes = require('../resources/sizes.json');
const handlers = require('./sectionHandlerClasses');
const {sectionHandlerLookup} = require('./sectionHandlerLookup');
const {resolvePath} = require('./helpers');
const fse = require("fs-extra");
const path = require("path");
const os = require("os");

class PdfGen {

    constructor(options, doPdfCallback = null) {
        const errors = PdfGen.validateConfig(options, true);
        if (errors.length > 0) {
            throw new Error(`Validation errors for config file:\n${errors.map(e => `  - ${e}`).join('\n')}`);
        }
        this.options = options;
        this.doPdfCallback = doPdfCallback;
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
        if (!this.options.global.outputPath) {
            throw new Error("Must provide an outputPath in doPdf()");
        }
        const options = {
            verbose: this.options.global.verbose || false,
            workingDir: this.options.global.workingDir,
            resourcesDir: this.options.global.resourcesDir,
            pdfPath: path.join(this.options.global.workingDir, "pdf"),
            htmlPath: path.join(this.options.global.workingDir, "html", "pages"),
            manifestPath: path.join(this.options.global.workingDir, "manifest.json"),
            steps: ["originate", "assemble"],
            pageFormat: pages[this.options.global.pages],
            fonts: fonts[this.options.global.fonts],
            fontSizes: sizes[this.options.global.sizes],
            configContent: this.options,
            output: this.options.global.outputPath
        };
        this.options = options;
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
            this.doPdfCallback && this.doPdfCallback({
                type: "step",
                level: 0,
                msg: "Originating Content",
                args: ["originate"]
            });
            if (fse.pathExistsSync(options.workingDir)) {
                if (!/[A-Za-z]{2}/.test(options.workingDir)) {
                    throw new Error(`Working dir '${options.workingDir} looks dangerous to delete - quitting'`);
                }
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
            this.doPdfCallback && this.doPdfCallback({
                type: "step",
                level: 0,
                msg: "Assembling Content",
                args: ["assemble"]
            });
            if (!fse.pathExistsSync(options.manifestPath)) {
                throw new Error("Cannot run assemble without first originating content");
            }
            await this.assemblePdfs();
        }
    }

    static validateConfig(configOb, checkPaths = false) {
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
                Object.entries(PdfGen.pageInfo())
                    .map(([k, v]) => [k, Object.keys(v)])
            );
            for (const globalKey of Object.keys(configOb.global)) {
                if (["verbose", "workingDir", "outputPath"].includes(globalKey)) {
                    continue;
                }
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
                // Check for duplicate section ids at top level
                const ids = {};
                for (const section of sections) {
                    if (ids[section.id]) {
                        ret.push(`Duplicate ID '${section.id}'`);
                        skip = true;
                        break;
                    }
                    ids[section.id] = true;
                }
                // Iterate over sections
                let sectionN = 0;
                while (sectionN < sections.length && !skip) {
                    const section = sections[sectionN];
                    if (sectionHandlerLookup[section.type]) { // A section
                        const sectionErrors = this.validateSection(section, null, ret, sectionN, checkPaths);
                        if (sectionErrors.length > 0) {
                            sectionErrors.forEach(e => ret.push(e));
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
                        if (!wrapperOnly["ranges"] || !Array.isArray(wrapperOnly["ranges"]) || wrapperOnly["ranges"].length === 0) {
                            ret.push(`Wrapper type '${section.type} requires ranges at '${section.id ? ` near section ${section.id} ` : ""}(#${sectionN})`);
                            skip = true;
                            break;
                        }
                        const ids = {};
                        for (const subSection of section.sections) {
                                if (ids[subSection.id]) {
                                    ret.push(`Duplicate ID '${subSection.id}'`);
                                    skip = true;
                                    break;
                                }
                                ids[subSection.id] = true;
                            if (!PdfGen.validateSection(subSection, wrapperOnly, ret, sectionN, checkPaths)) {
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

    static validateSection(section, wrapper, errors, sectionN, checkPaths = false) {
        if (!section.id) {
            errors.push(`Section has no id (#${sectionN})`);
            return errors;
        }
        if (!section.type) {
            errors.push(`Section '${section.id}' has no type (#${sectionN})`);
            return errors;
        }
        const sectionHandler = sectionHandlerLookup[section.type];
        if (!sectionHandler) {
            errors.push(`Unknown section type '${section.type}' near section '${section.id}' (#${sectionN})`);
            return errors;
        }
        const signature = sectionHandler.signature();
        // console.log(JSON.stringify(signature, null, 2));
        if (signature.requiresWrapper.length > 0) {
            if (!wrapper) {
                errors.push(`No wrapper for section '${section.id}' of type '${section.type}' (expected '${signature.requiresWrapper[0]}) (#${sectionN})'`);
                return errors;
            }
            if (wrapper.type !== `${signature.requiresWrapper[0]}Wrapper`) {
                errors.push(`Expected wrapper of type '${signature.requiresWrapper[0]}' for section '${section.id}' but found '${wrapper.type}' (#${sectionN})`);
                return errors;
            }
        }
        if (!section.content) {
            errors.push(`No content for section '${section.id}' (#${sectionN})`);
            return errors;
        }
        return PdfGen.validateSectionFields(
            {
                signatureFields: signature.fields,
                sectionId: section.id,
                sectionN,
                sectionContent: section.content,
                errors,
                checkPaths
            }
        );
    }

    static validateSectionFields({signatureFields, sectionId, sectionN, sectionContent, errors, checkPaths = false}) {
        const signatureFieldIds = signatureFields.map(f => f.id);
        for (const sectionFieldId of Object.keys(sectionContent)) {
            if (!signatureFieldIds.includes(sectionFieldId)) {
                errors.push(`Unexpected field '${sectionFieldId}' in Section '${sectionId}' (#${sectionN})`);
            }
        }
        for (const requiredFieldId of signatureFields.filter(f => f.nValues[0] > 0).map(f => f.id)) {
            if (sectionContent[requiredFieldId] === undefined) {
                errors.push(`Missing field '${requiredFieldId}' in Section '${sectionId}' (#${sectionN})`);
            }
        }
        if (errors.length > 0) {
            return errors;
        }
        let foundError = false;
        for (const [key, value] of Object.entries(sectionContent)) {
            if (
                !PdfGen.validateSectionField(
                    key,
                    value,
                    signatureFields.filter(f => f.id === key)[0],
                    errors,
                    sectionId,
                    sectionN,
                    checkPaths
                )
            ) {
                foundError = true;
            }
        }
        return errors;

    }

    static validateSectionField(fieldId, fieldContent, fieldSpec, errors, sectionId, sectionN, checkPaths = false) {
        const normalizedContent = Array.isArray(fieldContent) ? fieldContent : [fieldContent];
        if (normalizedContent.length < fieldSpec.nValues[0] || normalizedContent.length > fieldSpec.nValues[1]) {
            errors.push(`${normalizedContent.length} values for field '${fieldId}' in Section '${sectionId}' (#${sectionN}) - expected ${fieldSpec.nValues[0]}-${fieldSpec.nValues[1]} value(s)`);
            return false;
        }
        if (fieldSpec.typeName) {
            if (!["boolean", "number", "string", "obs", "tNotes", "translationText", "md", "juxta"].includes(fieldSpec.typeName)) {
                errors.push(`Unknown typeName '${fieldSpec.typeName}' in Section '${sectionId}' (#${sectionN})`);
                return false;
            }
            if (fieldSpec.typeName === "boolean") {
                const badValues = normalizedContent.filter(c => !!c !== c);
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not booleans`);
                    return false;
                }
            }
            if (fieldSpec.typeName === "number") {
                let badValues = normalizedContent.filter(c => typeof c !== "number");
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not numbers`);
                    return false;
                }
                if (fieldSpec.minValue) {
                    badValues = normalizedContent.filter(c => c < fieldSpec.minValue);
                    if (badValues.length > 0) {
                        errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are < minValue ${fieldSpec.minValue}`);
                        return false;
                    }
                }
                if (fieldSpec.maxValue) {
                    badValues = normalizedContent.filter(c => c > fieldSpec.maxValue);
                    if (badValues.length > 0) {
                        errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are > maxValue ${fieldSpec.maxValue}`);
                        return false;
                    }
                }
            } else if (fieldSpec.typeName === "string") {
                const badValues = normalizedContent.filter(c => typeof c !== "string");
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not strings`);
                    return false;
                }
            } else if (["obs", "tNotes", "translationText", "md", "juxta"].includes(fieldSpec.typeName)) {
                const badValues = normalizedContent.filter(c => typeof c !== "string");
                if (badValues.length > 0) {
                    errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) are not path strings`);
                    return false;
                }
                if (checkPaths) {
                    const unresolvedValues = normalizedContent
                        .map(c => resolvePath(c))
                        .filter(c => !fse.pathExistsSync(resolvePath(c)));
                    if (unresolvedValues.length > 0) {
                        errors.push(`${unresolvedValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) could not be resolved in the FS: ${unresolvedValues.map(p => `'${p}'`).join(',')}`);
                    }
                }
            }
        }
        if (fieldSpec.typeEnum) {
            const enumIds = fieldSpec.typeEnum.map(e => e.id);
            const badValues = normalizedContent.filter(c => !enumIds.includes(c));
            if (badValues.length > 0) {
                errors.push(`${badValues.length} value(s) of field '${fieldId}' in Section '${sectionId}' (#${sectionN}) not found in enum [${fieldSpec.typeEnum.map(e => e.id).join(", ")}]`);
                return false;
            }
        }
        if (fieldSpec.typeSpec) {
            let foundError = false;
            for (const fieldContentItem of fieldContent) {
                const fieldReport = PdfGen.validateSectionFields(
                    {
                        signatureFields: fieldSpec.typeSpec,
                        sectionId,
                        sectionN,
                        sectionContent: fieldContentItem,
                        errors,
                        checkPaths: true
                    }
                );
                if (fieldReport) {
                    foundError = true;
                }
            }
            if (foundError) {
                return false;
            }
        }
        return true;
    }

    async originatePdfs() {
        return await _originatePdfs(this.options, this.doPdfCallback);
    }

    async assemblePdfs() {
        return await _assemblePdfs(this.options, this.doPdfCallback);
    }
}

module.exports = PdfGen;
