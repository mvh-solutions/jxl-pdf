const setupOneCSS = (fileContent, placeholder, markup, value) => {
    const substRe = new RegExp(`${markup}${placeholder}${markup}`, "g");
    return fileContent.replace(substRe, value);
}

const checkCssSubstitution = (filename, css, markup) => {
    const checkRe = new RegExp(`${markup}[A-Z0-9]+${markup}`);
    if (checkRe.test(css)) {
        throw new Error(`${checkRe.exec(css)} found in CSS from ${filename} after substitution`);
    }
}

module.exports = {
    setupOneCSS,
    checkCssSubstitution
}
