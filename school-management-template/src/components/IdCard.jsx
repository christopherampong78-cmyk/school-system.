import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../data';
import { initials } from '../lib/students';

export function CardFront({ s }) {
  const { school } = useData();
  return (
    <div className="idcard front">
      <div className="idcard-head">
        <img src={school.logo} alt="" />
        <div>
          <b>{school.name}</b>
          <span>{school.tagline}</span>
        </div>
      </div>
      <div className="idcard-body">
        {s.photo ? <img className="idcard-photo" src={s.photo} alt="" /> : <div className="idcard-photo ph">{initials(s.name)}</div>}
        <div className="idcard-info">
          <strong>{s.name}</strong>
          <span>ID: {s.studentId}</span>
          <span>Class: {s.className}</span>
          <span>{school.academicYear}</span>
        </div>
      </div>
    </div>
  );
}

export function CardBack({ s, token }) {
  const { school } = useData();
  return (
    <div className="idcard back">
      <div className="idcard-qr">
        {token ? <QRCodeSVG value={token} size={92} level="M" /> : <div className="idcard-photo ph">?</div>}
        <span>Scan to sign in</span>
      </div>
      <div className="idcard-note">
        <b>{s.studentId}</b>
        <span>If found, please return to {school.name}.</span>
        <span>{school.address}</span>
        <span>Tel: {school.phone}</span>
      </div>
    </div>
  );
}
