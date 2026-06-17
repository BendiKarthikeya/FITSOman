import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from './Button';

interface TrendItem {
  theme: string;
  mention: number;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  example: string;
}

interface TrendsTableProps {
  data?: TrendItem[];
  onViewAll?: () => void;
  onMoreClick?: (item: TrendItem) => void;
}

const defaultData: TrendItem[] = [
  { theme: 'Leadership', mention: 42, sentiment: 'Positive', example: '"Great clarity"' },
  { theme: 'Workload', mention: 24, sentiment: 'Negative', example: '"Too much"' },
  { theme: 'Support', mention: 13, sentiment: 'Neutral', example: '"Response slow"' },
  { theme: 'Development', mention: 20, sentiment: 'Positive', example: '"Great features added"' },
  { theme: 'Marketing', mention: 15, sentiment: 'Negative', example: '"Low engagement rates"' },
];

export const TrendsTable: React.FC<TrendsTableProps> = ({
  data = defaultData,
  onViewAll,
  onMoreClick,
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Title row — outside the white table card, matching Figma */}
      <div className="flex items-center justify-between w-full">
        <h2 className="font-['IBM_Plex_Sans'] font-semibold text-[20px] leading-[1.4] text-slate-900">
          Trends Theme
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={onViewAll}
          className="bg-slate-900 text-white hover:bg-slate-800 border border-slate-950 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] h-8 px-[10px]"
        >
          View All
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-[#e2e8f0] flex flex-col items-start overflow-hidden rounded-lg w-full">
        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="text-left px-2 py-0 h-10 text-[14px] font-['IBM_Plex_Sans'] font-medium text-slate-900">
                  Theme
                </th>
                <th className="text-left px-2 py-0 h-10 w-[97px] text-[14px] font-['IBM_Plex_Sans'] font-medium text-slate-900">
                  Mention
                </th>
                <th className="text-left px-2 py-0 h-10 w-[97px] text-[14px] font-['IBM_Plex_Sans'] font-medium text-slate-900">
                  Sentiment
                </th>
                <th className="text-left px-2 py-0 h-10 text-[14px] font-['IBM_Plex_Sans'] font-medium text-slate-900">
                  Example
                </th>
                <th className="text-center px-2 py-0 h-10 w-[49px]"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={`${item.theme}-${index}`}
                  className="border-b border-[#e2e8f0] last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-2 py-0 h-[53px] text-[14px] font-['IBM_Plex_Sans'] font-medium text-slate-900">
                    {item.theme}
                  </td>
                  <td className="px-2 py-0 h-[53px] w-[97px] text-[14px] font-['IBM_Plex_Sans'] text-slate-900">
                    {item.mention}
                  </td>
                  <td className="px-2 py-0 h-[53px] w-[97px] text-[14px] font-['IBM_Plex_Sans'] text-slate-900">
                    {item.sentiment}
                  </td>
                  <td className="px-2 py-0 h-[53px] text-[14px] font-['IBM_Plex_Sans'] text-slate-900">
                    {item.example}
                  </td>
                  <td className="px-2 py-0 h-[53px] w-[49px] text-center">
                    <button
                      onClick={() => onMoreClick?.(item)}
                      className="flex items-center justify-center w-8 h-8 rounded hover:bg-slate-200 mx-auto"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
