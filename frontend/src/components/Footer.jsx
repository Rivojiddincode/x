import React from 'react';

export function Footer({ onOpenTerms, onOpenPrivacy }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--card-border)',
      marginTop: '48px',
      padding: '24px 20px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={onOpenTerms} style={linkStyle}>Foydalanuvchi shartlari</button>
        <button onClick={onOpenPrivacy} style={linkStyle}>Maxfiylik siyosati</button>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} StarsCS. Barcha huquqlar himoyalangan.
      </p>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
        Skinlar belgilangan narxda sotiladi — tasodifiy natijaga asoslangan xarid mavjud emas.
      </p>
    </footer>
  );
}

const linkStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '12px',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
};
