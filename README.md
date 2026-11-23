# Student data ETL in n8n

Import `workflow.json` to run a manual Google Drive CSV pipeline. `students.csv` is the input and `students_clean.csv` is the expected output for the included input. The first 50 input rows are the supplied dataset; the last five are synthetic additions: three repeated students with different casing/spacing and two students with blank emails.

## Rules

- Trim and collapse whitespace in all fields. Normalize names, courses and cities to title case, student IDs to uppercase, and emails and fee values to lowercase. Treat `ml` as `Machine Learning`.
- Keep rows with `Fee_Paid` equal to `yes` and an email in a basic `local@domain.tld` format. This is a syntax check, not proof the address exists. Blank and malformed emails are dropped, not repaired or sent to review.
- Among the remaining rows, the same normalized email identifies the same student, regardless of course. Keep the first eligible row in file order; filtering happens first, so an unpaid row cannot hide a later paid row. Distinct people who share an email will be treated as duplicates.
- Keep all eight original columns. Blank phone/city values and dates are retained, not validated or invented. Dates remain in the input's `DD-MM-YYYY` format.

The supplied data has **no enrollment-status column**. `Fee_Paid` is the chosen filter; it is not assumed to be equivalent to enrollment status.

## Sample result

| Stage | Rows |
| --- | ---: |
| Input and normalization | 55 |
| After paid/valid-email filter | 22 |
| After email deduplication / output | 19 |

Thus 33 rows are filtered out and 3 eligible duplicates removed. The count breakdown depends on filter-before-deduplication order.

## Setup and run

1. Upload `students.csv` as a CSV file to a Google Drive folder.
2. In n8n, import `workflow.json` using **Workflows > Add workflow > Import from file** (the menu wording may vary by version).
3. In both Google Drive nodes, select a Google Drive OAuth credential with access to that folder. In **Download students.csv**, select the uploaded file. In **Upload clean CSV**, select the same parent drive and folder. For a shared drive, select that drive rather than My Drive.
4. Click **Execute workflow**. Inspect the item counts at **Extract rows**, **Filter paid and valid email**, and **Remove duplicate emails**; then open the uploaded `students_clean.csv` in Drive and compare it with the input.
5. Capture the executed canvas and before/after CSVs side by side for the requested submission. Share the private repository only with people who have access; WhatsApp sharing must be done separately.

The Drive upload creates a **new file on each run**, not an overwrite; remove or distinguish older outputs when checking results. If no rows pass the filter, n8n stops the downstream path and no CSV is uploaded. An empty input likewise produces no output; a populated input with missing required headers fails at normalization. Google credentials, file IDs, and folder IDs are intentionally not included.

## Local sample check

With Node.js installed, run `node test.js`. This executes the actual JavaScript from the three workflow Code nodes against the fixture, checks edge cases and row counts, and compares the resulting rows with `students_clean.csv`. To regenerate the sample after an intentional rule change, run `node test.js --write` after updating the expected assertions. This local check does not exercise n8n's Google Drive integration.
