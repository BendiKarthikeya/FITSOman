import { useLocation } from "wouter";
import { 
  ChevronRight, 
  Settings, 
  Eye, 
  Send, 
  Save,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface SurveyBuilderHeaderProps {
  title: string;
  status?: string;
  onPreview?: () => void;
  onPublish?: () => void;
  onSave?: () => void;
}

export function SurveyBuilderHeader({ 
  title, 
  status = "Draft", 
  onPreview, 
  onPublish, 
  onSave 
}: SurveyBuilderHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="h-[72px] border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList className="text-xs text-[#64748B]">
            <BreadcrumbItem>
              <BreadcrumbLink 
                className="hover:text-primary cursor-pointer" 
                onClick={() => setLocation("/")}
              >
                Insight Pulse
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3 h-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink 
                className="hover:text-primary cursor-pointer"
                onClick={() => setLocation("/surveys")}
              >
                Surveys
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-3 h-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-[#0F172A]">Create Survey</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-[#0F172A] tracking-tight">
            {title || "Untitled Survey"}
          </h1>
          {status && (
            <Badge variant="secondary" className="bg-[#F1F5F9] text-[#475569] font-medium border-none px-2 py-0.5 text-[10px] uppercase">
              {status}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] gap-2 font-medium"
          onClick={onPreview}
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>
        <div className="w-[1px] h-6 bg-[#E2E8F0] mx-1" />
        <Button 
          variant="outline" 
          size="sm" 
          className="border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] gap-2 font-medium"
          onClick={onSave}
        >
          <Save className="w-4 h-4" />
          Save Draft
        </Button>
        <Button 
          size="sm" 
          className="bg-[#6358DE] hover:bg-[#5248C9] text-white gap-2 px-4 font-medium"
          onClick={onPublish}
        >
          <Rocket className="w-4 h-4" />
          Publish Survey
        </Button>
      </div>
    </header>
  );
}
