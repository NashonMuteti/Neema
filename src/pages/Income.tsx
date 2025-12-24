"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { CalendarIcon, Edit, Trash2, Search } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { supabase } from "@/integrations/supabase/client";
import { validateFinancialTransaction } from "@/utils/security";
import { useSystemSettings } from "@/context/SystemSettingsContext"; // Import useSystemSettings

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface IncomeTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  source: string;
  user_id: string;
}

const Income = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context
  
  const { canManageIncome } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageIncome: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageIncome = currentUserPrivileges.includes("Manage Income");
    return { canManageIncome };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = React.useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form State
  const [incomeDate, setIncomeDate] = React.useState<Date | undefined>(new Date());
  const [incomeAmount, setIncomeAmount] = React.useState("");
  const [incomeAccount, setIncomeAccount] = React.useState<string | undefined>(undefined);
  const [incomeSource, setIncomeSource] = React.useState("");
  
  // Filter State
  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()); // 0-indexed
  const [filterMonth, setFilterMonth] = React.useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = React.useState<string>(currentYear.toString());
  const [searchQuery, setSearchQuery] = React.useState("");

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), "MMMM"),
  }));

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
  }));

  const fetchFinancialAccounts = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id, name, current_balance');
      
    if (error) {
      console.error("Error fetching financial accounts:", error);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(data || []);
      if (!incomeAccount && data && data.length > 0) {
        setIncomeAccount(data[0].id); // Set default account if none selected
      }
    }
  }, [incomeAccount]);

  const fetchIncomeTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);
    
    let query = supabase
      .from('income_transactions')
      .select('*, financial_accounts(name)')
      .eq('user_id', currentUser.id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    if (searchQuery) {
      query = query.ilike('source', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching income transactions:", error);
      setError("Failed to load income transactions.");
      showError("Failed to load income transactions.");
      setTransactions([]);
    } else {
      setTransactions(data.map(tx => ({
        id: tx.id,
        date: parseISO(tx.date),
        amount: tx.amount,
        account_id: tx.account_id,
        source: tx.source,
        user_id: tx.user_id,
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  React.useEffect(() => {
    fetchFinancialAccounts();
    fetchIncomeTransactions();
  }, [fetchFinancialAccounts, fetchIncomeTransactions]);

  const handlePostIncome = async () => {
    if (!currentUser) {
      showError("You must be logged in to post income.");
      return;
    }
    
    if (!incomeDate || !incomeAmount || !incomeAccount || !incomeSource) {
      showError("All income fields are required.");
      return;
    }
    
    const amount = parseFloat(incomeAmount);
    
    // Server-side validation
    const validation = validateFinancialTransaction(amount, incomeAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid income amount.");
      return;
    }
    
    const currentAccount = financialAccounts.find(acc => acc.id === incomeAccount);
    if (!currentAccount) {
      showError("Selected account not found.");
      return;
    }
    
    const { error: insertError } = await supabase
      .from('income_transactions')
      .insert({
        date: incomeDate.toISOString(),
        amount,
        account_id: incomeAccount,
        source: incomeSource,
        user_id: currentUser.id,
      });
      
    if (insertError) {
      console.error("Error posting income:", insertError);
      showError("Failed to post income.");
    } else {
      // Update account balance
      const newBalance = currentAccount.current_balance + amount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', incomeAccount);
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Income posted, but failed to update account balance.");
      }
      
      showSuccess("Income posted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
      
      // Reset form
      setIncomeDate(new Date());
      setIncomeAmount("");
      setIncomeAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setIncomeSource("");
    }
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing income transaction:", id);
    showError("Edit functionality is not yet implemented for income transactions.");
  };

  const handleDeleteTransaction = async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete income.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('income_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id); // Ensure only owner can delete
      
    if (deleteError) {
      console.error("Error deleting income transaction:", deleteError);
      showError("Failed to delete income transaction.");
    } else {
      // Revert account balance
      const currentAccount = financialAccounts.find(acc => acc.id === accountId);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance - amount;
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId);
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Income transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Income transaction deleted successfully!");
      fetchIncomeTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
    }
  };

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
      <p className="text-lg text-muted-foreground">
        Record and manage all financial inflows.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Income Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="income-date">Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !incomeDate && "text-muted-foreground"
                    )}
                    disabled={!canManageIncome}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {incomeDate ? format(incomeDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={incomeDate}
                    onSelect={setIncomeDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="income-amount">Amount</Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                disabled={!canManageIncome}
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="income-account">Received Into Account</Label>
              <Select value={incomeAccount} onValueChange={setIncomeAccount} disabled={!canManageIncome}>
                <SelectTrigger id="income-account">
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
              <Label htmlFor="income-source">Source/Description</Label>
              <Textarea
                id="income-source"
                placeholder="e.g., Grant from Film Fund, Donation from Sponsor"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                disabled={!canManageIncome}
              />
            </div>
            
            <Button onClick={handlePostIncome} className="w-full" disabled={!canManageIncome}>
              Post Income
            </Button>
          </CardContent>
        </Card>
        
        {/* Recent Income Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Income Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="grid gap-1.5 flex-1 min-w-[120px]">
                <Label htmlFor="filter-month">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filter-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[100px]">
                <Label htmlFor="filter-year">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger id="filter-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex items-center flex-1 min-w-[180px]">
                <Input
                  type="text"
                  placeholder="Search source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canManageIncome && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{tx.source}</TableCell>
                      <TableCell>{(tx as any).account_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{tx.amount.toFixed(2)}</TableCell>
                      {canManageIncome && (
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id, tx.amount, tx.account_id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No income transactions found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Income;