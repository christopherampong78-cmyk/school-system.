// A mark can be {ca, exam} (new) or a plain number (older data, treated as an exam mark).
export const partsOf = (v) => {
  if (v && typeof v === 'object') return { ca: v.ca, exam: v.exam };
  if (typeof v === 'number') return { ca: undefined, exam: v };
  return {};
};
export const totalOf = (v) => {
  const p = partsOf(v);
  const a = [p.ca, p.exam].filter(x => typeof x === 'number');
  return a.length ? a.reduce((t, x) => t + x, 0) : undefined;
};
export const maxes = (exam = {}) => {
  const ca = Number(exam.caMax) || 0;
  const ex = exam.examMax !== undefined ? Number(exam.examMax) : Number(exam.maxScore) || 100;
  return { ca, exam: ex, total: ca + ex };
};
