import React from 'react';

interface BadgeProps {
  label: string;
  bg?: string;
  color?: string;
  border?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  bg = '#f1f5f9',
  color = '#475569',
  border = 'transparent',
}) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        lineHeight: 1.3,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
};

