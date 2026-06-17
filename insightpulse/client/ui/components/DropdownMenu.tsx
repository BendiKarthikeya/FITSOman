import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: Array<{
    label?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    divider?: boolean;
  }>;
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleItemClick = (onClick?: () => void) => {
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute top-full mt-1 min-w-[160px] bg-white border border-slate-200 rounded-md shadow-lg z-50 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider ? (
                <div className="h-px bg-slate-200 my-1" />
              ) : (
                <button
                  onClick={() => handleItemClick(item.onClick)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
