import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({ onResult }) {
  const [err, setErr] = useState('');

  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader');
    let done = false;
    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 220 },
      (text) => {
        if (done) return;
        done = true;
        qr.stop().catch(() => {}).finally(() => onResult(text));
      },
      () => {}
    ).catch(() => setErr('Camera unavailable. Allow camera access, or use the Student Token tab.'));

    return () => {
      try { if (qr.isScanning) qr.stop().then(() => qr.clear()).catch(() => {}); } catch { /* already stopped */ }
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <div id="qr-reader" className="scanner" />
      {err ? <p className="error">{err}</p> : <p className="hint">Hold the QR code on the ID card inside the frame.</p>}
    </div>
  );
}
