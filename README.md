# jxl-pdf
Versatile, print-ready PDFs, from industry-standard source files, in Javascript

## Installing the Fonts
- https://fonts.google.com/specimen/Gentium+Book+Plus
- https://fonts.google.com/specimen/Open+Sans

## Installation
```
# Install the script

npm install
```
## Script options

Usage: `node scripts/make_pdfs.js [options]`

  **-V, --version**: output the version number
  
  **-c, --config <path>** (Required): Path to the JSON config file (must exist)
  
  **-o, --output <path>** (Required): Path to which the final PDF should be written (should not exist unless --force-overwrite flag is set)
  
  **-w, --working-dir <path>**: Path to a directory for temporary files including originated PDFs. This directory will be created recursively if necessary, and will be cleared whenever the ASSEMBLE stage runs. (default: "/home/mark/.jxlpdf/working")
  
  **-f, --force-overwrite**: When set, will clear and overwrite an existing directory for output. Use with care! (default: false)
  
  **-v, --verbose**: When set, generates console output for debugging and entertainment purposes (default: false)
  
  **-b, --book <bookCode>**: Paratext 3-character bookCode, eg 'TIT' (required for some configurations) (default: null)
  
  **-p, --page-format <spec>**: One of A0, A1, A2, A3, A4, A5, A6, A7, LETTER, EXECUTIVE, EXECUTIVE_LULU_WITH_BLEED or '<pointWidth>,<pointHeight>' (eg '504,720' with no spaces) (default: [504,720])
  
  **-s, --steps <stepsType>**: The processing steps that will take place. Options are ARGSONLY, CLEAR, ORIGINATE, ASSEMBLE, ALL (default: ["originate","assemble"])
  
  **-h, --help**: display help for command
