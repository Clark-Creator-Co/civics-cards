# Civics Cards

Flash cards and practice tests for the 128 questions of the 2025 U.S. naturalization civics test.

- `index.html` is the page. It is built, so do not edit it by hand.
- `src/app.template.html` is the page source.
- `src/questions.txt` is the text of the official USCIS list, form M-1778 (09/25).
- `src/build.mjs` puts the questions into the page.

To rebuild: `node src/build.mjs src/questions.txt src/app.template.html artifact.html index.html`

The names of officials are in the `OFFICIALS` block of the template. Check them against uscis.gov/citizenship/testupdates.
