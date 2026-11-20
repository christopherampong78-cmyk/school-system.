// Turns rows from an Excel/CSV sheet into student records.
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function readSheet(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
}

export function parseRows(rows, classNames) {
  if (!rows.length) return { items: [], error: 'The file is empty.' };
  const lower = rows[0].map(c => String(c).trim().toLowerCase());
  const hasHeader = lower.some(c => /name|class|gender|sex|guardian|parent|phone|contact/.test(c));
  const find = (re, not) => lower.findIndex(c => re.test(c) && !(not && not.test(c)));
  const idx = hasHeader ? {
    name: find(/name|student|pupil/, /guardian|parent|first|last|sur|middle|other|given|family/),
    first: find(/first|given/), middle: find(/middle|other/), last: find(/last|sur|family/),
    cls: find(/class|grade|form|level/), gender: find(/gender|sex/),
    guardian: find(/guardian|parent/, /phone|tel|contact|mobile|number/), phone: find(/phone|tel|contact|mobile/),
  } : { name: 0, first: -1, middle: -1, last: -1, cls: 1, gender: 2, guardian: 3, phone: 4 };

  if (idx.name < 0 && idx.first < 0 && idx.last < 0) return { items: [], error: 'Could not find a Name column. Put the student names in the first column, or use a heading such as "Name".' };

  const get = (row, i) => (i >= 0 ? String(row[i] ?? '').replace(/\s+/g, ' ').trim() : '');
  const items = (hasHeader ? rows.slice(1) : rows).map(row => {
    const name = idx.name >= 0 ? get(row, idx.name) : [get(row, idx.first), get(row, idx.middle), get(row, idx.last)].filter(Boolean).join(' ');
    const rawClass = get(row, idx.cls);
    const g = get(row, idx.gender).toLowerCase();
    let phone = get(row, idx.phone);
    if (/^\d{9}$/.test(phone)) phone = '0' + phone; // Excel drops the leading 0
    return {
      name, rawClass,
      className: classNames.find(c => norm(c) === norm(rawClass)) || '',
      gender: /^(f|g)/.test(g) ? 'Female' : /^(m|b)/.test(g) ? 'Male' : '',
      guardianName: get(row, idx.guardian), guardianPhone: phone,
    };
  }).filter(it => it.name);

  return { items, error: items.length ? '' : 'No student names were found in the file.' };
}

export const templateCsv = 'Name,Class,Gender,Guardian,Phone\nAma Mensah,Basic 3,F,Mr Mensah,0240000000\nKofi Boateng,Basic 3,M,Mrs Boateng,0200000000\n';
