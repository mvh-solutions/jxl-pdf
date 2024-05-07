const _originatePdfs = require('./originatePdfs');
const _assemblePdfs = require('./assemblePdfs');
const fonts = require('../resources/fonts.json');
const pages = require('../resources/pages.json');
const sizes = require('../resources/sizes.json');
const handlers = require('./sectionHandlerClasses');
const fse = require("fs-extra");

class PdfGen {

    constructor(options) {
        this.options = options;
    }

    async doPdf() {
        const options = this.options;
        // Check that output file will not accidentally overwrite an existing file
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
                    console.log("fail")
                    const globalSpecKeysString = globalSpecKeys[globalKey]
                        .map(v => `'${v}'`)
                        .join(", ");
                    ret.push(`Unexpected value '${configOb.global[globalKey]}' for global key '${globalKey}'. Expected one of ${globalSpecKeysString}`);
                    skip = true;
                }
            }
        }
        return ret;
    }

    async originatePdfs() {
        return await _originatePdfs(this.options);
    }

    async assemblePdfs() {
        return await _assemblePdfs(this.options);
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
}

module.exports = PdfGen;
