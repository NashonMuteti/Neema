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

import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable, { IncomeTransactionRow } from "@/components/income/IncomeTable";
import EditIncomeDialog from "@/components/income/EditIncomeDialog";
import DeleteIncomeDialog from "@/components/income/DeleteIncomeDialog";
import { FinancialAccount, Member } from "@/types/common";
import { useDebounce } from "@/hooks/use-debounce";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/reports/DateRangePicker";
import ReportActions from "@/components/reports/ReportActions";

interface IncomeTransaction extends IncomeTransactionRow {
  account_id: string;
  profile_id: string;
}

export default function Income() {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const { canManageIncome } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageIncome: false };
    }

    const roleDef = definedRoles.find((r) => r.name === currentUser.role);
    const privileges = roleDef?.menuPrivileges || [];
    return { canManageIncome: privileges.includes("Manage Income") };
  }, [currentUser, definedRoles]);

  const defaultRange = React.useMemo<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [transactions, setTransactions] = React.useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = React.useState<IncomeTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = React.useState<IncomeTransaction | null>(null);

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
      .select("id, name, current_balance, initial_balance, profile_id, can_receive_payments")
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
      setFinancialAccounts((accountsData || []) as FinancialAccount[]);
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

  const fetchIncomeTransactions = React.useCallback(async () => {
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
      .from("income_transactions")
      .select(
        `
        id,
        date,
        amount,
        source,
        account_id,
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
      query = query.ilike("source", `%${q}%`);
    }

    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    if (min !== null && Number.isFinite(min)) query = query.gte("amount", min);
    if (max !== null && Number.isFinite(max)) query = query.lte("amount", max);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching income transactions:", error);
      setError("Failed to load income transactions.");
      showError("Failed to load income transactions.");
      setTransactions([]);
      setLoading(false);
      return;
    }

    const normalized: IncomeTransaction[] = (data || []).map((t: any) => ({
      id: t.id,
      date: parseISO(t.date),
      amount: Number(t.amount || 0),
      source: t.source,
      account_id: t.account_id,
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
    fetchIncomeTransactions();
  }, [fetchIncomeTransactions]);

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["financialData"] });
    queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
  };

  const handlePostIncome = async (data: {
    incomeDate: Date;
    incomeAmount: number;
    incomeAccount: string;
    incomeSource: string;
    selectedIncomeMemberId?: string;
  }) => {
    if (!canManageIncome) {
      showError("You do not have permission to record income.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in.");
      return;
    }

    const validation = validateFinancialTransaction(data.incomeAmount, data.incomeAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }

    const { data: accountData, error: accountError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", data.incomeAccount)
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

    const profileId = data.selectedIncomeMemberId || currentUser.id;

    const { error: insertError } = await supabase.from("income_transactions").insert({
      date: data.incomeDate.toISOString(),
      amount: data.incomeAmount,
      account_id: data.incomeAccount,
      source: data.incomeSource.trim(),
      profile_id: profileId,
      pledge_id: null,
    });

    if (insertError) {
      console.error("Error posting income:", insertError);
      showError("Failed to post income.");
      return;
    }

    const newBalance = accountData.current_balance + data.incomeAmount;
    const { error: updateBalanceError } = await supabase
      .from("financial_accounts")
      .update({ current_balance: newBalance })
      .eq("id", data.incomeAccount)
      .eq("profile_id", accountData.profile_id);

    if (updateBalanceError) {
      console.error("Error updating account balance:", updateBalanceError);
      showError("Income posted, but failed to update account balance.");
    }

    showSuccess("Income posted successfully!");
    await fetchIncomeTransactions();
    await fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  const handleEditTransaction = async (updatedTx: {
    id: string;
    date: Date;
    amount: number;
    account_id: string;
    source: string;
    profile_id: string;
    account_name: string;
  }) => {
    if (!currentUser) {
      showError("You must be logged in to edit income.");
      return;
    }

    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) {
      showError("Original transaction not found.");
      return;
    }

    const validation = validateFinancialTransaction(updatedTx.amount, updatedTx.account_id, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }

    const { data: oldAccount, error: oldAccError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", oldTx.account_id)
      .single();

    const { data: newAccount, error: newAccError } = await supabase
      .from("financial_accounts")
      .select("id, current_balance, profile_id")
      .eq("id", updatedTx.account_id)
      .single();

    if (oldAccError || newAccError || !oldAccount || !newAccount) {
      showError("Failed to fetch account details.");
      return;
    }

    if (!isAdmin && (oldAccount.profile_id !== currentUser.id || newAccount.profile_id !== currentUser.id)) {
      showError("You can only use your own account.");
      return;
    }

    const { error: updateTxError } = await supabase
      .from("income_transactions")
      .update({
        date: updatedTx.date.toISOString(),
        amount: updatedTx.amount,
        account_id: updatedTx.account_id,
        source: updatedTx.source.trim(),
        profile_id: updatedTx.profile_id,
      })
      .eq("id", updatedTx.id)
      .eq("profile_id", oldTx.profile_id);

    if (updateTxError) {
      console.error("Error updating income transaction:", updateTxError);
      showError("Failed to update income transaction.");
      return;
    }

    if (oldTx.account_id === updatedTx.account_id) {
      const amountDifference = updatedTx.amount - oldTx.amount;
      const { error: updateBalanceError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: oldAccount.current_balance + amountDifference })
        .eq("id", oldAccount.id)
        .eq("profile_id", oldAccount.profile_id);

      if (updateBalanceError) {
        console.error("Error updating account balance for same account:", updateBalanceError);
        showError("Transaction updated, but failed to adjust account balance.");
      }
    } else {
      const { error: updateOldAccountError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: oldAccount.current_balance - oldTx.amount })
        .eq("id", oldAccount.id)
        .eq("profile_id", oldAccount.profile_id);

      const { error: updateNewAccountError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newAccount.current_balance + updatedTx.amount })
        .eq("id", newAccount.id)
        .eq("profile_id", newAccount.profile_id);

      if (updateOldAccountError || updateNewAccountError) {
        console.error(
          "Error updating account balances for different accounts:",
          updateOldAccountError,
          updateNewAccountError,
        );
        showError("Transaction updated, but failed to adjust account balances.");
      }
    }

    showSuccess("Income transaction updated successfully!");
    setEditingTransaction(null);
    await fetchIncomeTransactions();
    await fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction || !currentUser) {
      showError("No transaction selected for deletion or user not logged in.");
      return;
    }

    const { id, amount, account_id, profile_id } = deletingTransaction;

    const { error: deleteError } = await supabase
      .from("income_transactions")
      .delete()
      .eq("id", id)
      .eq("profile_id", profile_id);

    if (deleteError) {
      console.error("Error deleting income transaction:", deleteError);
      showError("Failed to delete income transaction.");
      return;
    }

    const currentAccount = financialAccounts.find((acc) => acc.id === account_id);
    if (currentAccount) {
      const newBalance = currentAccount.current_balance - amount;
      const { error: updateBalanceError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newBalance })
        .eq("id", account_id)
        .eq("profile_id", currentAccount.profile_id);

      if (updateBalanceError) {
        console.error("Error reverting account balance:", updateBalanceError);
        showError("Income transaction deleted, but failed to revert account balance.");
      }
    }

    showSuccess("Income transaction deleted successfully!");
    setDeletingTransaction(null);
    await fetchIncomeTransactions();
    await fetchFinancialAccountsAndMembers();
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
      t.source,
      t.account_name,
      `${currency.symbol}${t.amount.toFixed(2)}`,
    ]);

    const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    return [...base, ["TOTAL", "", "", "", `${currency.symbol}${total.toFixed(2)}`]];
  }, [transactions, currency.symbol]);

  const totalAmount = React.useMemo(() => transactions.reduce((sum, t) => sum + (t.amount || 0), 0), [transactions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Income</h1>
        <p className="text-lg text-muted-foreground">Loading income data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Income</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Income</h1>
      <p className="text-lg text-muted-foreground">Record and manage all financial inflows.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <IncomeForm
            financialAccounts={financialAccounts}
            members={members}
            canManageIncome={canManageIncome}
            onPostIncome={handlePostIncome}
          />
        </div>

        <div className="lg:col-span-2">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Income Transactions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{reportSubtitle}</p>
              </div>
              <ReportActions
                title="Income Report"
                subtitle={reportSubtitle}
                columns={["Date", "Member", "Source", "Account", "Amount"]}
                rows={reportRows}
                fileName={`Income_${format(new Date(), "yyyy-MM-dd")}`}
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
                    placeholder="Search source..."
                  />
                </div>
              </div>

              <IncomeTable
                transactions={transactions}
                canManageIncome={canManageIncome}
                onEditTransaction={(t) => setEditingTransaction(t as IncomeTransaction)}
                onDeleteTransaction={(t) => setDeletingTransaction(t as IncomeTransaction)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {editingTransaction ? (
        <EditIncomeDialog
          isOpen={!!editingTransaction}
          setIsOpen={() => setEditingTransaction(null)}
          initialData={editingTransaction as any}
          financialAccounts={financialAccounts}
          members={members}
          onSave={handleEditTransaction}
          canManageIncome={canManageIncome}
          currency={currency}
        />
      ) : null}

      {deletingTransaction ? (
        <DeleteIncomeDialog
          isOpen={!!deletingTransaction}
          setIsOpen={() => setDeletingTransaction(null)}
          transaction={deletingTransaction as any}
          onConfirm={() => void handleConfirmDeleteTransaction()}
          currency={currency}
        />
      ) : null}
    </div>
  );
}