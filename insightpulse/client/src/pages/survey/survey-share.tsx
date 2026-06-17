import { useMemo, useRef, useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import QRCodeStyling from "qr-code-styling";
import {
  Link as LinkIcon,
  MessageSquare as MsgIcon,
  Phone,
  Database,
  Mail,
  Copy,
  Loader2,
  UploadCloud,
  X,
  CheckCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePhonesFromCsv(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const phones: string[] = [];
  let headerIdx = -1;

  if (lines.length) {
    const first = lines[0].split(/,|;|\t/).map((s) => s.trim().toLowerCase());
    headerIdx = first.findIndex((c) => c === "phone" || c === "phone_number" || c === "number");
  }

  const pushIfValid = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    if (/^\+\d{8,}$/.test(cleaned)) phones.push(cleaned);
  };

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cells = row.split(/,|;|\t/);
    if (i === 0 && headerIdx >= 0) continue;
    if (headerIdx >= 0 && cells[headerIdx]) {
      pushIfValid(cells[headerIdx]);
      continue;
    }
    const m = row.match(/\+\d[\d\s\-()]{6,}/);
    if (m) pushIfValid(m[0]);
  }

  return Array.from(new Set(phones));
}

function parsePhonesFromXlsx(buf: ArrayBuffer): string[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const phones: string[] = [];

  const pushIfValid = (raw: any) => {
    const s = String(raw ?? "");
    const cleaned = s.replace(/[^\d+]/g, "");
    if (/^\+\d{8,}$/.test(cleaned)) phones.push(cleaned);
  };

  if (rows.length) {
    for (const r of rows) {
      const keys = Object.keys(r).map((k) => k.toLowerCase());
      const idxPhone = keys.findIndex((k) => k === "phone" || k === "phone_number" || k === "number");
      if (idxPhone >= 0) {
        const key = Object.keys(r)[idxPhone];
        pushIfValid(r[key]);
      } else {
        for (const val of Object.values(r)) pushIfValid(val);
      }
    }
  } else {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return parsePhonesFromCsv(csv);
  }

  return Array.from(new Set(phones));
}

function parseEmailsFromCsv(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const emails: string[] = [];
  let headerIdx = -1;

  if (lines.length) {
    const first = lines[0].split(/,|;|\t/).map((s) => s.trim().toLowerCase());
    headerIdx = first.findIndex((c) => c === "email" || c === "email_address" || c === "mail");
  }

  const pushIfValid = (raw: string) => {
    const cleaned = raw.trim();
    if (emailRegex.test(cleaned)) emails.push(cleaned);
  };

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cells = row.split(/,|;|\t/);
    if (i === 0 && headerIdx >= 0) continue;
    if (headerIdx >= 0 && cells[headerIdx]) {
      pushIfValid(cells[headerIdx]);
      continue;
    }
    for (const cell of cells) pushIfValid(cell);
  }

  return Array.from(new Set(emails));
}

function parseEmailsFromXlsx(buf: ArrayBuffer): string[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const emails: string[] = [];

  const pushIfValid = (raw: any) => {
    const s = String(raw ?? "").trim();
    if (emailRegex.test(s)) emails.push(s);
  };

  if (rows.length) {
    for (const r of rows) {
      const keys = Object.keys(r).map((k) => k.toLowerCase());
      const idxEmail = keys.findIndex((k) => k === "email" || k === "email_address" || k === "mail");
      if (idxEmail >= 0) {
        const key = Object.keys(r)[idxEmail];
        pushIfValid(r[key]);
      } else {
        for (const val of Object.values(r)) pushIfValid(val);
      }
    }
  } else {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return parseEmailsFromCsv(csv);
  }

  return Array.from(new Set(emails));
}

function getPublicLink(surveyId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${surveyId}`;
}

export default function SurveyShare() {
  const [, params] = useRoute("/survey/:id/share");
  const surveyId = params?.id as string | undefined;
  const { toast } = useToast();
  const user = auth.getUser();
  const userId = user?.id || "anonymous";
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  const [activeSection, setActiveSection] = useState<"link" | "wa" | "voice" | "crm" | "email">("link");

  const [waLanguage, setWaLanguage] = useState<"en" | "ar">("en");
  const [waSinglePhone, setWaSinglePhone] = useState("");
  const [waMultiplePhones, setWaMultiplePhones] = useState("");

  const [voiceLang, setVoiceLang] = useState<"en" | "ar">("en");
  const [voicePhone, setVoicePhone] = useState("");
  const [voiceCsvName, setVoiceCsvName] = useState("");
  const [voiceCsvPhones, setVoiceCsvPhones] = useState<string[]>([]);
  const [isVoiceParsing, setIsVoiceParsing] = useState(false);
  const [isVoiceDragOver, setIsVoiceDragOver] = useState(false);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);

  const [emailSingle, setEmailSingle] = useState("");
  const [emailMultiple, setEmailMultiple] = useState("");
  const [emailCsvName, setEmailCsvName] = useState("");
  const [emailCsvList, setEmailCsvList] = useState<string[]>([]);
  const [isEmailParsing, setIsEmailParsing] = useState(false);
  const [isEmailDragOver, setIsEmailDragOver] = useState(false);
  const emailFileInputRef = useRef<HTMLInputElement | null>(null);

  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [showEmailContactsDialog, setShowEmailContactsDialog] = useState(false);

  const [selectedCrmConfig, setSelectedCrmConfig] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedPhoneColumn, setSelectedPhoneColumn] = useState("");
  const [crmTables, setCrmTables] = useState<any[]>([]);
  const [crmColumns, setCrmColumns] = useState<any[]>([]);
  const [crmContacts, setCrmContacts] = useState<string[]>([]);
  const [isLoadingCrmData, setIsLoadingCrmData] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  const [selectedEmailCrmConfig, setSelectedEmailCrmConfig] = useState("");
  const [selectedEmailTable, setSelectedEmailTable] = useState("");
  const [selectedEmailColumn, setSelectedEmailColumn] = useState("");
  const [emailCrmTables, setEmailCrmTables] = useState<any[]>([]);
  const [emailCrmColumns, setEmailCrmColumns] = useState<any[]>([]);
  const [emailCrmContacts, setEmailCrmContacts] = useState<string[]>([]);
  const [isLoadingEmailCrmData, setIsLoadingEmailCrmData] = useState(false);
  const [selectedEmailTags, setSelectedEmailTags] = useState<string[]>([]);
  const [availableEmailTags, setAvailableEmailTags] = useState<any[]>([]);

  const { data: survey, isLoading: isLoadingSurvey } = useQuery({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId,
  });

  const { data: crmConfigs, isLoading: isLoadingCrmConfigs } = useQuery({
    queryKey: ["/api/crm-configs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/crm-configs");
      if (!response.ok) throw new Error("Failed to fetch CRM configs");
      const result = await response.json();
      return result.data || [];
    },
  });

  const normalizedCrmConfigs = useMemo(() => {
    if (Array.isArray(crmConfigs)) return crmConfigs;
    return (crmConfigs as any)?.data || [];
  }, [crmConfigs]);

  const crmEmailContacts = crmContacts.filter((contact) => emailRegex.test(contact));

  const processVoiceFile = async (file: File) => {
    setIsVoiceParsing(true);
    setVoiceCsvName(file.name);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let phones: string[] = [];
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        phones = parsePhonesFromXlsx(buf);
      } else {
        const text = await file.text();
        phones = parsePhonesFromCsv(text);
      }
      setVoiceCsvPhones(phones);
      toast({ title: `Parsed ${phones.length} numbers`, description: file.name });
    } finally {
      setIsVoiceParsing(false);
    }
  };

  const processEmailFile = async (file: File) => {
    setIsEmailParsing(true);
    setEmailCsvName(file.name);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let emails: string[] = [];
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        emails = parseEmailsFromXlsx(buf);
      } else {
        const text = await file.text();
        emails = parseEmailsFromCsv(text);
      }
      setEmailCsvList(emails);
      toast({ title: `Parsed ${emails.length} emails`, description: file.name });
    } finally {
      setIsEmailParsing(false);
    }
  };

  const loadCrmTables = async (configId: string) => {
    setIsLoadingCrmData(true);
    setSelectedTable("");
    setSelectedPhoneColumn("");
    setCrmColumns([]);
    setCrmContacts([]);
    setSelectedTags([]);
    try {
      const response = await apiRequest("GET", `/api/crm-configs/${configId}/tables`);
      const data = await response.json();
      if (data.success) {
        setCrmTables(data.data || []);
      } else {
        toast({ title: "Failed to load CRM tables", description: data.error, variant: "destructive" });
      }
      // Load available tags for this CRM config
      const tagsResponse = await apiRequest("GET", `/api/crm-configs/${configId}/tags`);
      const tagsData = await tagsResponse.json();
      if (tagsData.success) {
        setAvailableTags(tagsData.data || []);
      }
    } catch (error) {
      toast({ title: "Error loading CRM tables", variant: "destructive" });
    } finally {
      setIsLoadingCrmData(false);
    }
  };

  const loadCrmColumns = async (configId: string, tableName: string) => {
    setIsLoadingCrmData(true);
    setSelectedPhoneColumn("");
    setCrmContacts([]);
    try {
      const response = await apiRequest("GET", `/api/crm-configs/${configId}/tables/${encodeURIComponent(tableName)}/columns`);
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

  const loadCrmContacts = async (configId: string, tableName: string, phoneColumn: string) => {
    setIsLoadingCrmData(true);
    try {
      if (selectedTags.length > 0) {
        const filterResponse = await apiRequest("POST", `/api/crm-configs/${configId}/contacts/filter-by-tags`, { tagIds: selectedTags });
        const filterData = await filterResponse.json();

        if (!filterResponse.ok || !filterData.success) {
          throw new Error(filterData.error || "Failed to filter contacts by tags");
        }

        const phones = (filterData.data || [])
          .map((ct: any) => ct.contactPhone)
          .filter(Boolean);
        const uniquePhones = Array.from(new Set(phones)) as string[];

        setCrmContacts(uniquePhones);
        toast({
          title: `Loaded ${uniquePhones.length} contacts`,
          description: uniquePhones.length === 0
            ? "No phone numbers stored for the selected tags. Re-sync tags to include phone data."
            : undefined,
        });
        return;
      }

      const response = await apiRequest("POST", `/api/crm-configs/${configId}/contacts`, { tableName, phoneColumn });
      const data = await response.json();
      if (data.success) {
        setCrmContacts(data.data || []);
        toast({ title: `Loaded ${data.count || 0} contacts` });
      } else {
        toast({ title: "Failed to load contacts", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading contacts", variant: "destructive" });
    } finally {
      setIsLoadingCrmData(false);
    }
  };

  const loadEmailCrmTables = async (configId: string) => {
    setIsLoadingEmailCrmData(true);
    setSelectedEmailTable("");
    setSelectedEmailColumn("");
    setEmailCrmColumns([]);
    setEmailCrmContacts([]);
    setSelectedEmailTags([]);
    try {
      const response = await apiRequest("GET", `/api/crm-configs/${configId}/tables`);
      const data = await response.json();
      if (data.success) {
        setEmailCrmTables(data.data || []);
      } else {
        toast({ title: "Failed to load CRM tables", description: data.error, variant: "destructive" });
      }
      // Load available tags for this CRM config
      const tagsResponse = await apiRequest("GET", `/api/crm-configs/${configId}/tags`);
      const tagsData = await tagsResponse.json();
      if (tagsData.success) {
        setAvailableEmailTags(tagsData.data || []);
      }
    } catch (error) {
      toast({ title: "Error loading CRM tables", variant: "destructive" });
    } finally {
      setIsLoadingEmailCrmData(false);
    }
  };

  const loadEmailCrmColumns = async (configId: string, tableName: string) => {
    setIsLoadingEmailCrmData(true);
    setSelectedEmailColumn("");
    setEmailCrmContacts([]);
    try {
      const response = await apiRequest("GET", `/api/crm-configs/${configId}/tables/${encodeURIComponent(tableName)}/columns`);
      const data = await response.json();
      if (data.success) {
        setEmailCrmColumns(data.data || []);
      } else {
        toast({ title: "Failed to load table columns", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading table columns", variant: "destructive" });
    } finally {
      setIsLoadingEmailCrmData(false);
    }
  };

  const loadEmailCrmContacts = async (configId: string, tableName: string, emailColumn: string) => {
    setIsLoadingEmailCrmData(true);
    try {
      if (selectedEmailTags.length > 0) {
        const filterResponse = await apiRequest("POST", `/api/crm-configs/${configId}/contacts/filter-by-tags`, { tagIds: selectedEmailTags });
        const filterData = await filterResponse.json();

        if (!filterResponse.ok || !filterData.success) {
          throw new Error(filterData.error || "Failed to filter contacts by tags");
        }

        const emails = (filterData.data || [])
          .map((ct: any) => ct.contactEmail)
          .filter(Boolean);
        const uniqueEmails = Array.from(new Set(emails)) as string[];

        setEmailCrmContacts(uniqueEmails);
        toast({
          title: `Loaded ${uniqueEmails.length} contacts`,
          description: uniqueEmails.length === 0
            ? "No email addresses stored for the selected tags."
            : undefined,
        });
        return;
      }

      const response = await apiRequest("POST", `/api/crm-configs/${configId}/contacts`, { tableName, phoneColumn: emailColumn });
      const data = await response.json();
      if (data.success) {
        setEmailCrmContacts(data.data || []);
        toast({ title: `Loaded ${data.count || 0} contacts` });
      } else {
        toast({ title: "Failed to load contacts", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading contacts", variant: "destructive" });
    } finally {
      setIsLoadingEmailCrmData(false);
    }
  };

  const shareUrl = surveyId ? getPublicLink(surveyId) : "";

  useEffect(() => {
    if (shareUrl && qrCodeRef.current) {
      qrCodeInstance.current = new QRCodeStyling({
        width: 160,
        height: 160,
        data: shareUrl,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: "Byte",
          errorCorrectionLevel: "H"
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 0
        },
        dotsOptions: {
          color: "#000000",
          type: "rounded"
        },
        backgroundOptions: {
          color: "#ffffff"
        },
        image: undefined,
        cornersSquareOptions: {
          type: "extra-rounded"
        },
        cornersDotOptions: {
          type: "dot"
        }
      });

      qrCodeInstance.current.append(qrCodeRef.current);
    }
  }, [shareUrl]);

  if (isLoadingSurvey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!surveyId || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Survey Not Found</CardTitle>
            <CardDescription>The survey you are trying to share does not exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Share Survey</h1>
            <p className="text-sm text-gray-600">{(survey as any).title}</p>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = "/surveys")}>
            Back to Surveys
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Share Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { key: "crm", label: "CRM", icon: Database },
                  { key: "link", label: "Link & QR", icon: LinkIcon },
                  { key: "wa", label: "WhatsApp", icon: MsgIcon },
                  { key: "voice", label: "Voice Agent", icon: Phone },
                  { key: "email", label: "Email", icon: Mail },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveSection(item.key as any)}
                      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-muted text-foreground font-semibold" : "hover:bg-muted/60 text-muted-foreground"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            {activeSection === "link" && (
              <Card>
                <CardHeader>
                  <CardTitle>Link & QR</CardTitle>
                  <CardDescription>Share a public link or QR code to collect responses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Public Link</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input readOnly value={shareUrl} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(shareUrl);
                            toast({ title: "Copied to clipboard" });
                          } catch {
                            toast({ title: "Copy failed", variant: "destructive" });
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">QR Code</Label>
                    <div className="flex flex-col gap-3">
                      <div className="p-4 inline-block bg-white rounded-md border cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                        if (qrCodeInstance.current) {
                          qrCodeInstance.current.download({ extension: "png", name: `survey-qr-${surveyId}` });
                        }
                      }} ref={qrCodeRef}>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (qrCodeInstance.current) {
                            qrCodeInstance.current.download({ extension: "png", name: `survey-qr-${surveyId}` });
                          }
                        }}
                        className="w-fit"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "wa" && (
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>Send survey questions one by one using Wati.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Language</Label>
                      <Select value={waLanguage} onValueChange={(v) => setWaLanguage(v as "en" | "ar")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">System messages use this language.</p>
                    </div>

                    {normalizedCrmConfigs.length > 0 ? (
                      <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <Label className="text-blue-900 dark:text-blue-100 font-semibold">Fetch from CRM</Label>
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={selectedCrmConfig}
                            onValueChange={(value) => {
                              setSelectedCrmConfig(value);
                              setSelectedTable("");
                              setSelectedPhoneColumn("");
                              if (value) loadCrmTables(value);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select CRM..." />
                            </SelectTrigger>
                            <SelectContent>
                              {normalizedCrmConfigs.filter((c: any) => c.isActive).map((config: any) => (
                                <SelectItem key={config.id} value={config.id}>
                                  {config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedCrmConfig && (
                            <Select
                              value={selectedTable}
                              onValueChange={(value) => {
                                setSelectedTable(value);
                                setSelectedPhoneColumn("");
                                if (value) loadCrmColumns(selectedCrmConfig, value);
                              }}
                              disabled={isLoadingCrmData || !crmTables.length}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoadingCrmData ? "Loading..." : "Select table..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {crmTables.map((table: any) => (
                                  <SelectItem key={table.name} value={table.name}>
                                    {table.label || table.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {selectedTable && (
                            <Select
                              value={selectedPhoneColumn}
                              onValueChange={(value) => setSelectedPhoneColumn(value)}
                              disabled={isLoadingCrmData || !crmColumns.length}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoadingCrmData ? "Loading..." : "Select phone column..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {crmColumns.map((column: any) => (
                                  <SelectItem key={column.name} value={column.name}>
                                    {column.label || column.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Tag Filtering for WhatsApp */}
                          {selectedCrmConfig && availableTags.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm">Filter by Tags (Optional)</Label>
                              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                                {availableTags.map((tag: any) => (
                                  <Badge
                                    key={tag.id}
                                    style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : "transparent", color: selectedTags.includes(tag.id) ? "white" : tag.color, borderColor: tag.color }}
                                    className="cursor-pointer border-2"
                                    onClick={() => {
                                      setSelectedTags(prev =>
                                        prev.includes(tag.id)
                                          ? prev.filter(id => id !== tag.id)
                                          : [...prev, tag.id]
                                      );
                                    }}
                                  >
                                    {tag.name}
                                    {tag.category !== "general" && (
                                      <span className="ml-1 text-xs opacity-75">
                                        ({tag.category})
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                              {selectedTags.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {selectedTags.length} tag(s) selected - contacts matching ANY selected tag will be included
                                </p>
                              )}
                            </div>
                          )}

                          {selectedPhoneColumn && (
                            <>
                              <Button
                                size="sm"
                                className="w-full"
                                variant="secondary"
                                onClick={() => loadCrmContacts(selectedCrmConfig, selectedTable, selectedPhoneColumn)}
                                disabled={isLoadingCrmData}
                              >
                                {isLoadingCrmData ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Database className="w-4 h-4 mr-2" />
                                    Fetch Contacts from CRM
                                  </>
                                )}
                              </Button>

                              {crmContacts.length > 0 && (
                                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                      {crmContacts.length} contacts ready
                                    </span>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => setShowContactsDialog(true)}>
                                    View List
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="md:col-span-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-4 h-4 text-yellow-700" />
                          <Label className="text-yellow-900 dark:text-yellow-100 font-semibold">Connect a CRM</Label>
                        </div>
                        <p className="text-sm text-yellow-800 dark:text-yellow-100">
                          No CRM connections found. Connect a CRM to pull phone numbers here.
                        </p>
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings/crm"}>
                            Go to CRM Settings
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Label>Single Phone Number (E.164)</Label>
                      <Input
                        value={waSinglePhone}
                        onChange={(e) => setWaSinglePhone(e.target.value)}
                        placeholder="+1234567890"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Send to one recipient</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Or Enter Multiple Numbers</Label>
                      <Textarea
                        value={waMultiplePhones}
                        onChange={(e) => setWaMultiplePhones(e.target.value)}
                        placeholder={"+1234567890\n+9876543210\n+447123456789"}
                        className="font-mono"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">One phone number per line</p>
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/40 p-3 text-xs text-gray-700 space-y-1">
                    <p className="font-semibold">How it works:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each survey question is sent as a separate WhatsApp message</li>
                      <li>User replies and the next question follows automatically</li>
                      <li>All answers are stored in the database</li>
                    </ul>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const phoneNumbersText = waMultiplePhones.trim();
                      let phoneNumbers: string[] = [];

                      if (crmContacts.length > 0) {
                        phoneNumbers = crmContacts;
                      } else if (waSinglePhone.trim()) {
                        phoneNumbers = [waSinglePhone.trim()];
                      } else if (phoneNumbersText) {
                        phoneNumbers = phoneNumbersText.split("\n").map((p) => p.trim()).filter(Boolean);
                      }

                      if (!phoneNumbers.length) {
                        toast({ title: "Please enter at least one phone number", variant: "destructive" });
                        return;
                      }

                      try {
                        const resp = await fetch("/api/whatsapp/send-survey-bulk", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            surveyId,
                            phoneNumbers,
                            language: waLanguage,
                          }),
                        });
                        const data = await resp.json();
                        if (!resp.ok || !data.success) {
                          throw new Error(data.message || resp.statusText);
                        }
                        toast({
                          title: "Survey started",
                          description: `WhatsApp flow started for ${phoneNumbers.length} recipient(s)`,
                        });
                      } catch (e: any) {
                        toast({
                          title: "Failed to send survey",
                          description: e?.message || "Unknown error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Send Survey
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === "voice" && (
              <Card>
                <CardHeader>
                  <CardTitle>Voice Agent</CardTitle>
                  <CardDescription>Start a voice survey call with your VAPI agent.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Call Language</Label>
                      <Select value={voiceLang} onValueChange={(v) => setVoiceLang(v as "en" | "ar")}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Choose the language for prompts and conversation.</p>
                    </div>

                    {normalizedCrmConfigs.length > 0 ? (
                      <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <Label className="text-blue-900 dark:text-blue-100 font-semibold">Fetch from CRM</Label>
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={selectedCrmConfig}
                            onValueChange={(value) => {
                              setSelectedCrmConfig(value);
                              setSelectedTable("");
                              setSelectedPhoneColumn("");
                              if (value) loadCrmTables(value);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select CRM..." />
                            </SelectTrigger>
                            <SelectContent>
                              {normalizedCrmConfigs.map((config: any) => (
                                <SelectItem key={config.id} value={config.id} disabled={!config.isActive}>
                                  {config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)}{!config.isActive ? " (inactive)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedCrmConfig && (
                            <Select
                              value={selectedTable}
                              onValueChange={(value) => {
                                setSelectedTable(value);
                                setSelectedPhoneColumn("");
                                if (value) loadCrmColumns(selectedCrmConfig, value);
                              }}
                              disabled={isLoadingCrmData || !crmTables.length}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoadingCrmData ? "Loading..." : "Select table..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {crmTables.map((table: any) => (
                                  <SelectItem key={table.name} value={table.name}>
                                    {table.label || table.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {selectedTable && (
                            <Select
                              value={selectedPhoneColumn}
                              onValueChange={(value) => setSelectedPhoneColumn(value)}
                              disabled={isLoadingCrmData || !crmColumns.length}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoadingCrmData ? "Loading..." : "Select phone column..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {crmColumns.map((column: any) => (
                                  <SelectItem key={column.name} value={column.name}>
                                    {column.label || column.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Tag Filtering for Voice */}
                          {selectedCrmConfig && availableTags.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm">Filter by Tags (Optional)</Label>
                              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                                {availableTags.map((tag: any) => (
                                  <Badge
                                    key={tag.id}
                                    style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent', color: selectedTags.includes(tag.id) ? 'white' : tag.color, borderColor: tag.color }}
                                    className="cursor-pointer border-2"
                                    onClick={() => {
                                      setSelectedTags(prev =>
                                        prev.includes(tag.id)
                                          ? prev.filter(id => id !== tag.id)
                                          : [...prev, tag.id]
                                      );
                                    }}
                                  >
                                    {tag.name}
                                    {tag.category !== "general" && (
                                      <span className="ml-1 text-xs opacity-75">
                                        ({tag.category})
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                              {selectedTags.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {selectedTags.length} tag(s) selected - contacts matching ANY selected tag will be included
                                </p>
                              )}
                            </div>
                          )}

                          {selectedPhoneColumn && (
                            <Button
                              size="sm"
                              className="w-full"
                              variant="secondary"
                              onClick={() => loadCrmContacts(selectedCrmConfig, selectedTable, selectedPhoneColumn)}
                              disabled={isLoadingCrmData}
                            >
                              {isLoadingCrmData ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Database className="w-4 h-4 mr-2" />
                                  Load {crmContacts.length > 0 ? `${crmContacts.length}` : ""} Contacts
                                </>
                              )}
                            </Button>
                          )}

                          {crmContacts.length > 0 && (
                            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  {crmContacts.length} contacts ready
                                </span>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => setShowContactsDialog(true)}>
                                View List
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="md:col-span-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-4 h-4 text-yellow-700" />
                          <Label className="text-yellow-900 dark:text-yellow-100 font-semibold">Connect a CRM</Label>
                        </div>
                        <p className="text-sm text-yellow-800 dark:text-yellow-100">
                          No CRM connections found. Connect a CRM to pull phone numbers here.
                        </p>
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings/crm"}>
                            Go to CRM Settings
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Label>Phone Number (E.164 format)</Label>
                      <Input
                        value={voicePhone}
                        onChange={(e) => setVoicePhone(e.target.value)}
                        placeholder="e.g., +1234567890"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +1, +968).</p>
                    </div>
                  </div>

                  <Button
                    onClick={async () => {
                      const phone = voicePhone.trim() || (crmContacts.length === 1 ? crmContacts[0] : "");
                      if (!phone) {
                        toast({ title: "Phone number required", description: "Enter a phone or load from CRM", variant: "destructive" });
                        return;
                      }
                      try {
                        const res = await apiRequest("POST", "/api/start-survey", {
                          surveyId,
                          phoneNumber: phone,
                          language: voiceLang,
                        });
                        const result = await res.json();
                        if (result.success) {
                          toast({
                            title: "Voice call initiated",
                            description: `VAPI is calling ${phone}`,
                          });
                          setVoicePhone("");
                        } else {
                          throw new Error(result.message || "Failed to start call");
                        }
                      } catch (e: any) {
                        toast({
                          title: "Failed to start call",
                          description: e?.message || "Unknown error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Start Voice Survey Call
                  </Button>

                  <div className="pt-6 border-t" />
                  <div className="space-y-3">
                    <Label>Bulk Calls (Upload Excel/CSV)</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload an Excel (.xlsx/.xls) or CSV file with a "phone" column, or one phone number per line.
                    </p>
                    <div>
                      <input
                        ref={voiceFileInputRef}
                        className="hidden"
                        id="voice-csv"
                        type="file"
                        accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-excel,.xls"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            setVoiceCsvName("");
                            setVoiceCsvPhones([]);
                            return;
                          }
                          await processVoiceFile(file);
                        }}
                      />

                      <div
                        role="button"
                        className={`w-full rounded-lg border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition-colors ${isVoiceDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                        onClick={() => voiceFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsVoiceDragOver(true);
                        }}
                        onDragLeave={() => setIsVoiceDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsVoiceDragOver(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) processVoiceFile(f);
                        }}
                      >
                        {isVoiceParsing ? (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Parsing file...
                          </div>
                        ) : voiceCsvName ? (
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {voiceCsvName} - {voiceCsvPhones.length} numbers
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVoiceCsvName("");
                                setVoiceCsvPhones([]);
                                if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                            <UploadCloud className="w-5 h-5 text-primary" />
                            <span className="px-2">Drag and drop CSV/XLSX here, or click to choose</span>
                            <span className="text-xs">Accepted: .csv, .xlsx, .xls</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      disabled={!voiceCsvPhones.length && crmContacts.length === 0}
                      onClick={async () => {
                        const phonesToCall = crmContacts.length > 0 ? crmContacts : voiceCsvPhones;
                        if (!phonesToCall.length) {
                          toast({ title: "No numbers available", description: "Load from CRM or upload CSV", variant: "destructive" });
                          return;
                        }
                        try {
                          const res = await apiRequest("POST", "/api/start-survey-bulk", {
                            surveyId,
                            phoneNumbers: phonesToCall,
                            language: voiceLang,
                          });
                          const result = await res.json();
                          if (result.success) {
                            toast({
                              title: "Bulk calls initiated",
                              description: `${result.results?.filter((r: any) => r.ok).length || 0}/${result.results?.length || 0} started`,
                            });
                            setVoiceCsvPhones([]);
                            setVoiceCsvName("");
                            setCrmContacts([]);
                            if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";
                          } else {
                            throw new Error(result.message || "Bulk start failed");
                          }
                        } catch (e: any) {
                          toast({
                            title: "Failed to start bulk calls",
                            description: e?.message || "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {crmContacts.length > 0
                        ? `Start ${crmContacts.length} Voice Calls (CRM)`
                        : `Start ${voiceCsvPhones.length} Voice Calls (CSV)`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "crm" && (
              <Card>
                <CardHeader>
                  <CardTitle>CRM</CardTitle>
                  <CardDescription>Fetch contacts from your CRM to send surveys.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingCrmConfigs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-600">Loading CRM configurations...</span>
                    </div>
                  ) : normalizedCrmConfigs.filter((c: any) => c.isActive).length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="font-semibold">No CRM connection found.</p>
                          <p className="text-sm">Connect a CRM (Zoho, Salesforce, or HubSpot) first.</p>
                          <div className="flex gap-2">
                            <Button variant="default" size="sm" onClick={() => (window.location.href = "/settings/crm")}>
                              Go to CRM Settings
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.open("/HOW_TO_CONNECT_ZOHO.md", "_blank")}>
                              Setup Guide
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Step 1: Select CRM Connection</Label>
                        <Select
                          value={selectedCrmConfig}
                          onValueChange={(value) => {
                            setSelectedCrmConfig(value);
                            setSelectedTable("");
                            setSelectedPhoneColumn("");
                            setCrmTables([]);
                            setCrmColumns([]);
                            setCrmContacts([]);
                            if (value) loadCrmTables(value);
                          }}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Choose a CRM connection..." />
                          </SelectTrigger>
                          <SelectContent>
                            {normalizedCrmConfigs.filter((c: any) => c.isActive).map((config: any) => (
                              <SelectItem key={config.id} value={config.id}>
                                {config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)} - {config.authType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">Select the CRM to fetch contacts from.</p>
                      </div>

                      {selectedCrmConfig && (
                        <div>
                          <Label>Step 2: Select Table/Object</Label>
                          <Select
                            value={selectedTable}
                            onValueChange={(value) => {
                              setSelectedTable(value);
                              setSelectedPhoneColumn("");
                              setCrmColumns([]);
                              setCrmContacts([]);
                              if (value) loadCrmColumns(selectedCrmConfig, value);
                            }}
                            disabled={isLoadingCrmData || crmTables.length === 0}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder={isLoadingCrmData ? "Loading tables..." : "Choose a table..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {crmTables.map((table: any) => (
                                <SelectItem key={table.name} value={table.name}>
                                  {table.label || table.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedTable && (
                        <div>
                          <Label>Step 3: Select the Column to Send</Label>
                          <Select
                            value={selectedPhoneColumn}
                            onValueChange={(value) => {
                              setSelectedPhoneColumn(value);
                              setCrmContacts([]);
                            }}
                            disabled={isLoadingCrmData || crmColumns.length === 0}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder={isLoadingCrmData ? "Loading columns..." : "Choose phone column..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {crmColumns.map((column: any) => (
                                <SelectItem key={column.name} value={column.name}>
                                  {column.label || column.name} ({column.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedCrmConfig && availableTags.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm">Filter by Tags (Optional)</Label>
                          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                            {availableTags.map((tag: any) => (
                              <Badge
                                key={tag.id}
                                style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : "transparent", color: selectedTags.includes(tag.id) ? "white" : tag.color, borderColor: tag.color }}
                                className="cursor-pointer border-2"
                                onClick={() => {
                                  setSelectedTags(prev =>
                                    prev.includes(tag.id)
                                      ? prev.filter(id => id !== tag.id)
                                      : [...prev, tag.id]
                                  );
                                }}
                              >
                                {tag.name}
                                {tag.category !== "general" && (
                                  <span className="ml-1 text-xs opacity-75">
                                    ({tag.category})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                          {selectedTags.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedTags.length} tag(s) selected - contacts matching ANY selected tag will be included
                            </p>
                          )}
                        </div>
                      )}

                      {selectedPhoneColumn && (
                        <div className="space-y-3">
                          <Button
                            onClick={() => loadCrmContacts(selectedCrmConfig, selectedTable, selectedPhoneColumn)}
                            disabled={isLoadingCrmData}
                            variant="secondary"
                          >
                            {isLoadingCrmData ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Fetching Contacts...
                              </>
                            ) : (
                              <>
                                <Database className="w-4 h-4 mr-2" />
                                Fetch Contacts from CRM
                              </>
                            )}
                          </Button>

                          {crmContacts.length > 0 && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>{crmContacts.length} contacts loaded</strong>
                                <div className="mt-2 text-xs max-h-32 overflow-y-auto">
                                  {crmContacts.slice(0, 10).join(", ")}
                                  {crmContacts.length > 10 && ` ... and ${crmContacts.length - 10} more`}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      {crmContacts.length > 0 && (
                        <div className="border-t pt-4 space-y-3">
                          <Label>Send Survey To CRM Contacts</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const resp = await fetch("/api/whatsapp/send-survey-bulk", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      surveyId,
                                      phoneNumbers: crmContacts,
                                      language: "en",
                                    }),
                                  });
                                  const data = await resp.json();
                                  if (data.success) {
                                    toast({
                                      title: "WhatsApp surveys sent",
                                      description: `Survey started for ${crmContacts.length} contacts`,
                                    });
                                  } else {
                                    throw new Error(data.message);
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Failed to send surveys",
                                    description: e?.message || "Unknown error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <MsgIcon className="w-4 h-4 mr-2" />
                              Send via WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await apiRequest("POST", "/api/start-survey-bulk", {
                                    surveyId,
                                    phoneNumbers: crmContacts,
                                    language: voiceLang,
                                  });
                                  const result = await res.json();
                                  if (result.success) {
                                    toast({
                                      title: "Voice calls initiated",
                                      description: `${result.results?.filter((r: any) => r.ok).length || 0}/${crmContacts.length} calls started`,
                                    });
                                  } else {
                                    throw new Error(result.message);
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Failed to start calls",
                                    description: e?.message || "Unknown error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Send via Voice
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                if (crmEmailContacts.length === 0) {
                                  toast({
                                    title: "Select an email column",
                                    description: "Load CRM contacts using an email field to send email surveys.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                try {
                                  const resp = await fetch("/api/email/send-survey-bulk", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      surveyId,
                                      emails: crmEmailContacts,
                                    }),
                                  });
                                  const data = await resp.json();
                                  if (data.success) {
                                    toast({
                                      title: "Email send queued",
                                      description: `Survey link queued for ${crmEmailContacts.length} recipient(s).`,
                                    });
                                  } else {
                                    throw new Error(data.message);
                                  }
                                } catch (e: any) {
                                  toast({
                                    title: "Failed to send emails",
                                    description: e?.message || "Unknown error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send via Email
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "email" && (
              <Card>
                <CardHeader>
                  <CardTitle>Email</CardTitle>
                  <CardDescription>Send survey links via email (single, bulk, or CRM).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {normalizedCrmConfigs.length > 0 ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-blue-600" />
                        <Label className="text-blue-900 dark:text-blue-100 font-semibold">Fetch from CRM</Label>
                      </div>
                      <div className="space-y-2">
                        <Select
                          value={selectedEmailCrmConfig}
                          onValueChange={(value) => {
                            setSelectedEmailCrmConfig(value);
                            setSelectedEmailTable("");
                            setSelectedEmailColumn("");
                            if (value) loadEmailCrmTables(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select CRM..." />
                          </SelectTrigger>
                          <SelectContent>
                            {normalizedCrmConfigs.map((config: any) => (
                              <SelectItem key={config.id} value={config.id} disabled={!config.isActive}>
                                {config.crmType.charAt(0).toUpperCase() + config.crmType.slice(1)}{!config.isActive ? " (inactive)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedEmailCrmConfig && (
                          <Select
                            value={selectedEmailTable}
                            onValueChange={(value) => {
                              setSelectedEmailTable(value);
                              setSelectedEmailColumn("");
                              if (value) loadEmailCrmColumns(selectedEmailCrmConfig, value);
                            }}
                            disabled={isLoadingEmailCrmData || !emailCrmTables.length}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isLoadingEmailCrmData ? "Loading..." : "Select table..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {emailCrmTables.map((table: any) => (
                                <SelectItem key={table.name} value={table.name}>
                                  {table.label || table.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {selectedEmailTable && (
                          <Select
                            value={selectedEmailColumn}
                            onValueChange={(value) => setSelectedEmailColumn(value)}
                            disabled={isLoadingEmailCrmData || !emailCrmColumns.length}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isLoadingEmailCrmData ? "Loading..." : "Select email column..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {emailCrmColumns.map((column: any) => (
                                <SelectItem key={column.name} value={column.name}>
                                  {column.label || column.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Tag Filtering for Email */}
                        {selectedEmailCrmConfig && availableEmailTags.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Filter by Tags (Optional)</Label>
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                              {availableEmailTags.map((tag: any) => (
                                <Badge
                                  key={tag.id}
                                  style={{ backgroundColor: selectedEmailTags.includes(tag.id) ? tag.color : 'transparent', color: selectedEmailTags.includes(tag.id) ? 'white' : tag.color, borderColor: tag.color }}
                                  className="cursor-pointer border-2"
                                  onClick={() => {
                                    setSelectedEmailTags(prev =>
                                      prev.includes(tag.id)
                                        ? prev.filter(id => id !== tag.id)
                                        : [...prev, tag.id]
                                    );
                                  }}
                                >
                                  {tag.name}
                                  {tag.category !== "general" && (
                                    <span className="ml-1 text-xs opacity-75">
                                      ({tag.category})
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                            {selectedEmailTags.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {selectedEmailTags.length} tag(s) selected - contacts matching ANY selected tag will be included
                              </p>
                            )}
                          </div>
                        )}

                        {selectedEmailColumn && (
                          <>
                            <Button
                              size="sm"
                              className="w-full"
                              variant="secondary"
                              onClick={() => loadEmailCrmContacts(selectedEmailCrmConfig, selectedEmailTable, selectedEmailColumn)}
                              disabled={isLoadingEmailCrmData}
                            >
                              {isLoadingEmailCrmData ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Database className="w-4 h-4 mr-2" />
                                  Fetch Contacts from CRM
                                </>
                              )}
                            </Button>

                            {emailCrmContacts.length > 0 && (
                              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                    {emailCrmContacts.length} contacts ready
                                  </span>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setShowEmailContactsDialog(true)}>
                                  View List
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-yellow-700" />
                        <Label className="text-yellow-900 dark:text-yellow-100 font-semibold">Connect a CRM</Label>
                      </div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-100">
                        No CRM connections found. Connect a CRM to pull email addresses here.
                      </p>
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings/crm"}>
                          Go to CRM Settings
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Single Email</Label>
                    <Input
                      value={emailSingle}
                      onChange={(e) => setEmailSingle(e.target.value)}
                      placeholder="person@company.com"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Send to one recipient</p>
                  </div>
                  <div>
                    <Label>Or Enter Multiple Emails</Label>
                    <Textarea
                      value={emailMultiple}
                      onChange={(e) => setEmailMultiple(e.target.value)}
                      placeholder={"person@company.com\nsecond@company.com"}
                      className="font-mono"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">One email per line</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Or Upload CSV/Excel</Label>
                    <input
                      ref={emailFileInputRef}
                      className="hidden"
                      id="email-csv"
                      type="file"
                      accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-excel,.xls"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          setEmailCsvName("");
                          setEmailCsvList([]);
                          return;
                        }
                        await processEmailFile(file);
                      }}
                    />

                    <div
                      role="button"
                      className={`w-full rounded-lg border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition-colors ${isEmailDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      onClick={() => emailFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsEmailDragOver(true);
                      }}
                      onDragLeave={() => setIsEmailDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsEmailDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) processEmailFile(f);
                      }}
                    >
                      {isEmailParsing ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Parsing file...
                        </div>
                      ) : emailCsvName ? (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {emailCsvName} - {emailCsvList.length} emails
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEmailCsvName("");
                              setEmailCsvList([]);
                              if (emailFileInputRef.current) emailFileInputRef.current.value = "";
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                          <UploadCloud className="w-5 h-5 text-primary" />
                          <span className="px-2">Drag and drop CSV/XLSX here, or click to choose</span>
                          <span className="text-xs">Accepted: .csv, .xlsx, .xls</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={async () => {
                      let emails: string[] = [];

                      if (emailCrmContacts.length > 0) {
                        emails = emailCrmContacts;
                      } else if (emailSingle.trim()) {
                        emails = [emailSingle.trim()];
                      } else if (emailMultiple.trim()) {
                        emails = emailMultiple
                          .split("\n")
                          .map((e) => e.trim())
                          .filter((e) => emailRegex.test(e));
                      } else if (emailCsvList.length > 0) {
                        emails = emailCsvList;
                      }

                      if (!emails.length) {
                        toast({ title: "Please provide at least one email", variant: "destructive" });
                        return;
                      }

                      try {
                        const resp = await fetch("/api/email/send-survey-bulk", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ surveyId, emails }),
                        });
                        const data = await resp.json();
                        if (!resp.ok || !data.success) {
                          throw new Error(data.message || resp.statusText);
                        }
                        toast({
                          title: "Email send queued",
                          description: `Survey link queued for ${emails.length} recipient(s).`,
                        });
                      } catch (e: any) {
                        toast({
                          title: "Failed to send emails",
                          description: e?.message || "Unknown error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Survey
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Email delivery uses your configured provider on the server. If not configured, the server will
                    return a warning.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              CRM Contacts Loaded
            </DialogTitle>
            <DialogDescription>Review the list of contacts fetched from your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong className="text-green-700">{crmContacts.length} contacts loaded successfully</strong>
                <div className="text-xs text-gray-600 mt-1">
                  {selectedTable && `From: ${selectedTable} -> ${selectedPhoneColumn}`}
                </div>
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Phone Numbers</Label>
                <Badge variant="secondary">{crmContacts.length} total</Badge>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                {crmContacts.map((contact, idx) => (
                  <div key={idx} className="font-mono text-sm py-1 px-2 hover:bg-white dark:hover:bg-gray-800 rounded">
                    {idx + 1}. {contact}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(crmContacts.join("\n"));
                  toast({ title: "Copied to clipboard", description: `${crmContacts.length} phone numbers` });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All Numbers
              </Button>
              <Button variant="outline" onClick={() => setShowContactsDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailContactsDialog} onOpenChange={setShowEmailContactsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Contacts Loaded
            </DialogTitle>
            <DialogDescription>Review the list of emails fetched from your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong className="text-green-700">{emailCrmContacts.length} contacts loaded successfully</strong>
                <div className="text-xs text-gray-600 mt-1">
                  {selectedEmailTable && `From: ${selectedEmailTable} -> ${selectedEmailColumn}`}
                </div>
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Email Addresses</Label>
                <Badge variant="secondary">{emailCrmContacts.length} total</Badge>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                {emailCrmContacts.map((contact, idx) => (
                  <div key={idx} className="font-mono text-sm py-1 px-2 hover:bg-white dark:hover:bg-gray-800 rounded">
                    {idx + 1}. {contact}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(emailCrmContacts.join("\n"));
                  toast({ title: "Copied to clipboard", description: `${emailCrmContacts.length} emails` });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All Emails
              </Button>
              <Button variant="outline" onClick={() => setShowEmailContactsDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
