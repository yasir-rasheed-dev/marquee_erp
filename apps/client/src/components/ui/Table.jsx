import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className="overflow-x-auto rounded-xl border border-theme-border-default">
    <table className={`w-full text-sm text-left ${className}`}>{children}</table>
  </div>
);

export const TableHead = ({ children }) => (
  <thead className="bg-theme-bg-elevated text-theme-text-secondary uppercase text-xs font-semibold">{children}</thead>
);

export const TableBody = ({ children }) => (
  <tbody className="divide-y divide-theme-border-default">{children}</tbody>
);

export const TableRow = ({ children, className = '', onClick }) => (
  <tr onClick={onClick}
    className={`bg-theme-bg-card hover:bg-theme-bg-hover transition-colors duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-5 py-4 text-theme-text-primary ${className}`}>{children}</td>
);

export const TableHeaderCell = ({ children, className = '' }) => (
  <th className={`px-5 py-3.5 ${className}`}>{children}</th>
);
export default Table;