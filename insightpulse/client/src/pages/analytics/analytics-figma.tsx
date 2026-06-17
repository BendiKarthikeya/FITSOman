// Figma-exact replica of node 66:3787 (Analytics - Trends tab)
// Design: https://www.figma.com/design/XHyzy7eVDlecoTAbLWrJix/Insight-Pulse?node-id=66-3787

const imgVector = "https://www.figma.com/api/mcp/asset/5aaa5d52-9e41-4118-a9a7-8c11cd6b27d0";
const imgAvatarImage = "https://www.figma.com/api/mcp/asset/76c93f71-e9a6-4ec0-8f05-40e22ebfcbf9";
const imgVector1 = "https://www.figma.com/api/mcp/asset/26bcccca-b5f0-4f4f-ab2d-0eb763185849";
const imgVector2 = "https://www.figma.com/api/mcp/asset/c3b68e88-6bdb-4ca7-a465-942b2f16802c";
const imgVector3 = "https://www.figma.com/api/mcp/asset/328fc892-2281-466a-9b37-aef9896f456c";
const imgVector4 = "https://www.figma.com/api/mcp/asset/a38761a1-8865-4fc4-a215-b5c8b646145d";
const imgVector5 = "https://www.figma.com/api/mcp/asset/3b4d5326-f015-4235-82b4-c7c265db6766";
const imgVector6 = "https://www.figma.com/api/mcp/asset/873769e7-b170-4918-b6ce-86d3489a93a9";
const imgVector7 = "https://www.figma.com/api/mcp/asset/752ae4fa-dee3-4b84-8509-097a04ce4aae";
const imgVector8 = "https://www.figma.com/api/mcp/asset/72b87ae8-99c6-4cd8-ab4a-6529e88a09e7";
const imgVector9 = "https://www.figma.com/api/mcp/asset/5de12daf-0360-41cb-8532-8baf3be3e5fd";
const imgVector10 = "https://www.figma.com/api/mcp/asset/4b7f203c-3297-4881-bea4-e301c937b20a";
const imgFrame41 = "https://www.figma.com/api/mcp/asset/a75538c3-6f61-4a76-bc0f-dac555571921";
const imgLucideCalendar = "https://www.figma.com/api/mcp/asset/11e82b84-a696-4cd0-9345-53cc90338306";
const imgLucideChevronDown = "https://www.figma.com/api/mcp/asset/2cac72fc-0af9-4d55-b74d-b5ac0e995130";
const imgVector11 = "https://www.figma.com/api/mcp/asset/9a057203-ebd2-418e-9c9d-9aaa9a424e96";
const imgVector12 = "https://www.figma.com/api/mcp/asset/2007ab3d-6034-46d8-bfd4-8128a908ec28";
const imgVector13 = "https://www.figma.com/api/mcp/asset/750f073d-e246-4413-b696-fad762af6eb2";
const imgVector14 = "https://www.figma.com/api/mcp/asset/382091b1-4708-4291-a118-e30a2df3a6a1";
const imgVector15 = "https://www.figma.com/api/mcp/asset/f7ffa71f-3d6b-4c16-a725-da4009b1689b";
const imgVector16 = "https://www.figma.com/api/mcp/asset/db55f7f5-99c6-4430-8a29-b1a046fb86c2";
const imgVector17 = "https://www.figma.com/api/mcp/asset/be3a9d66-333c-4845-91c2-ce11bfae33d8";
const imgVector18 = "https://www.figma.com/api/mcp/asset/e2ec1879-eade-4b95-b807-7ebaee83843e";

function PhosphorSealWarning({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[18px]"}>
      <div className="absolute inset-[6.25%]">
        <img alt="" className="absolute block max-w-none size-full" src={imgVector} />
      </div>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div className={className || "bg-[#0f172a] flex flex-col items-center justify-center p-[8px] relative size-[44px]"}>
      <div className="flex flex-col font-['IBM_Plex_Sans'] font-semibold justify-center leading-[0] relative shrink-0 text-[20px] text-white text-center whitespace-nowrap">
        <p className="leading-[1.4]">IP</p>
      </div>
    </div>
  );
}

export default function AnalyticsFigma() {
  return (
    <div
      style={{ width: 1024, height: 600, overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}
      className="bg-[#f1f5f9] flex items-start"
    >
      {/* Sidebar */}
      <div className="bg-[#fafafa] flex flex-col items-start self-stretch shrink-0 w-[180px]">
        {/* Sidebar Header */}
        <div className="flex flex-col items-start p-[8px] shrink-0 w-full">
          <div className="flex gap-[8px] items-center p-[8px] shrink-0 w-full">
            <div className="bg-[#0f172a] flex flex-col items-center justify-center p-[8px] rounded-[8px] shrink-0 size-[32px]">
              <span className="font-['IBM_Plex_Sans'] font-semibold text-[14px] text-white leading-[1.4]">IP</span>
            </div>
            <div className="flex flex-1 flex-col items-start min-w-0">
              <p className="text-[14px] font-medium text-[#0a0a0a] leading-[1.5] w-full truncate">InsightPulse</p>
              <p className="text-[12px] font-medium text-[#0a0a0a] leading-[1.4] tracking-[0.024px] w-full truncate">Enterprise</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-1 flex-col items-start min-h-0 w-full">
          <div className="flex flex-col items-start p-[8px] shrink-0 w-full">
            {/* Label */}
            <div className="flex gap-0 h-[32px] items-center opacity-70 px-[8px] shrink-0 w-full">
              <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">
                Navigation
              </p>
            </div>
            {/* Menu Items */}
            <div className="flex flex-col gap-[4px] items-start shrink-0 w-full">
              {/* Dashboard */}
              <div className="flex gap-[8px] h-[32px] items-center pl-[8px] pr-[32px] py-[8px] rounded-[8px] shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-[16px]">
                  <div className="absolute inset-[8.33%_12.5%]">
                    <div className="absolute inset-[-3.75%_-4.17%]">
                      <img alt="" className="block max-w-none size-full" src={imgVector1} />
                    </div>
                  </div>
                </div>
                <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Dashboard</p>
              </div>
              {/* Surveys */}
              <div className="flex flex-col items-start shrink-0 w-full">
                <div className="flex gap-[8px] h-[32px] items-center p-[8px] rounded-[8px] shrink-0 w-full">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[8.33%_8.33%_8.33%_16.67%]">
                      <div className="absolute inset-[-3.75%_-4.17%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector2} />
                      </div>
                    </div>
                  </div>
                  <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Surveys</p>
                  <div className="flex items-center justify-end shrink-0">
                    <div className="flex items-center justify-center shrink-0 size-[16px]">
                      <div className="-rotate-90">
                        <div className="overflow-clip relative size-[16px]">
                          <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                            <div className="absolute inset-[-12.5%_-6.25%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Analytics */}
              <div className="flex flex-col items-start shrink-0 w-full">
                <div className="flex gap-[8px] h-[32px] items-center p-[8px] rounded-[8px] shrink-0 w-full">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[12.5%_8.33%]">
                      <div className="absolute inset-[-4.17%_-3.75%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector4} />
                      </div>
                    </div>
                  </div>
                  <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Analytics</p>
                  <div className="flex items-center justify-end shrink-0">
                    <div className="flex items-center justify-center shrink-0 size-[16px]">
                      <div className="-rotate-90">
                        <div className="overflow-clip relative size-[16px]">
                          <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                            <div className="absolute inset-[-12.5%_-6.25%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Team Insights */}
              <div className="flex flex-col items-start shrink-0 w-full">
                <div className="flex gap-[8px] h-[32px] items-center p-[8px] rounded-[8px] shrink-0 w-full">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[12.5%_8.33%]">
                      <div className="absolute inset-[-4.17%_-3.75%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector5} />
                      </div>
                    </div>
                  </div>
                  <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Team Insights</p>
                  <div className="flex items-center justify-end shrink-0">
                    <div className="flex items-center justify-center shrink-0 size-[16px]">
                      <div className="-rotate-90">
                        <div className="overflow-clip relative size-[16px]">
                          <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                            <div className="absolute inset-[-12.5%_-6.25%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Action Planning */}
              <div className="flex flex-col items-start shrink-0 w-full">
                <div className="flex gap-[8px] h-[32px] items-center p-[8px] rounded-[8px] shrink-0 w-full">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[8.33%_8.33%_12.5%_12.5%]">
                      <div className="absolute inset-[-3.95%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector6} />
                      </div>
                    </div>
                  </div>
                  <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Action Planning</p>
                  <div className="flex items-center justify-end shrink-0">
                    <div className="flex items-center justify-center shrink-0 size-[16px]">
                      <div className="-rotate-90">
                        <div className="overflow-clip relative size-[16px]">
                          <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                            <div className="absolute inset-[-12.5%_-6.25%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Reports */}
              <div className="flex gap-[8px] h-[32px] items-center pl-[8px] pr-[32px] py-[8px] rounded-[8px] shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-[16px]">
                  <div className="absolute inset-[8.33%_8.33%_8.35%_8.33%]">
                    <div className="absolute inset-[-3.75%]">
                      <img alt="" className="block max-w-none size-full" src={imgVector7} />
                    </div>
                  </div>
                </div>
                <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Reports</p>
              </div>
              {/* Settings */}
              <div className="flex flex-col items-start shrink-0 w-full">
                <div className="flex gap-[8px] h-[32px] items-center p-[8px] rounded-[8px] shrink-0 w-full">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[8.33%_12.43%]">
                      <div className="absolute inset-[-3.75%_-4.16%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector8} />
                      </div>
                    </div>
                  </div>
                  <p className="flex-1 font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0a0a0a] leading-[1.5] truncate">Settings</p>
                  <div className="flex items-center justify-end shrink-0">
                    <div className="flex items-center justify-center shrink-0 size-[16px]">
                      <div className="-rotate-90">
                        <div className="overflow-clip relative size-[16px]">
                          <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                            <div className="absolute inset-[-12.5%_-6.25%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer - User */}
        <div className="flex flex-col items-start p-[8px] shrink-0 w-full">
          <div className="flex gap-[8px] items-center p-[8px] shrink-0 w-full">
            <div className="relative rounded-[8px] shrink-0 size-[32px]">
              <div className="absolute inset-0 rounded-[8px]">
                <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[8px] size-full" src={imgAvatarImage} />
              </div>
            </div>
            <div className="flex flex-1 flex-col items-start min-w-0">
              <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#0a0a0a] leading-[1.5] overflow-hidden w-full truncate">Shadcn</p>
              <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#0a0a0a] leading-[1.4] tracking-[0.024px] overflow-hidden w-full truncate">m@example.com</p>
            </div>
            <div className="overflow-clip relative shrink-0 size-[16px]">
              <div className="absolute inset-[16.67%_29.17%]">
                <div className="absolute inset-[-4.69%_-7.5%]">
                  <img alt="" className="block max-w-none size-full" src={imgVector9} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-start min-h-0 min-w-0 pr-[8px] py-[8px]">
        <div className="bg-white flex flex-col items-start rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] shrink-0 w-full" style={{ height: "100%" }}>
          {/* Header */}
          <div className="flex flex-col h-[64px] items-start justify-center shrink-0 w-full">
            <div className="flex gap-0 items-center px-[16px] shrink-0">
              <div className="flex gap-[8px] items-center shrink-0">
                <div className="flex items-center justify-center px-[8px] shrink-0 size-[28px]">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <div className="absolute inset-[12.5%]">
                      <div className="absolute inset-[-4.17%]">
                        <img alt="" className="block max-w-none size-full" src={imgVector10} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-[17px] relative shrink-0 w-[16px]">
                  <img alt="" className="absolute block max-w-none size-full" src={imgFrame41} />
                </div>
                <div className="flex gap-[6px] items-center shrink-0">
                  <div className="flex items-center justify-center shrink-0">
                    <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#64748b] leading-[20px] whitespace-nowrap">
                      Analytics
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex flex-col gap-0 items-start py-[24px] shrink-0 w-full">
            <div className="flex flex-col gap-[16px] items-start px-[24px] shrink-0 w-full">
              {/* Tabs */}
              <div className="bg-[#f5f5f5] flex h-[34px] items-center justify-center p-[3px] rounded-[10px] shrink-0">
                <div className="flex gap-0 h-[28px] items-center justify-center px-[8px] py-[4px] rounded-[8px] shrink-0">
                  <p className="font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0f172a] leading-[1.5] whitespace-nowrap">Overview</p>
                </div>
                <div className="flex gap-0 h-[28px] items-center justify-center px-[8px] py-[4px] rounded-[8px] shrink-0">
                  <p className="font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0f172a] leading-[1.5] whitespace-nowrap">CSAT/NPS</p>
                </div>
                <div className="flex gap-0 h-[28px] items-center justify-center px-[8px] py-[4px] rounded-[8px] shrink-0">
                  <p className="font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0f172a] leading-[1.5] whitespace-nowrap">Customer Journey</p>
                </div>
                {/* Active Tab: Trends */}
                <div className="bg-white border border-[#e5e5e5] flex flex-col items-center justify-center px-[8px] py-[4px] rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] shrink-0">
                  <p className="font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0f172a] leading-[1.5] whitespace-nowrap">Trends</p>
                </div>
                <div className="flex flex-col h-[28px] items-center justify-center px-[8px] py-[4px] rounded-[8px] shrink-0">
                  <p className="font-['IBM_Plex_Sans'] font-normal text-[14px] text-[#0f172a] leading-[1.5] whitespace-nowrap">Insights</p>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex items-start justify-between shrink-0 w-full">
                <div className="flex gap-[12px] items-center shrink-0">
                  {/* Departments Button */}
                  <div className="flex flex-col items-start shrink-0">
                    <div className="bg-white border border-[#f1f5f9] flex flex-col h-[36px] items-center justify-center px-[16px] py-[8px] rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0">
                      <p className="font-['Inter',sans-serif] font-medium text-[14px] text-[#020617] leading-[20px] whitespace-nowrap">Departments</p>
                    </div>
                  </div>
                  {/* Date Range Picker */}
                  <div className="flex flex-col gap-0 items-start shrink-0 w-[275px]">
                    <div className="bg-white border border-[#f1f5f9] flex h-[36px] items-center justify-between overflow-clip px-[12px] py-[4px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-full">
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <p className="flex-1 font-['Inter',sans-serif] font-normal text-[16px] text-[#020617] leading-[24px] overflow-hidden text-ellipsis whitespace-nowrap">
                          June 01, 2025 - June 01 2020
                        </p>
                        <div className="relative shrink-0 size-[16px]">
                          <img alt="" className="absolute block max-w-none size-full" src={imgLucideCalendar} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between shrink-0 w-[294px]">
                  {/* Survey Name Dropdown */}
                  <div className="flex gap-0 items-center shrink-0">
                    <div className="flex gap-0 items-center shrink-0">
                      <div className="bg-white border border-[#f1f5f9] flex items-center overflow-clip rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0">
                        <div className="border-r border-[#f1f5f9] flex gap-0 h-[36px] items-center justify-center px-[12px] py-[8px] shrink-0">
                          <p className="font-['Inter',sans-serif] font-medium text-[14px] text-[#020617] leading-[20px] whitespace-nowrap">Survey Name</p>
                        </div>
                        <div className="flex items-center justify-center shrink-0 size-[36px]">
                          <div className="relative shrink-0 size-[16px]">
                            <img alt="" className="absolute block max-w-none size-full" src={imgLucideChevronDown} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Export Dropdown */}
                  <div className="flex gap-0 items-center shrink-0">
                    <div className="flex gap-0 items-center shrink-0">
                      <div className="bg-white border border-[#f1f5f9] flex items-center overflow-clip rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0">
                        <div className="border-r border-[#f1f5f9] flex gap-[8px] h-[36px] items-center justify-center px-[12px] py-[8px] shrink-0">
                          <div className="overflow-clip relative shrink-0 size-[16px]">
                            <div className="absolute inset-[12.5%]">
                              <div className="absolute inset-[-4.17%]">
                                <img alt="" className="block max-w-none size-full" src={imgVector11} />
                              </div>
                            </div>
                          </div>
                          <p className="font-['Inter',sans-serif] font-medium text-[14px] text-[#020617] leading-[20px] whitespace-nowrap">Export</p>
                        </div>
                        <div className="flex items-center justify-center shrink-0 size-[36px]">
                          <div className="relative shrink-0 size-[16px]">
                            <img alt="" className="absolute block max-w-none size-full" src={imgLucideChevronDown} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards Row */}
              <div className="flex gap-0 items-start shrink-0 w-full">
                <div className="flex gap-[16px] items-center shrink-0 w-full">
                  {/* EVI Card */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col gap-0 items-start min-w-0 py-[24px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-[12px] items-start px-[24px] shrink-0 w-full">
                      <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                        <div className="overflow-clip relative shrink-0 size-[18px]">
                          <div className="absolute inset-[8.33%]">
                            <div className="absolute inset-[-3.33%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector12} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start shrink-0 w-full">
                        <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] text-[#0f172a] leading-[1.6] whitespace-nowrap">
                          Emotional Connection (EVI)
                        </p>
                      </div>
                      <div className="flex items-center justify-between shrink-0 w-full">
                        <p className="font-['IBM_Plex_Sans'] font-semibold h-full leading-[0] text-[#059669] text-[0px] w-[208px]">
                          <span className="leading-[1.25] text-[#0f172a] text-[30px] tracking-[0.09px]">0.0</span>
                          <span className="leading-[1.3] text-[#e2e8f0] text-[24px]">/100</span>
                        </p>
                        <div className="border border-[#f1f5f9] flex gap-0 h-[22px] items-center justify-center px-[8px] py-[2px] rounded-[8px] shrink-0">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#0f172a] leading-[1.4] tracking-[0.024px] whitespace-nowrap">+12.5%</p>
                        </div>
                      </div>
                      <div className="flex gap-[5px] items-center shrink-0 w-full">
                        <div className="flex items-center justify-center shrink-0">
                          <div className="-scale-y-100">
                            <div className="overflow-clip relative size-[16px]">
                              <div className="absolute inset-[29.17%_8.33%]">
                                <div className="absolute inset-[-7.5%_-3.75%]">
                                  <img alt="" className="block max-w-none size-full" src={imgVector13} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#64748b] leading-[1.5] whitespace-nowrap">Needs Improvement</p>
                      </div>
                      {/* Progress bar */}
                      <div className="inline-grid grid-cols-[max-content] grid-rows-[max-content] leading-[0] place-items-start shrink-0 w-full">
                        <div className="bg-[#e2e8f0] col-start-1 row-start-1 h-[4px] rounded-[8px] w-full" />
                        <div className="bg-[#e11d48] col-start-1 row-start-1 h-[4px] ml-[0.05px] rounded-[8px] w-[9%]" />
                      </div>
                    </div>
                  </div>

                  {/* NPS Card */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col gap-0 h-[226px] items-start min-w-0 py-[24px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-[12px] items-start px-[24px] shrink-0 w-full">
                      <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                        <div className="overflow-clip relative shrink-0 size-[18px]">
                          <div className="absolute inset-[8.33%_16.67%]">
                            <div className="absolute inset-[-3.33%_-4.17%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector14} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start shrink-0 w-full">
                        <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] text-[#0f172a] leading-[1.6] whitespace-nowrap">Net Promotor Score (NPS)</p>
                        <p className="font-['IBM_Plex_Sans'] font-semibold h-[38px] text-[#0d9488] text-[30px] leading-[1.25] tracking-[0.09px] w-[208px]">81%</p>
                      </div>
                      <div className="flex items-start justify-between shrink-0 w-full">
                        <div className="flex flex-col gap-[12px] items-center justify-center shrink-0">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#0d9488] text-[12px] leading-[1.4] tracking-[0.024px]">40%</p>
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#0d9488] text-[14px] leading-[1.5]">Promoters</p>
                        </div>
                        <div className="flex flex-col gap-[12px] items-center justify-center shrink-0">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#0f172a] text-[12px] leading-[1.4] tracking-[0.024px]">21%</p>
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#0f172a] text-[14px] leading-[1.5]">Passives</p>
                        </div>
                        <div className="flex flex-col gap-[12px] items-center justify-center shrink-0">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#e11d48] text-[12px] leading-[1.4] tracking-[0.024px]">20%</p>
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[#e11d48] text-[14px] leading-[1.5]">Detractors</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CSAT Card */}
                  <div className="bg-white border border-[#f1f5f9] flex flex-1 flex-col gap-0 items-start min-w-0 py-[24px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-[12px] items-start px-[24px] shrink-0 w-full">
                      <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                        <div className="overflow-clip relative shrink-0 size-[18px]">
                          <div className="absolute inset-[8.33%]">
                            <div className="absolute inset-[-3.33%]">
                              <img alt="" className="block max-w-none size-full" src={imgVector12} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start shrink-0 w-full">
                        <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] text-[#0f172a] leading-[1.6] whitespace-nowrap">Customer Satisfaction</p>
                      </div>
                      <div className="flex items-center justify-between shrink-0 w-full">
                        <p className="font-['IBM_Plex_Sans'] font-semibold h-full leading-[0] text-[24px] text-[#e2e8f0] w-[208px]">
                          <span className="leading-[1.3] text-[#0f172a]">56</span>
                          <span className="leading-[1.3]">/100</span>
                        </p>
                        <div className="border border-[#f1f5f9] flex gap-0 h-[22px] items-center justify-center px-[8px] py-[2px] rounded-[8px] shrink-0">
                          <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#0f172a] leading-[1.4] tracking-[0.024px] whitespace-nowrap">+12.5%</p>
                        </div>
                      </div>
                      <div className="flex gap-[5px] items-center shrink-0 w-full">
                        <div className="flex items-center justify-center shrink-0">
                          <div className="-scale-y-100">
                            <div className="overflow-clip relative size-[16px]">
                              <div className="absolute inset-[29.17%_8.33%]">
                                <div className="absolute inset-[-7.5%_-3.75%]">
                                  <img alt="" className="block max-w-none size-full" src={imgVector15} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#64748b] leading-[1.5] whitespace-nowrap">Needs Work</p>
                      </div>
                      {/* Progress bar */}
                      <div className="inline-grid grid-cols-[max-content] grid-rows-[max-content] leading-[0] place-items-start shrink-0 w-full">
                        <div className="bg-[#e2e8f0] col-start-1 row-start-1 h-[4px] rounded-[8px] w-full" />
                        <div className="bg-[#0d9488] col-start-1 row-start-1 h-[4px] mt-[1px] rounded-[8px]" style={{ width: "62%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex gap-[16px] items-start shrink-0 w-full">
                {/* Response Activity (metrics) */}
                <div className="border border-[#f1f5f9] flex flex-col gap-[10px] items-start p-[12px] rounded-[12px] shrink-0 w-[50%]">
                  <p className="font-['IBM_Plex_Sans'] font-bold text-[18px] text-[#0f172a] leading-[1.6] whitespace-nowrap shrink-0">Response Activity</p>
                  <div className="flex gap-[10px] items-center shrink-0 w-full">
                    {/* Left column */}
                    <div className="flex flex-col gap-[12px] items-start shrink-0 w-[48%]">
                      {/* Total Response */}
                      <div className="bg-white border border-[#e2e8f0] flex flex-col gap-0 h-[105px] items-start py-[12px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
                        <div className="flex flex-col gap-[12px] items-start px-[16px] shrink-0 w-full">
                          <div className="flex gap-[12px] items-start shrink-0 w-full">
                            <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                              <div className="overflow-clip relative shrink-0 size-[18px]">
                                <div className="absolute inset-[8.33%]">
                                  <div className="absolute inset-[-3.33%]">
                                    <img alt="" className="block max-w-none size-full" src={imgVector12} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-start shrink-0">
                              <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#475569] leading-[1.5] whitespace-nowrap">Total Response</p>
                              <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] text-[#0f172a] leading-[1.25] tracking-[0.09px] whitespace-nowrap">84%</p>
                            </div>
                          </div>
                          <div className="flex gap-[4px] h-[22px] items-center px-[8px] py-[2px] rounded-[8px] shrink-0 w-full">
                            <div className="overflow-clip relative shrink-0 size-[14px]">
                              <div className="absolute inset-[20.83%]">
                                <div className="absolute inset-[-9.18%]">
                                  <img alt="" className="block max-w-none size-full" src={imgVector16} />
                                </div>
                              </div>
                            </div>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#059669] leading-[1.4] tracking-[0.024px] whitespace-nowrap">+12.5%</p>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#475569] leading-[1.4] tracking-[0.024px] whitespace-nowrap">vs last month</p>
                          </div>
                        </div>
                      </div>
                      {/* Daily Average */}
                      <div className="bg-white border border-[#e2e8f0] flex flex-col gap-0 h-[105px] items-start py-[12px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
                        <div className="flex flex-col gap-[12px] items-start px-[16px] shrink-0 w-full">
                          <div className="flex gap-[12px] items-start shrink-0 w-full">
                            <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                              <PhosphorSealWarning className="overflow-clip relative shrink-0 size-[18px]" />
                            </div>
                            <div className="flex flex-col items-start shrink-0">
                              <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#475569] leading-[1.5] whitespace-nowrap">Daily Average</p>
                              <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] text-[#0f172a] leading-[1.25] tracking-[0.09px] whitespace-nowrap">2</p>
                            </div>
                          </div>
                          <div className="flex gap-[4px] h-[22px] items-center px-[8px] py-[2px] rounded-[8px] shrink-0 w-full">
                            <div className="overflow-clip relative shrink-0 size-[14px]">
                              <div className="absolute inset-[20.83%]">
                                <div className="absolute inset-[-9.18%]">
                                  <img alt="" className="block max-w-none size-full" src={imgVector17} />
                                </div>
                              </div>
                            </div>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#e11d48] leading-[1.4] tracking-[0.024px] whitespace-nowrap">+1</p>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#475569] leading-[1.4] tracking-[0.024px] whitespace-nowrap">since review</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Right column */}
                    <div className="flex flex-col gap-[12px] items-start shrink-0 w-[48%]">
                      {/* Happy Customers */}
                      <div className="bg-white border border-[#e2e8f0] flex flex-col gap-0 h-[105px] items-start py-[12px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
                        <div className="flex flex-col gap-[12px] items-start px-[16px] shrink-0 w-full">
                          <div className="flex gap-[12px] items-start shrink-0 w-full">
                            <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                              <div className="overflow-clip relative shrink-0 size-[18px]">
                                <div className="absolute inset-[12.5%_8.33%]">
                                  <div className="absolute inset-[-7.41%_-6.67%]">
                                    <img alt="" className="block max-w-none size-full" src={imgVector18} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-start shrink-0">
                              <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#475569] leading-[1.5] whitespace-nowrap">Happy Customers</p>
                              <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] text-[#0f172a] leading-[1.25] tracking-[0.09px] whitespace-nowrap">12</p>
                            </div>
                          </div>
                          <div className="flex gap-[4px] h-[22px] items-center px-[8px] py-[2px] rounded-[8px] shrink-0 w-full">
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#475569] leading-[1.4] tracking-[0.024px] whitespace-nowrap">Active users</p>
                          </div>
                        </div>
                      </div>
                      {/* Per Survey */}
                      <div className="bg-white border border-[#e2e8f0] flex flex-col gap-0 h-[105px] items-start py-[12px] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full">
                        <div className="flex flex-col gap-[12px] items-start px-[16px] shrink-0 w-full">
                          <div className="flex gap-[12px] items-start shrink-0 w-full">
                            <div className="bg-[#f1f5f9] flex items-center p-[10px] rounded-[8px] shrink-0">
                              <div className="overflow-clip relative shrink-0 size-[18px]">
                                <div className="absolute inset-[8.33%_16.67%]">
                                  <div className="absolute inset-[-3.33%_-4.17%]">
                                    <img alt="" className="block max-w-none size-full" src={imgVector14} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-start shrink-0">
                              <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#475569] leading-[1.5] whitespace-nowrap">Per Survey</p>
                              <p className="font-['IBM_Plex_Sans'] font-semibold text-[30px] text-[#0f172a] leading-[1.25] tracking-[0.09px] whitespace-nowrap">92%</p>
                            </div>
                          </div>
                          <div className="flex gap-[4px] h-[22px] items-center px-[8px] py-[2px] rounded-[8px] shrink-0 w-full">
                            <div className="overflow-clip relative shrink-0 size-[14px]">
                              <div className="absolute inset-[20.83%]">
                                <div className="absolute inset-[-9.18%]">
                                  <img alt="" className="block max-w-none size-full" src={imgVector16} />
                                </div>
                              </div>
                            </div>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#059669] leading-[1.4] tracking-[0.024px] whitespace-nowrap">+5.5%</p>
                            <p className="font-['IBM_Plex_Sans'] font-medium text-[12px] text-[#475569] leading-[1.4] tracking-[0.024px] whitespace-nowrap">completion</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Activity (chart) */}
                <div className="relative bg-white border border-[#f1f5f9] rounded-[20px] shadow-[0px_4px_20px_0px_rgba(238,238,238,0.5)] shrink-0 flex-1" style={{ height: 300 }}>
                  <p className="absolute font-['IBM_Plex_Sans'] font-bold text-[18px] text-[#0f172a] leading-[1.6] whitespace-nowrap" style={{ top: 12, left: 10 }}>
                    Response Activity
                  </p>

                  {/* Satisfaction rows */}
                  {[
                    { label: "Very Satisfied", color: "#0095ff", bg: "#f0f9ff", barBg: "#cde7ff", value: "45", pct: 72 },
                    { label: "Satisfied", color: "#00e58f", bg: "#f0fdf4", barBg: "#8cfac7", value: "29", pct: 55 },
                    { label: "Neutral", color: "#884dff", bg: "#fbf1ff", barBg: "#c5a8ff", value: "18", pct: 42 },
                    { label: "Dissatisfied", color: "#ff8900", bg: "#fef6e6", barBg: "#ffd5a4", value: "25", pct: 60 },
                    { label: "Very Dissatisfied", color: "#ff8900", bg: "#fef6e6", barBg: "#ffd5a4", value: "25", pct: 60 },
                  ].map((row, i) => (
                    <div key={row.label} className="absolute flex items-center" style={{ top: 51 + i * 46, left: 22, right: 22, height: 24 }}>
                      {/* Horizontal divider */}
                      {i > 0 && (
                        <div className="absolute bg-[#edf2f6] h-[1px] w-full" style={{ top: -11 }} />
                      )}
                      <p className="font-['IBM_Plex_Sans'] font-medium text-[14px] text-[#475569] leading-[1.5] whitespace-nowrap" style={{ width: 110 }}>
                        {row.label}
                      </p>
                      {/* Bar track */}
                      <div className="flex-1 relative h-[8px] mx-[8px]">
                        <div className="absolute inset-0 rounded-[8px]" style={{ backgroundColor: row.barBg }} />
                        <div className="absolute left-0 top-0 h-full rounded-[8px]" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                      </div>
                      {/* Badge */}
                      <div className="flex items-center justify-center rounded-[8px] border h-[24px] w-[38px] shrink-0" style={{ backgroundColor: row.bg, borderColor: row.color }}>
                        <p className="font-['Open_Sans',sans-serif] font-normal text-[13px] text-center" style={{ color: row.color }}>
                          {row.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
