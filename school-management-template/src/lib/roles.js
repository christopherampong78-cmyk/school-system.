// owner = you (can edit Settings). admin = school head / secretary (everything else).
export const OWNER = ['owner'];
export const ADMIN = ['owner', 'admin'];
export const ACAD = ['owner', 'admin', 'teacher'];
export const FIN = ['owner', 'admin', 'accountant'];
export const ALL = ['owner', 'admin', 'teacher', 'accountant'];
export const isAdminRole = (r) => r === 'owner' || r === 'admin';
