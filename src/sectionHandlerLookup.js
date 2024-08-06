const {
    TwoColumnSection,
    FourColumnSpreadSection,
    BookNoteSection,
    PdfSection,Section,
    JxlSpreadSection,
    JxlSimpleSection,
    BcvBibleSection,
    ParaBibleSection,
    BiblePlusNotesSection,
    BiblePlusNotesBySentenceSection,
    MarkdownSection,
    ObsSection,
    ObsPlusNotesSection
} = require("./sectionHandlerClasses");

const sectionHandlerLookup = {
    pdf: new PdfSection(),
    markdown: new MarkdownSection(),
    obs: new ObsSection(),
    obsPlusNotes: new ObsPlusNotesSection(),
    jxlSpread: new JxlSpreadSection(),
    jxlSimple: new JxlSimpleSection(),
    "4ColumnSpread": new FourColumnSpreadSection(),
    "2Column": new TwoColumnSection(),
    bookNote: new BookNoteSection(),
    bcvBible: new BcvBibleSection(),
    paraBible: new ParaBibleSection(),
    biblePlusNotes: new BiblePlusNotesSection(),
    biblePlusNotesBySentence: new BiblePlusNotesBySentenceSection()
};

module.exports = {sectionHandlerLookup};
