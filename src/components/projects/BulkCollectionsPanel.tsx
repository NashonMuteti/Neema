"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { CalendarIcon, Download, FileUp, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import type { FinancialAccount, Member } from "@/types/common";

type OnlineRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: string;
  accountId?: string;
};

type ParsedExcelRow = {
  memberId: string;
  amount: number;
  accountId: string;
  collectionDate: Date;
};

type Props = {
  projectId: string;
  projectName: string;
  actorProfileId: string;
  members: Member[];
  receivableAccounts: FinancialAccount[];
  defaultAccountId?: string;
  disabled?: boolean;
  onComplete: () => void;
};

function parseLooseDate(value: any, fallback: Date) {
  if (!value) return fallback;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  const s = String(value);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return fallback;
}

export default function BulkCollectionsPanel({
  projectId,
  projectName,
  actorProfileId,
  members,
  receivableAccounts,
  defaultAccountId,
  disabled,
  onComplete,
}: Props) {
  const [collectionDate, setCollectionDate] = React.useState<Date | undefined>(new Date());

  const [rows, setRows] = React.useState<OnlineRow[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const [parsedExcelRows, setParsedExcelRows] = React.useState<ParsedExcelRow[]>([]);
  const [excelParseError, setExcelParseError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(
      members.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        memberEmail: m.email,
        amount: "",
        accountId: defaultAccountId,
      })),
    );
  }, [members, defaultAccountId]);

  const defaultAccount = React.useMemo(() => {
    if (!defaultAccountId) return undefined;
    return receivableAccounts.find((a) => a.id === defaultAccountId);
  }, [defaultAccountId, receivableAccounts]);

  const accountById = React.useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    receivableAccounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [receivableAccounts]);

  const accountByName = React.useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    receivableAccounts.forEach((a) => map.set(a.name.trim().toLowerCase(), a));
    return map;
  }, [receivableAccounts]);

  const memberById = React.useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const memberByEmail = React.useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.email.trim().toLowerCase(), m));
    return map;
  }, [members]);

  const memberByName = React.useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.name.trim().toLowerCase(), m));
    return map;
  }, [members]);

  const runBulkInsert = React.useCallback(
    async (entries: ParsedExcelRow[]) => {
      if (!collectionDate) {
        showError("Please pick a collection date.");
        return;
      }
      if (receivableAccounts.length === 0) {
        showError("No receiving accounts available.");
        return;
      }

      setIsProcessing(true);
      let ok = 0;
      let failed = 0;
      let skipped = 0;

      for (const entry of entries) {
        if (!entry.amount || entry.amount <= 0) {
          skipped += 1;
          continue;
        }

        const { error } = await supabase.rpc("record_project_collection_atomic", {
          p_destination_account_id: entry.accountId,
          p_amount: entry.amount,
          p_actor_profile_id: actorProfileId,
          p_project_id: projectId,
          p_member_id: entry.memberId,
          p_collection_date: entry.collectionDate.toISOString(),
          p_source: `Project Collection: ${projectName}`,
        });

        if (error) {
          failed += 1;
          // eslint-disable-next-line no-console
          console.error("Bulk collection insert failed", { entry, error });
        } else {
          ok += 1;
        }
      }

      setIsProcessing(false);

      if (ok > 0) {
        showSuccess(
          `Bulk collections saved: ${ok}${skipped ? ` (skipped ${skipped})` : ""}${failed ? ` (failed ${failed})` : ""}.`,
        );
        onComplete();
        return;
      }

      showError(
        failed
          ? `No collections were saved. Failed ${failed} entries.`
          : "No collections to save (all amounts were blank/zero).",
      );
    },
    [actorProfileId, collectionDate, onComplete, projectId, projectName, receivableAccounts.length],
  );

  const downloadTemplate = () => {
    if (!collectionDate) {
      showError("Please pick a collection date first.");
      return;
    }

    // Intentionally avoid UUID columns in the user-facing template.
    // We match members by email (preferred) or name, and accounts by name.
    const templateRows = members.map((m) => ({
      member_email: m.email,
      member_name: m.name,
      amount: "",
      receiving_account_name: defaultAccount?.name || "",
      collection_date: format(collectionDate, "yyyy-MM-dd"),
    }));

    const wsCollections = XLSX.utils.json_to_sheet(templateRows);

    const wsAccounts = XLSX.utils.json_to_sheet(
      receivableAccounts.map((a) => ({
        receiving_account_name: a.name,
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsCollections, "Collections");
    XLSX.utils.book_append_sheet(wb, wsAccounts, "ReceivingAccounts");

    const safeProject = projectName.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `Project_Collections_Template_${safeProject}.xlsx`);
  };

  const parseExcel = async (file: File) => {
    setExcelParseError(null);
    setParsedExcelRows([]);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.Sheets["Collections"] ? "Collections" : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const baseDate = collectionDate ?? new Date();

      const parsed: ParsedExcelRow[] = [];
      const errors: string[] = [];

      for (const [idx, row] of data.entries()) {
        const memberId = String(row.member_id || row.memberId || "").trim();
        const memberEmail = String(row.member_email || row.memberEmail || "").trim();
        const memberName = String(row.member_name || row.memberName || "").trim();

        const member = memberId
          ? memberById.get(memberId)
          : memberEmail
            ? memberByEmail.get(memberEmail.toLowerCase())
            : memberByName.get(memberName.toLowerCase());

        if (!member) {
          errors.push(
            `Row ${idx + 2}: member not found (member_email="${memberEmail}" member_name="${memberName}")`,
          );
          continue;
        }

        const amountRaw = row.amount;
        const amount =
          typeof amountRaw === "number" ? amountRaw : parseFloat(String(amountRaw || "").trim());
        if (!amount || isNaN(amount) || amount <= 0) {
          // skip silently (template pre-populates all members)
          continue;
        }

        const accountIdRaw = String(row.receiving_account_id || row.account_id || "").trim();
        const accountNameRaw = String(
          row.receiving_account_name || row.account_name || row.receivingAccountName || "",
        ).trim();

        const account = accountIdRaw
          ? accountById.get(accountIdRaw)
          : accountByName.get(accountNameRaw.toLowerCase());

        if (!account) {
          errors.push(
            `Row ${idx + 2}: receiving account not found (receiving_account_name="${accountNameRaw}")`,
          );
          continue;
        }

        const d = parseLooseDate(row.collection_date, baseDate);

        parsed.push({
          memberId: member.id,
          amount,
          accountId: account.id,
          collectionDate: d,
        });
      }

      setParsedExcelRows(parsed);
      if (errors.length > 0) {
        setExcelParseError(errors.slice(0, 8).join("\n"));
      }

      if (parsed.length === 0 && errors.length === 0) {
        setExcelParseError("No valid rows found. Make sure you filled amount and receiving account name fields.");
      }
    } catch (e: any) {
      setExcelParseError(e?.message || "Failed to parse Excel file.");
    }
  };

  const buildOnlineEntries = () => {
    const d = collectionDate ?? new Date();

    const entries: ParsedExcelRow[] = [];
    for (const r of rows) {
      const amt = parseFloat(r.amount);
      if (!amt || isNaN(amt) || amt <= 0) continue;
      if (!r.accountId) continue;

      entries.push({
        memberId: r.memberId,
        amount: amt,
        accountId: r.accountId,
        collectionDate: d,
      });
    }

    return entries;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Collection Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !collectionDate && "text-muted-foreground",
                )}
                disabled={disabled || isProcessing}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {collectionDate ? format(collectionDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={collectionDate} onSelect={setCollectionDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-muted-foreground">Receiving accounts</Label>
          <div className="h-10 rounded-md border bg-muted/30 px-3 text-sm flex items-center">
            {receivableAccounts.length} available
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-muted-foreground">Template</Label>
          <Button variant="outline" onClick={downloadTemplate} disabled={disabled || isProcessing}>
            <Download className="mr-2 h-4 w-4" /> Download Excel template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="online">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="online">Online Bulk Entry</TabsTrigger>
          <TabsTrigger value="excel">Excel Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="mt-4">
          <div className="rounded-lg border">
            <ScrollArea className="h-[52vh]">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[320px_140px_1fr] gap-2 border-b bg-muted/30 px-3 py-2 text-sm font-medium">
                  <div>Member</div>
                  <div className="text-right">Amount</div>
                  <div>Receiving account</div>
                </div>

                {rows.map((row, idx) => {
                  return (
                    <div
                      key={row.memberId}
                      className={cn(
                        "grid grid-cols-[320px_140px_1fr] gap-2 px-3 py-2 text-sm",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{row.memberName}</div>
                        <div className="truncate text-xs text-muted-foreground">{row.memberEmail}</div>
                      </div>

                      <div className="flex justify-end">
                        <Input
                          className="h-9 w-[120px] text-right"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => {
                            const v = e.target.value;
                            setRows((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], amount: v };
                              return copy;
                            });
                          }}
                          disabled={disabled || isProcessing}
                        />
                      </div>

                      <div className="min-w-0">
                        <RadioGroup
                          value={row.accountId}
                          onValueChange={(v) => {
                            setRows((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], accountId: v };
                              return copy;
                            });
                          }}
                          className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
                          disabled={disabled || isProcessing}
                        >
                          {receivableAccounts.map((acc) => {
                            const id = `acc-${row.memberId}-${acc.id}`;
                            return (
                              <div
                                key={acc.id}
                                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
                              >
                                <RadioGroupItem id={id} value={acc.id} />
                                <Label htmlFor={id} className="cursor-pointer text-xs">
                                  {acc.name}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              onClick={() => runBulkInsert(buildOnlineEntries())}
              disabled={disabled || isProcessing || !collectionDate}
            >
              <Save className="mr-2 h-4 w-4" />
              {isProcessing ? "Saving..." : "Submit Bulk Collections"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="excel" className="mt-4">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="text-xs text-muted-foreground">
              Upload the completed template. Only rows with an amount &gt; 0 will be imported. Members are matched by
              <span className="font-medium"> email</span> (preferred) or name; receiving accounts are matched by
              <span className="font-medium"> name</span>.
            </div>

            <div className="grid gap-2">
              <Label htmlFor="excel-upload">Upload completed template</Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) void parseExcel(f);
                }}
                disabled={disabled || isProcessing}
              />

              {excelParseError ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-destructive">
                  {excelParseError}
                </pre>
              ) : null}

              {parsedExcelRows.length > 0 ? (
                <div className="rounded-md border bg-muted/20 p-3 text-sm">
                  Ready to import <span className="font-semibold">{parsedExcelRows.length}</span> collections.
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => runBulkInsert(parsedExcelRows)}
                disabled={disabled || isProcessing || parsedExcelRows.length === 0}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {isProcessing ? "Importing..." : "Import from Excel"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}