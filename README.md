# jxl-pdf
Printable PDFs from Sundesmos Juxtalinear JSON

## Installing the Fonts
- https://fonts.google.com/specimen/Gentium+Book+Plus
- https://fonts.google.com/specimen/Open+Sans

## Installing python

```bash
# to install pyenv and activate all the requirements
cd python-jxl
./install_pyenv.sh

source ~/.bashrc

pyenv install -v 3.9.15

pyenv virtualenv 3.9.15 cut_pdf

pip install -r requirements.txt
```

## Generating HTML and PDF

note : ***If `pageFormat` is not set, it will set the page format to default : `EXECUTIVE`***

```
# Install the script

npm install

# bookCode may be required depending on the config.
# npm start -- -c <configPath> -o <outputDirName> [-b <bookCode> -p <pageFormat>]
# or
# node scripts/make_html.js -c <configPath> -o <outputDirName> [-b <bookCode> -p <pageFormat>]

# for e.g.
npm start -- -c ./config/fr/xenizo.json -o newDir -b TIT
# or
node scripts/make_html.js -c ./config/fr/xenizo.json -o newDir -b TIT

# The generated PDFs are in a subdirectory.
# under static/html/<outputDirName>/pdf
```

if you don't want to launch the python code send the option `-n` or `--no-python` to the script like so :  
`npm start -- -c ./config/fr/xenizo.json -o newDir -b TIT --no-python`  
or  
`node scripts/make_html.js -c ./config/fr/xenizo.json -o newDir -b TIT --no-python`  

The final pdf will not be generated.  

If you want to run ONLY the python code to generate the final pdf, run the script :  
`npm run python <outputDirName> [<pageFormat>]`  
