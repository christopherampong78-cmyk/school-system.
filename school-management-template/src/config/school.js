// Defaults only. Everything except idPrefix/authDomain can be changed later in Settings.
export const school = {
  name: 'Royal Websters Academy',
  shortName: 'RWA',
  tagline: 'Academic Excellence',
  motto: '',
  logo: '/logo.svg',
  primary: '#1d5cff',
  idPrefix: 'RWA',                       // student IDs look like RWA0001
  authDomain: 'students.rwa.local',      // must be unique per client; never a real email domain
  academicYear: '2025/2026',
  term: 'Term 1',
  address: 'Add school address',
  phone: '0000000000',
  email: '',
  website: '',
  currency: 'GH₵',
  bgInterval: 6,
  classes: [
    'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
    'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6',
    'JHS 1', 'JHS 2', 'JHS 3',
  ],
  poweredBy: { name: 'Chris Boa Consult', link: 'https://wa.me/233557349478' },
};
