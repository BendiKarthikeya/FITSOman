import React from 'react';

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ className = '', ...props }) => {
  return <table className={`w-full text-sm ${className}`} {...props} />;
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', ...props }) => {
  return <thead className={`border-b border-slate-200 bg-slate-50 ${className}`} {...props} />;
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', ...props }) => {
  return <tbody className={className} {...props} />;
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', ...props }) => {
  return <tr className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${className}`} {...props} />;
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...props }) => {
  return <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 ${className}`} {...props} />;
};

export const TableCell: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ className = '', ...props }) => {
  return <td className={`px-4 py-3 text-slate-900 ${className}`} {...props} />;
};
