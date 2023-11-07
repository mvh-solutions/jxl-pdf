const fse = require("fs-extra");
const path = require("path");
const {doPuppet} = require("../helpers");
const doFrontSection = async ({section, serverPort, bookCode, outputDirName, outputPath, templates}) => {
    const content = templates['non_juxta_page']
        .replace(
            "%%TITLE%%",
            `${section.id} - ${section.type}`
        )
        .replace(
            "%%BODY%%",
            fse.readFileSync(path.resolve(path.join('data', `${section.path}.html`))).toString()
        )
    fse.writeFileSync(
        path.join(outputPath, outputDirName, `${section.id.replace('%%bookCode%%', bookCode)}.html`),
        content
    );
    await doPuppet(
        serverPort,
        section.id.replace('%%bookCode%%', bookCode),
        path.resolve(path.join(outputPath, outputDirName, 'pdf', `${section.id.replace('%%bookCode%%', bookCode)}.pdf`)),
        true,
        outputDirName
    );
}
module.exports = doFrontSection;
