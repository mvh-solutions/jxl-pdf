# jxl-pdf
Printable PDFs from Sundesmos Juxtalinear JSON

## Generating HTML and PDF
```
# Install the script

npm install

# Set up a localhost server for the static directory where the HTML will be placed
# by the script and retrieved over HTTP by Puppet. Any static
# web server will do this, here we use "serve".

serve static

# Run the script, passing the port of the server as an argument.

node scripts/make_html.js ./config/fr/xenizo.json PHP 1234 newDir

# View the HTML via the localhost browser under `html`. (Scripts won't work from
# file explorer because of CORS.) The generated PDFs are in a subdirectory.
```
