import { 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Trash2, 
  GripVertical 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  type: string;
  title: string;
  placeholder?: string;
  required: boolean;
}

interface SurveyEditorProps {
  questions: Question[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SurveyEditor({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete
}: SurveyEditorProps) {
  return (
    <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex flex-col items-center gap-4">
      {questions.map((question, index) => {
        const isSelected = selectedQuestionId === question.id;
        
        return (
          <div 
            key={question.id}
            onClick={() => onSelectQuestion(question.id)}
            className={cn(
              "group relative w-[660px] bg-white rounded-2xl shadow-sm border py-6 transition-all cursor-pointer",
              isSelected ? "border-slate-500 ring-1 ring-slate-500 z-10" : "border-transparent"
            )}
          >
            {/* Control Bar (shown when selected) */}
            {isSelected && (
              <div className="absolute -bottom-[22px] right-7 bg-white border border-slate-600 rounded-b-lg flex items-center gap-2 px-3 py-1 shadow-md z-20">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3.5 w-3.5"
                  onClick={(e) => { e.stopPropagation(); onMoveUp(question.id); }}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3.5 w-3.5"
                  onClick={(e) => { e.stopPropagation(); onMoveDown(question.id); }}
                  disabled={index === questions.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3.5 w-3.5"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(question.id); }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3.5 w-3.5 text-red-500 hover:text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="flex px-6 items-start">
              <div className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-900">
                    Label
                  </Label>
                  <Input 
                    placeholder="Placeholder Text"
                    value={question.title}
                    readOnly
                    className="h-9 border-slate-200 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center pl-2 self-stretch pr-2">
                <GripVertical className="h-4 w-4 text-slate-400 cursor-grab active:cursor-grabbing" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
