import React from 'react';
import { Check, ShoppingCart } from 'lucide-react';

export function StoreView({ storeItems, onBuy }) {
  return (
    <div className="grid">
      {storeItems.map(item => (
        <div key={item.id} className="card" style={{ borderColor: item.popular ? 'var(--money)' : 'var(--card-border)' }}>
          <div>
            <h3 className="card-title" style={{ color: item.color }}>{item.name}</h3>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--money)', margin: '12px 0' }}>
              {item.price.toLocaleString()} UZS <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ oyiga</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.features.map((f, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#ccc', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Check size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-wallet" style={{ marginTop: '20px', width: '100%' }} onClick={() => onBuy(item.price)}>
            <ShoppingCart size={16} /> Xarid qilish
          </button>
        </div>
      ))}
    </div>
  );
}
