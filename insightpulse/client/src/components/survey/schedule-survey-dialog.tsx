import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Clock, Loader2, MessageSquare, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ScheduleSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  surveyTitle: string;
  userId: string;
}

export function ScheduleSurveyDialog({
  open,
  onOpenChange,
  surveyId,
  surveyTitle,
  userId,
}: ScheduleSurveyDialogProps) {
  const { toast } = useToast();
  
  // State
  const [selectedCrmConfig, setSelectedCrmConfig] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [contactMethods, setContactMethods] = useState<string[]>(["whatsapp"]);
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | undefined>(undefined);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>("09:00");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [crmTables, setCrmTables] = useState<any[]>([]);
  const [crmColumns, setCrmColumns] = useState<any[]>([]);
  const [isLoadingCrmData, setIsLoadingCrmData] = useState(false);

  // Fetch CRM configurations
  const { data: crmConfigs, isLoading: isLoadingCrmConfigs } = useQuery({
    queryKey: ["/api/crm-configs"],
    enabled: open,
    queryFn: async () => {
      console.log('🔵 Fetching CRM configs for user:', userId);
      const token = localStorage.getItem('insightpulse_token');
      const headers: Record<string, string> = { "user-id": userId };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/crm-configs", {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        console.error('❌ Failed to fetch CRM configs:', response.status);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        throw new Error("Failed to fetch CRM configs");
      }
      const result = await response.json();
      console.log('✅ CRM configs response:', result);
      return result.data || [];
    },
  });

  const normalizedCrmConfigs = useMemo(() => {
    if (Array.isArray(crmConfigs)) return crmConfigs;
    return (crmConfigs as any)?.data || [];
  }, [crmConfigs]);
  
  console.log('📊 Normalized CRM configs:', normalizedCrmConfigs);

  // Load CRM tables when CRM config is selected
  useEffect(() => {
    if (selectedCrmConfig) {
      loadCrmTables(selectedCrmConfig);
    }
  }, [selectedCrmConfig]);

  // Load CRM columns when table is selected
  useEffect(() => {
    if (selectedCrmConfig && selectedTable) {
      loadCrmColumns(selectedCrmConfig, selectedTable);
    }
  }, [selectedTable]);

  const loadCrmTables = async (configId: string) => {
    setIsLoadingCrmData(true);
    setSelectedTable("");
    setSelectedColumn("");
    setCrmColumns([]);
    try {
      const token = localStorage.getItem('insightpulse_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/crm-configs/${configId}/tables`, {
        headers,
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setCrmTables(data.data || []);
      } else {
        toast({ title: "Failed to load CRM tables", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading CRM tables", variant: "destructive" });
    } finally {
      setIsLoadingCrmData(false);
    }
  };

  const loadCrmColumns = async (configId: string, tableName: string) => {
    setIsLoadingCrmData(true);
    setSelectedColumn("");
    try {
      const token = localStorage.getItem('insightpulse_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/crm-configs/${configId}/tables/${encodeURIComponent(tableName)}/columns`, {
        headers,
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setCrmColumns(data.data || []);
      } else {
        toast({ title: "Failed to load table columns", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading table columns", variant: "destructive" });
    } finally {
      setIsLoadingCrmData(false);
    }
  };

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}/schedules`] });
      toast({ title: "Survey scheduled successfully!" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to schedule survey", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const handleSchedule = () => {
    // Validation
    if (!scheduleStartDate || !scheduleEndDate) {
      toast({ title: "Please select start and end dates", variant: "destructive" });
      return;
    }

    if (scheduleEndDate < scheduleStartDate) {
      toast({ title: "End date must be after start date", variant: "destructive" });
      return;
    }

    if (contactMethods.length === 0) {
      toast({ title: "Please select at least one contact method", variant: "destructive" });
      return;
    }

    if (!selectedCrmConfig || !selectedTable || !selectedColumn) {
      toast({ 
        title: "Please select CRM configuration", 
        description: "CRM, table, and column are required",
        variant: "destructive" 
      });
      return;
    }

    // Combine start date and time for scheduledAt
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduleStartDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    createScheduleMutation.mutate({
      surveyId,
      crmConfigId: selectedCrmConfig,
      crmTableName: selectedTable,
      crmColumnName: selectedColumn,
      contactMethods,
      scheduleStartDate: scheduleStartDate.toISOString(),
      scheduleEndDate: scheduleEndDate.toISOString(),
      scheduledAt: scheduledDateTime.toISOString(),
      timezone,
    });
  };

  const resetForm = () => {
    setSelectedCrmConfig("");
    setSelectedTable("");
    setSelectedColumn("");
    setContactMethods(["whatsapp"]);
    setScheduleStartDate(undefined);
    setScheduleEndDate(undefined);
    setScheduleTime("09:00");
    setTimezone("UTC");
    setCrmTables([]);
    setCrmColumns([]);
  };

  const handleContactMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setContactMethods([...contactMethods, method]);
    } else {
      setContactMethods(contactMethods.filter((m) => m !== method));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Survey</DialogTitle>
          <DialogDescription>
            Schedule "{surveyTitle}" to be sent via CRM at a specific time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CRM Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="crm-config">CRM Configuration</Label>
              <Select 
                value={selectedCrmConfig} 
                onValueChange={(value) => {
                  setSelectedCrmConfig(value);
                  setSelectedTable("");
                  setSelectedColumn("");
                  if (value) loadCrmTables(value);
                }}
              >
                <SelectTrigger id="crm-config">
                  <SelectValue placeholder="Select CRM..." />
                </SelectTrigger>
                <SelectContent>
                  {normalizedCrmConfigs.filter((c: any) => c.isActive).length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No active CRM configurations found. Please configure one in Settings.
                    </div>
                  ) : (
                    normalizedCrmConfigs.filter((c: any) => c.isActive).map((config: any) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCrmConfig && (
              <div>
                <Label htmlFor="table">CRM Table</Label>
                <Select 
                  value={selectedTable} 
                  onValueChange={setSelectedTable}
                  disabled={isLoadingCrmData}
                >
                  <SelectTrigger id="table">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {crmTables.map((table: any) => (
                      <SelectItem key={table.name || table} value={table.name || table}>
                        {table.label || table.name || table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTable && (
              <div>
                <Label htmlFor="column">Contact Column</Label>
                <Select 
                  value={selectedColumn} 
                  onValueChange={setSelectedColumn}
                  disabled={isLoadingCrmData}
                >
                  <SelectTrigger id="column">
                    <SelectValue placeholder="Select column with contact info" />
                  </SelectTrigger>
                  <SelectContent>
                    {crmColumns.map((column: any) => (
                      <SelectItem key={column.name || column} value={column.name || column}>
                        {column.label || column.name || column} ({column.type || "text"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Contact Methods */}
          <div>
            <Label className="mb-2 block">Contact Methods</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="method-whatsapp"
                  checked={contactMethods.includes("whatsapp")}
                  onCheckedChange={(checked) => handleContactMethodChange("whatsapp", checked as boolean)}
                />
                <MessageSquare className="h-4 w-4 text-green-600" />
                <label
                  htmlFor="method-whatsapp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  WhatsApp
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="method-voiceagent"
                  checked={contactMethods.includes("voiceagent")}
                  onCheckedChange={(checked) => handleContactMethodChange("voiceagent", checked as boolean)}
                />
                <Phone className="h-4 w-4 text-blue-600" />
                <label
                  htmlFor="method-voiceagent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Voice Agent
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="method-email"
                  checked={contactMethods.includes("email")}
                  onCheckedChange={(checked) => handleContactMethodChange("email", checked as boolean)}
                />
                <Mail className="h-4 w-4 text-gray-600" />
                <label
                  htmlFor="method-email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
              </div>
            </div>
          </div>

          {/* Schedule Date Range & Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleStartDate ? format(scheduleStartDate, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleStartDate}
                      onSelect={setScheduleStartDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2 block">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleEndDate ? format(scheduleEndDate, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleEndDate}
                      onSelect={setScheduleEndDate}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        if (scheduleStartDate && date < scheduleStartDate) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="time" className="mb-2 block">Start Time</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <Input
                  id="time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="IST">IST (Indian Standard Time)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={createScheduleMutation.isPending || isLoadingCrmData}
          >
            {createScheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Survey"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
