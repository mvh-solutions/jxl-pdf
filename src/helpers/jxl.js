const cvForSentence = sentence => {
    const cvSet = new Set([]);
    sentence.chunks.forEach(c => c.source.forEach(se => cvSet.add(se.cv)));
    const cvValues = Array.from(cvSet);
    const cv1 = cvValues[0];
    const cv2 = cvValues[cvValues.length - 1];
    if (cv1 === cv2) {
        return cv1;
    }
    const [c1, v1] = cv1.split(':');
    const [c2, v2] = cv2.split(':');
    if (c1 === c2) {
        return `${c1}:${v1}-${v2}`;
    }
    return `${cv1}-${cv2}`
};

const trimLhsText = (cvRecord, greekContent) => {
    if (!greekContent) {
        throw new Error('Trimming text requires Greek content: make sure this is first in the config LHS array');
    }
    let tokens = cvRecord.tokens;
    while (tokens.length > 0) {
        const firstTokenGreek = tokens[0].scopes.length === 0 ? "banana" : tokens[0].scopes[0].split('/').reverse()[0];
        if (greekContent.has(firstTokenGreek)) {
            break;
        }
        tokens = tokens.slice(1);
    }
    let punctuation = [];
    while (tokens.length > 0) {
        const lastTokenGreek = tokens[tokens.length - 1].scopes.length === 0 ? "banana" : tokens[tokens.length - 1].scopes[0].split('/').reverse()[0];
        if (greekContent.has(lastTokenGreek)) {
            break;
        }
        if (lastTokenGreek === "banana") {
            punctuation.push(tokens[tokens.length - 1].payload);
        } else {
            punctuation = [];
        }
        tokens.pop();
    }
    return (
        tokens.map(cvr => cvr.payload).join('') +
        punctuation.reverse().join('')
    ).replace(/\\s/g, " ")
        .replace(/ ;/g, "&nbsp;;")
        .replace(/ :/g, "&nbsp;:")
        .replace(/ !/g, "&nbsp;!")
        .replace(/{([^}]+)}/g, (res, m1) => `<i>${m1}</i>`)
        .trim();
}

const getGreekContent = chunks => {
    const payloadSet = new Set([]);
    chunks.forEach(
        ch => ch.source.forEach(
            s => payloadSet.add(s.content)
        )
    );
    return payloadSet;
}

module.exports = {
    cvForSentence,
    trimLhsText,
    getGreekContent
}
