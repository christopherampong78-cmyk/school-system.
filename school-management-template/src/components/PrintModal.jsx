import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';

// A dialog whose content (".sheet") is the only thing printed.
export default function PrintModal({ title, onClose, children }) {
  function print() {
    document.body.classList.add('printing-modal');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-modal'), { once: true });
    window.print();
  }
  return createPortal(
    <div className="modal-back portal-modal" onClick={onClose}>
      <div className="modal card wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head no-print-modal">
          <h3>{title}</h3>
          <span>
            <button className="btn primary" onClick={print}><Printer size={16} /> Print</button>{' '}
            <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </span>
        </div>
        <div className="sheet">{children}</div>
      </div>
    </div>,
    document.body
  );
}
