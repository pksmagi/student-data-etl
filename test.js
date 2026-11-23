const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflow.json'), 'utf8'));
const nodes = Object.fromEntries(workflow.nodes.map(node => [node.name, node]));
const run = (name, rows) => new Function('$input', nodes[name].parameters.jsCode)({
  all: () => rows.map(json => ({ json })),
}).map(item => item.json);
const normalize = rows => run('Normalize rows', rows);
const filter = rows => run('Filter paid and valid email', rows);
const deduplicate = rows => run('Remove duplicate emails', rows);

// The supplied fixture has no quoted fields or embedded newlines.
const lines = fs.readFileSync(path.join(__dirname, 'students.csv'), 'utf8').trimEnd().split(/\r?\n/);
const headers = lines.shift().split(',');
const rows = lines.map(line => {
  const cells = line.split(',');
  assert.equal(cells.length, headers.length);
  return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
});
const normalized = normalize(rows);
const eligible = filter(normalized);
const clean = deduplicate(eligible);

assert.deepEqual([rows.length, normalized.length, eligible.length, clean.length], [55, 55, 22, 19]);
assert.deepEqual(normalized[50], {
  Student_ID: 'STU1006', Name: 'Deepa M', Email: 'deepam@gmail.com', Phone: '8123456789',
  Course: 'Data Science', Fee_Paid: 'yes', City: 'Salem', Enrolled_Date: '09-03-2025',
});
assert.equal(normalized[52].Course, 'Machine Learning');
assert.equal(clean.filter(row => row.Email === 'deepam@gmail.com').length, 1);
assert(!clean.some(row => row.Student_ID === 'STU1051' || row.Student_ID === 'STU1052'));
assert.throws(() => normalize([{ Name: 'Missing headers' }]), /Missing required column/);
assert.equal(filter([{ Fee_Paid: 'yes', Email: 'broken@' }, { Fee_Paid: 'no', Email: 'ok@example.com' }]).length, 0);

const escape = value => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = [headers.join(','), ...clean.map(row => headers.map(header => escape(row[header])).join(','))].join('\n') + '\n';
const output = path.join(__dirname, 'students_clean.csv');
if (process.argv.includes('--write')) fs.writeFileSync(output, csv);
assert.equal(fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n'), csv);
console.log(`Input ${rows.length}; filtered ${rows.length - eligible.length}; duplicates ${eligible.length - clean.length}; output ${clean.length}`);
