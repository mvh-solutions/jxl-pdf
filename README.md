# jxl-pdf
Printable PDFs from Sundesmos Juxtalinear JSON

## Installing the Fonts
- https://fonts.google.com/specimen/Gentium+Book+Plus
- https://fonts.google.com/specimen/Open+Sans

## installing python

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
```
# Install the script

npm install

# bookCode may be required depending on the config.
# npm start <configPath> <outputDirName> [<bookCode>]

# for e.g.
npm start ./config/fr/xenizo.json newDir TIT

# The generated PDFs are in a subdirectory.
# under static/html/<outputDirName>/pdf
```

if you don't want to launch the python code send the option `-n` or `--no-python` to the script like so :  
`npm start ./config/fr/xenizo.json newDir TIT -- -n`  

The final pdf will not be generated.  

If you want to run ONLY the python code to generate the final pdf, run the script :  
`npm run python <outputDirName>`
