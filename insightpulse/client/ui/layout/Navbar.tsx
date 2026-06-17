import React from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavbarProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  rightContent?: React.ReactNode;
  onMenuToggle?: () => void;
  showMenuToggle?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  breadcrumbs,
  rightContent,
  onMenuToggle,
  showMenuToggle = false,
}) => {
  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
      {showMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex items-center gap-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-slate-400">/</span>}
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`hover:text-slate-900 ${
                      index === breadcrumbs.length - 1
                        ? 'text-slate-900 font-medium'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={`${
                      index === breadcrumbs.length - 1
                        ? 'text-slate-900 font-medium'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : title ? (
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        ) : null}
      </div>

      {rightContent && <div className="flex items-center gap-4">{rightContent}</div>}
    </nav>
  );
};
