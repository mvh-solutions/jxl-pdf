# jxl-pdf
Printable PDFs from Sundesmos Juxtalinear JSON

## Installing the Fonts
- https://fonts.google.com/specimen/Gentium+Book+Plus
- https://fonts.google.com/specimen/Open+Sans

## Generating HTML and PDF
```
# Install the script

npm install

# Set up a localhost server for the static directory where the HTML will be placed
# by the script and retrieved over HTTP by Puppet. Any static
# web server will do this, here we use "serve".

serve static

# Run the script, passing the port of the server as an argument.
# bookCode may be required depending on the config.
# node make_html.js <configPath> <serverPort> <outputDirName> [<bookCode>]
# Keep outputDirName as 'newDir' for now (hardwired into Python code)

node scripts/make_html.js ./config/fr/xenizo.json 1234 newDir TIT

# View the HTML via the localhost browser under `html`. (Scripts won't work from
# file explorer because of CORS.) The generated PDFs are in a subdirectory.
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
