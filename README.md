# jxl-pdf
Printable PDFs from Sundesmos Juxtalinear JSON

## Installing the Fonts
- https://fonts.google.com/specimen/Gentium+Book+Plus
- https://fonts.google.com/specimen/Open+Sans

## Generating HTML and PDF
```
# Install the script

npm install

# Run the script, passing the port of the server as an argument.
# bookCode may be required depending on the config.
# npm start <configPath> <outputDirName> [<bookCode>]
# Keep outputDirName as 'newDir' for now (hardwired into Python code)

npm start ./config/fr/xenizo.json newDir TIT

# The generated PDFs are in a subdirectory.
```

## Generating the FULL PDF (python)

```bash
# to install pyenv and activate all the requirements
cd python-jxl
./install_pyenv.sh

source ~/.bashrc

pyenv install -v 3.9.15

pyenv virtualenv 3.9.15 cut_pdf

pip install -r requirements.txt

python cut_pdf.py
```
