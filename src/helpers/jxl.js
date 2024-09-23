const cvForSentence = (sentence, punctuation) => {
    const referencePunctuation =
        punctuation ||
        {
        "bookChapter": " ",
            "chapterVerse": ":",
            "verseRange": "-"
    }
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
        return `${c1}${referencePunctuation.bookChapter}${v1}${referencePunctuation.verseRange}${v2}`;
    }
    return `${cv1}${referencePunctuation.verseRange}${cv2}`
};

const tidyLhsText = (cvRecord) => {
    let tokens = cvRecord.tokens;
    return (
        tokens.map(cvr => cvr.payload).join('')
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
    tidyLhsText,
    getGreekContent
}
