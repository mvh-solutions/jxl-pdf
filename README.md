# jxl-pdf
Printable Scripture-related PDFs, from industry-standard source files, via a Javascript library

## Fonts you may need
- **Andika**: https://fonts.google.com/specimen/Andika
- **Cardo**: https://fonts.google.com/specimen/Cardo
- **Charis**: https://fonts.google.com/specimen/Charis
- **Ezra**: https://software.sil.org/ezra/ (for Hebrew)
- **Gentium Book Plus**: https://fonts.google.com/specimen/Gentium+Book+Plus (needed for page numbers)
- **Noto Naskh Arabic**: https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic
- **Open Sans**: https://fonts.google.com/specimen/Open+Sans
- **Roboto**: https://fonts.google.com/specimen/Roboto

## Installation
```
# Install the library

npm install
```
## Running the test projects
```
node scripts/make_pdf.js -c test/juxtas.json
node scripts/make_pdf.js -c test/psle.json
```

## Script options

Usage: `node scripts/make_pdfs.js [options]`

**-V, --version**: Output the version number and exit

**-h, --help**: Display help and exit

**-c, --config <path> (Required)**: Path to the JSON config file (must exist)

**-o, --output <path>**: Path to which the final PDF should be written (must not exist unless --force-overwrite flag is
set)

**-w, --working-dir <path>**: Path to a directory for temporary files including originated PDFs. This directory will be
created recursively if necessary, and will be cleared whenever the command is run. (default: "~/.jxlpdf/working")

**-r, --resources-dir <path>**: Path to a directory containing project-specific images etc.

**-f, --force-overwrite**: When set, will clear and overwrite an existing directory for output. Use with care! (default: false)

**-v, --verbose**: When set, generates console output for debugging and entertainment purposes (default: false)

**-p, --page-format <spec>**: One of EXECUTIVE, LETTERP, A4P, A3P, A5P, A6P, POCKETP (default: "A4P")

**-F, --fonts <fontsType>**: The set of fonts to use. Options are allGentium, gentiumOpen, allCharis, charisOpen, allOpen,
allCardo, cardoOpen, allRoboto, andikaCharis, notoNaskh (default: "allGentium")

**-S, --fontSizes <fontSizesType>**: The set of font sizes to use. The name indicates the body font size and line spacing (in point)
(format : {body font}on{line spacing}). Options are 9on10, 9on11, 10on12, 10on13, 12on14, 12on15, 14on16 (default: "9on10")

## To normalize PDF with vectorized text using Ghostscript:
```
cd scripts
./vectorize.bsh path/to/infile.pdf path/to/outfile.pdf
```
