export default function Seg({ tabs, value, onChange }) {
  return (
    <div className="seg no-print">
      {tabs.map(([k, label]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  );
}
