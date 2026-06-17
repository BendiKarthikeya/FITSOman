import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Question {
  id: string;
  type: string;
  title: string;
  placeholder?: string;
  required: boolean;
}

interface SidebarProps {
  question: Question | null;
  onUpdate: (updated: Question) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function SurveySidebar({
  question,
  onUpdate,
  onCancel,
  onSave
}: SidebarProps) {
  if (!question) return (
    <div className="w-80 border-l border-border bg-[#fafafa] p-4 flex items-center justify-center text-slate-400">
      Select a question to edit properties
    </div>
  );

  return (
    <div className="w-80 border-l border-border bg-[#fafafa] p-4 flex flex-col h-full shrink-0">
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-900">Type</Label>
            <Select 
              value={question.type} 
              onValueChange={(val) => onUpdate({ ...question, type: val })}
            >
              <SelectTrigger className="h-9 bg-white border-slate-200 text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-text">Single-Text</SelectItem>
                <SelectItem value="nps">NPS</SelectItem>
                {/* ... other types */}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-900">Label</Label>
            <Input 
              value={question.title}
              onChange={(e) => onUpdate({ ...question, title: e.target.value })}
              className="h-9 bg-white border-slate-200 text-sm placeholder:text-slate-400"
              placeholder="Question Label"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-900">Placeholder</Label>
            <Input 
              value={question.placeholder || ""}
              onChange={(e) => onUpdate({ ...question, placeholder: e.target.value })}
              className="h-9 bg-white border-slate-200 text-sm placeholder:text-slate-400"
              placeholder="Placeholder Text"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-900">Required</Label>
            <Switch 
              checked={question.required}
              onCheckedChange={(checked) => onUpdate({ ...question, required: checked })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg text-sm font-medium hover:bg-slate-100"
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          className="flex-1 h-9 rounded-lg text-sm font-medium bg-slate-950 text-white hover:bg-slate-900 shadow-sm"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
