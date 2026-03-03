"use client";

import React from "react";
import { endOfDay, format, parseISO, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { validateFinancialTransaction } from "@/utils/security";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Edit, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useDebounce } from "@/hooks/use-debounce";
import ReportActions from "@/components/reports/ReportActions";
import DateRangePicker from "@/components/reports/DateRangePicker";

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
  profile_id: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ExpenditureTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  purpose: string;
  profile_id: string;
  account_name: string;
  profile_name?: string;
}

export default function Expenditure() {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const { canManageExpenditure } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageExpenditure: false };
    }

    const roleDef = definedRoles.find((r) => r.name === currentUser.role);
    const privileges = roleDef?.menuPrivileges || [];
    return { canManageExpenditure: privileges.includes("Manage Expenditure") };
  }, [currentUser, definedRoles]);

  const defaultRange = React.useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [transactions, setTransactions] = React.useState<ExpenditureTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [expenditureDate, setExpenditureDate] = React.useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = React.useState("");
  const [expenditureAccount, setExpenditureAccount] = React.useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = React.useState("");
  const [selectedExpenditureMemberId, setSelectedExpenditureMemberId] = React.useState<string | undefined>(undefined);

  // Filters
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  const [accountId, setAccountId] = React.useState<string>("All");
  const [memberId, setMemberId] = React.useState<string>("All");
  const [minAmount, setMinAmount] = React.useState<string>("");
  const [maxAmount, setMaxAmount] = React.useState<string>("");

  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 400);

  const fetchFinancialAccountsAndMembers = React.useCallback(async () => {
    if (!currentUser) return;

    let accountsQuery = supabase
      .from("financial_accounts")
      .select("id, name, current_balance, initial_balance, profile_id")
      .order("name", { ascending: true });

    if (!isAdmin) {
      accountsQuery = accountsQuery.eq("profile_id", currentUser.id);
    }

    const { data: accountsData, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
      setFinancialAccounts([]);
    } else {
      setFinancialAccounts((accountsData || []) as any);
    }

    const { data: membersData, error: membersError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members.");
      setMembers([]);
    } else {
      setMembers(
        (membersData || []).map((m) => ({
          id: m.id,
          name: m.name || m.email || "Unknown",
          email: m.email || "",
        })),
      );
    }
  }, [currentUser, isAdmin]);

  const fetchExpenditureTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const from = dateRange?.from ? startOfDay(dateRange.from) : null;
    const to = dateRange?.to ? endOfDay(dateRange.to) : null;

    if (!from || !to) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("expenditure_transactions")
      .select(
        `
        id,
        date,
        amount,
        account_id,
        purpose,
        profile_id,
        financial_accounts(name),
        profiles(name,email)
      `,
      )
      .gte("date", from.toISOString())
      .lte("date", to.toISOString())
      .order("date", { ascending: false });

    if (!isAdmin) {
      query = query.eq("profile_id", currentUser.id);
    }

    if (accountId !== "All") {
      query = query.eq("account_id", accountId);
    }

    if (isAdmin && memberId !== "All") {
      query = query.eq("profile_id", memberId);
    }

    const q = debouncedSearchQuery.trim();
    if (q) {
      query = query.ilike("purpose", `%${q}%`);
    }

    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    if (min !== null && Number.isFinite(min)) query = query.gte("amount", min);
    if (max !== null && Number.isFinite(max)) query = query.lte("amount", max);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expenditure transactions:", error);
      setError("Failed to load expenditure transactions.");
      showError("Failed to load expenditure transactions.");
      setTransactions([]);
      setLoading(false);
      return;
    }

    const normalized: ExpenditureTransaction[] = (data || []).map((t: any) => ({
      id: t.id,
      date: parseISO(t.date),
      amount: Number(t.amount || 0),
      account_id: t.account_id,
      purpose: t.purpose,
      profile_id: t.profile_id,
      account_name: t.financial_accounts?.name || "Unknown",
      profile_name: t.profiles?.name || t.profiles?.email || undefined,
    }));

    setTransactions(normalized);
    setLoading(false);
  }, [currentUser, isAdmin, dateRange?.from, dateRange?.to, accountId, memberId, debouncedSearchQuery, minAmount, maxAmount]);

  React.useEffect(() => {
    fetchFinancialAccountsAndMembers();
  }, [fetchFinancialAccountsAndMembers]);

  React.useEffect(() => {
    fetchExpenditureTransactions();
  }, [fetchExpenditureTransactions]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
    queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
  };

  const handlePostExpenditure = async () => {
    if (!canManageExpenditure) {
      showError("You do not have permission to record expenditure.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in.");
      return;
    }

    const parsedAmount = parseFloat(expenditureAmount);
    if (!expenditureDate || !parsedAmount || parsedAmount <= 0 || !expenditureAccount || !expenditurePurpose) {
      showError("Please fill all required fields.");
      return;
    }

    const validation = validateFinancialTransaction(parsedAmount, expenditureAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expenditure amount.");
      return;
    }

    const profileId = selectedExpenditureMemberId || currentUser.id;

    const { data: accountData, error: accountError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", expenditureAccount)
      .single();

    if (accountError || !accountData) {
      console.error("Error fetching account:", accountError);
      showError("Failed to fetch account details.");
      return;
    }

    if (!isAdmin && accountData.profile_id !== currentUser.id) {
      showError("You can only use your own account.");
      return;
    }

    if (accountData.current_balance < parsedAmount) {
      showError("Insufficient funds in the selected account.");
      return;
    }

    const { error: insertError } = await supabase.from("expenditure_transactions").insert({
      date: expenditureDate.toISOString(),
      amount: parsedAmount,
      account_id: expenditureAccount,
      purpose: expenditurePurpose.trim(),
      profile_id: profileId,
    });

    if (insertError) {
      console.error("Error posting expenditure:", insertError);
      showError("Failed to post expenditure.");
      return;
    }

    const newBalance = accountData.current_balance - parsedAmount;
    const { error: updateBalanceError } = await supabase
      .from("financial_accounts")
      .update({ current_balance: newBalance })
      .eq("id", expenditureAccount)
      .eq("profile_id", accountData.profile_id);

    if (updateBalanceError) {
      console.error("Error updating account balance:", updateBalanceError);
      showError("Expenditure posted, but failed to update account balance.");
    }

    showSuccess("Expenditure posted successfully!");
    setExpenditureAmount("");
    setExpenditurePurpose("");
    setSelectedExpenditureMemberId(undefined);
    fetchExpenditureTransactions();
    fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  const reportSubtitle = React.useMemo(() => {
    const fromStr = dateRange?.from ? format(dateRange.from, "MMM dd, yyyy") : "-";
    const toStr = dateRange?.to ? format(dateRange.to, "MMM dd, yyyy") : "-";

    const accountName =
      accountId === "All" ? "All Accounts" : financialAccounts.find((a) => a.id === accountId)?.name || "Account";

    const memberName = !isAdmin
      ? "My Transactions"
      : memberId === "All"
        ? "All Members"
        : members.find((m) => m.id === memberId)?.name || "Member";

    const parts = [`Date: ${fromStr} → ${toStr}`, accountName, memberName];
    const q = debouncedSearchQuery.trim();
    if (q) parts.push(`Search: ${q}`);
    if (minAmount) parts.push(`Min: ${currency.symbol}${minAmount}`);
    if (maxAmount) parts.push(`Max: ${currency.symbol}${maxAmount}`);
    return parts.join(" • ");
  }, [dateRange?.from, dateRange?.to, accountId, memberId, isAdmin, debouncedSearchQuery, minAmount, maxAmount, financialAccounts, members, currency.symbol]);

  const reportRows = React.useMemo(() => {
    const base = transactions.map((t) => [
      format(t.date, "MMM dd, yyyy"),
      t.profile_name || "-",
      t.purpose,
      t.account_name,
      `${currency.symbol}${t.amount.toFixed(2)}`,
    ]);

    const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    return [...base, ["TOTAL", "", "", "", `${currency.symbol}${total.toFixed(2)}`]];
  }, [transactions, currency.symbol]);

  const totalAmount = React.useMemo(() => transactions.reduce((sum, t) => sum + (t.amount || 0), 0), [transactions]);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingAmount, setEditingAmount] = React.useState<string>("");
  const [editingPurpose, setEditingPurpose] = React.useState<string>("");
  const [editingAccount, setEditingAccount] = React.useState<string>("");
  const [editingDate, setEditingDate] = React.useState<Date | undefined>(undefined);

  const [deletingTransaction, setDeletingTransaction] = React.useState<ExpenditureTransaction | null>(null);

  const handleEditTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    setEditingId(id);
    setEditingAmount(String(tx.amount));
    setEditingPurpose(tx.purpose);
    setEditingAccount(tx.account_id);
    setEditingDate(tx.date);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !currentUser) return;

    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) return;

    const parsedAmount = parseFloat(editingAmount);
    if (!editingDate || !parsedAmount || parsedAmount <= 0 || !editingAccount || !editingPurpose) {
      showError("Please fill all required fields.");
      return;
    }

    const validation = validateFinancialTransaction(parsedAmount, editingAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expenditure amount.");
      return;
    }

    const validatedPurpose = editingPurpose.trim();

    const { data: oldAccount, error: oldAccError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", tx.account_id)
      .single();

    const { data: newAccount, error: newAccError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", editingAccount)
      .single();

    if (oldAccError || newAccError || !oldAccount || !newAccount) {
      showError("Failed to fetch account details.");
      return;
    }

    if (!isAdmin && (oldAccount.profile_id !== currentUser.id || newAccount.profile_id !== currentUser.id)) {
      showError("You can only use your own account.");
      return;
    }

    // Adjust balances
    if (tx.account_id === editingAccount) {
      const newBalance = oldAccount.current_balance + tx.amount - parsedAmount;
      const { error: updateBalanceError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newBalance })
        .eq("id", oldAccount.id)
        .eq("profile_id", oldAccount.profile_id);
      if (updateBalanceError) {
        console.error("Error updating account balance for same account:", updateBalanceError);
        showError("Transaction updated, but failed to adjust account balance.");
      }
    } else {
      const oldAccountNewBalance = oldAccount.current_balance + tx.amount;
      const newAccountNewBalance = newAccount.current_balance - parsedAmount;

      if (newAccountNewBalance < 0) {
        showError("Insufficient funds in the selected account.");
        return;
      }

      const { error: updateOldAccountError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: oldAccountNewBalance })
        .eq("id", oldAccount.id)
        .eq("profile_id", oldAccount.profile_id);

      const { error: updateNewAccountError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newAccountNewBalance })
        .eq("id", newAccount.id)
        .eq("profile_id", newAccount.profile_id);

      if (updateOldAccountError || updateNewAccountError) {
        console.error("Error updating account balances for different accounts:", updateOldAccountError, updateNewAccountError);
        showError("Transaction updated, but failed to adjust account balances.");
      }
    }

    const { error: updateError } = await supabase
      .from("expenditure_transactions")
      .update({
        date: editingDate.toISOString(),
        amount: parsedAmount,
        account_id: editingAccount,
        purpose: validatedPurpose,
      })
      .eq("id", editingId)
      .eq("profile_id", tx.profile_id);

    if (updateError) {
      console.error("Error updating expenditure transaction:", updateError);
      showError("Failed to update expenditure transaction.");
      return;
    }

    showSuccess("Expenditure transaction updated successfully!");
    setEditingId(null);
    fetchExpenditureTransactions();
    fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  const handleDeleteTransaction = (tx: ExpenditureTransaction) => {
    setDeletingTransaction(tx);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction || !currentUser) {
      showError("No transaction selected for deletion or user not logged in.");
      return;
    }

    const tx = deletingTransaction;

    const { error: deleteError } = await supabase
      .from("expenditure_transactions")
      .delete()
      .eq("id", tx.id)
      .eq("profile_id", tx.profile_id);

    if (deleteError) {
      console.error("Error deleting expenditure transaction:", deleteError);
      showError("Failed to delete expenditure transaction.");
      return;
    }

    const currentAccount = financialAccounts.find((acc) => acc.id === tx.account_id);
    if (currentAccount) {
      const newBalance = currentAccount.current_balance + tx.amount;
      const { error: updateBalanceError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newBalance })
        .eq("id", tx.account_id)
        .eq("profile_id", currentAccount.profile_id);

      if (updateBalanceError) {
        console.error("Error reverting account balance:", updateBalanceError);
        showError("Expenditure transaction deleted, but failed to revert account balance.");
      }
    }

    showSuccess("Expenditure transaction deleted successfully!");
    setDeletingTransaction(null);
    fetchExpenditureTransactions();
    fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Expenditure</h1>
        <p className="text-lg text-muted-foreground">Loading expenditure data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Expenditure</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Expenditure</h1>
      <p className="text-lg text-muted-foreground">Record and manage all financial outflows.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record New Expenditure */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl lg:col-span-1">
          <CardHeader>
            <CardTitle>Record New Expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Date of Expenditure</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenditureDate && "text-muted-foreground",
                    )}
                    disabled={!canManageExpenditure}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenditureDate ? format(expenditureDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expenditureDate} onSelect={setExpenditureDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenditureAmount}
                onChange={(e) => setExpenditureAmount(e.target.value)}
                disabled={!canManageExpenditure}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Debited From Account</Label>
              <Select value={expenditureAccount} onValueChange={setExpenditureAccount} disabled={!canManageExpenditure}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Financial Accounts</SelectLabel>
                    {financialAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (Balance: {currency.symbol}{account.current_balance.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Expended On Behalf Of Member (Optional)</Label>
              <Select
                value={selectedExpenditureMemberId}
                onValueChange={setSelectedExpenditureMemberId}
                disabled={!canManageExpenditure || members.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Members</SelectLabel>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {members.length === 0 ? <p className="text-sm text-muted-foreground">No members available.</p> : null}
            </div>

            <div className="grid gap-1.5">
              <Label>Purpose/Description</Label>
              <Textarea
                placeholder="e.g., Equipment rental, Travel expenses, Office supplies"
                value={expenditurePurpose}
                onChange={(e) => setExpenditurePurpose(e.target.value)}
                disabled={!canManageExpenditure}
              />
            </div>

            <Button onClick={handlePostExpenditure} className="w-full" disabled={!canManageExpenditure}>
              Post Expenditure
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Expenditure Transactions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{reportSubtitle}</p>
            </div>
            <ReportActions
              title="Expenditure Report"
              subtitle={reportSubtitle}
              columns={["Date", "Member", "Purpose", "Account", "Amount"]}
              rows={reportRows}
              fileName={`Expenditure_${format(new Date(), "yyyy-MM-dd")}`}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="grid gap-1.5 min-w-[260px]">
                <Label>Date range</Label>
                <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
              </div>

              <div className="grid gap-1.5 min-w-[220px]">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="All">All accounts</SelectItem>
                      {financialAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin ? (
                <div className="grid gap-1.5 min-w-[220px]">
                  <Label>Member</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="All">All members</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-1.5 min-w-[120px]">
                <Label>Min</Label>
                <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" type="number" step="0.01" />
              </div>

              <div className="grid gap-1.5 min-w-[120px]">
                <Label>Max</Label>
                <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="0" type="number" step="0.01" />
              </div>

              <div className="grid gap-1.5 flex-1 min-w-[220px]">
                <Label>Search</Label>
                <Input
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Search purpose..."
                />
              </div>
            </div>

            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {isAdmin ? <TableHead>Member</TableHead> : null}
                    <TableHead>Purpose</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canManageExpenditure ? <TableHead className="text-center">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      {isAdmin ? <TableCell>{tx.profile_name || "-"}</TableCell> : null}
                      <TableCell>{tx.purpose}</TableCell>
                      <TableCell>{tx.account_name}</TableCell>
                      <TableCell className="text-right">
                        {currency.symbol}
                        {tx.amount.toFixed(2)}
                      </TableCell>
                      {canManageExpenditure ? (
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}

                  <TableRow className="bg-muted/40 font-bold hover:bg-muted/40">
                    <TableCell colSpan={isAdmin ? 4 : 3}>TOTAL</TableCell>
                    <TableCell className="text-right">
                      {currency.symbol}
                      {totalAmount.toFixed(2)}
                    </TableCell>
                    {canManageExpenditure ? <TableCell /> : null}
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No expenditure transactions found for the selected filters.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}