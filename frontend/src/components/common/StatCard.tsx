import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: string;
  trendColor?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendColor = '#059669',
  highlight = false,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '22px 24px',
        border: highlight ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
        boxShadow: highlight
          ? '0 10px 25px -5px rgba(99, 102, 241, 0.12)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
          {title}
        </span>
        {icon && (
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f1f5f9',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px',
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ marginTop: '14px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>
        {(subtitle || trend) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              fontSize: '12px',
            }}
          >
            {trend && (
              <span style={{ color: trendColor, fontWeight: 700 }}>{trend}</span>
            )}
            {subtitle && <span style={{ color: '#94a3b8' }}>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

