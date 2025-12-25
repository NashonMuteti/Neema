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

interface ExpenditureTransaction {
  id: string;
  date: Date;
  amount: number;
  account_id: string;
  purpose: string;
  profile_id: string; // Changed from user_id to profile_id
}

const Expenditure = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings(); // Use currency from context
  
  const { canManageExpenditure } = React.useMemo(() => {
    if (!currentUser || !definedRoles) {
      return { canManageExpenditure: false };
    }
    
    const currentUserRoleDefinition = definedRoles.find(role => role.name === currentUser.role);
    const currentUserPrivileges = currentUserRoleDefinition?.menuPrivileges || [];
    const canManageExpenditure = currentUserPrivileges.includes("Manage Expenditure");
    return { canManageExpenditure };
  }, [currentUser, definedRoles]);

  const [financialAccounts, setFinancialAccounts] = React.useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = React.useState<ExpenditureTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form State
  const [expenditureDate, setExpenditureDate] = React.useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = React.useState("");
  const [expenditureAccount, setExpenditureAccount] = React.useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = React.useState("");
  
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
      .select('id, name, current_balance')
      .eq('profile_id', currentUser?.id); // Filter by profile_id
      
    if (error) {
      console.error("Error fetching financial accounts:", error);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(data || []);
      if (!expenditureAccount && data && data.length > 0) {
        setExpenditureAccount(data[0].id); // Set default account if none selected
      }
    }
  }, [expenditureAccount, currentUser]);

  const fetchExpenditureTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    const startOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    const endOfMonth = new Date(parseInt(filterYear), parseInt(filterMonth) + 1, 0, 23, 59, 59);
    
    let query = supabase
      .from('expenditure_transactions')
      .select('*, financial_accounts(name)')
      .eq('profile_id', currentUser.id) // Changed to profile_id
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    if (searchQuery) {
      query = query.ilike('purpose', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error("Error fetching expenditure transactions:", error);
      setError("Failed to load expenditure transactions.");
      showError("Failed to load expenditure transactions.");
      setTransactions([]);
    } else {
      setTransactions(data.map(tx => ({
        id: tx.id,
        date: parseISO(tx.date),
        amount: tx.amount,
        account_id: tx.account_id,
        purpose: tx.purpose,
        profile_id: tx.profile_id, // Changed to profile_id
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  React.useEffect(() => {
    fetchFinancialAccounts();
    fetchExpenditureTransactions();
  }, [fetchFinancialAccounts, fetchExpenditureTransactions]);

  const handlePostExpenditure = async () => {
    if (!currentUser) {
      showError("You must be logged in to post expenditure.");
      return;
    }
    
    if (!expenditureDate || !expenditureAmount || !expenditureAccount || !expenditurePurpose) {
      showError("All expenditure fields are required.");
      return;
    }
    
    const amount = parseFloat(expenditureAmount);
    
    // Server-side validation
    const validation = validateFinancialTransaction(amount, expenditureAccount, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expenditure amount.");
      return;
    }
    
    const currentAccount = financialAccounts.find(acc => acc.id === expenditureAccount);
    if (!currentAccount) {
      showError("Selected account not found.");
      return;
    }
    
    if (currentAccount.current_balance < amount) {
      showError("Insufficient balance in the selected account.");
      return;
    }
    
    const { error: insertError } = await supabase
      .from('expenditure_transactions')
      .insert({
        date: expenditureDate.toISOString(),
        amount,
        account_id: expenditureAccount,
        purpose: expenditurePurpose,
        profile_id: currentUser.id, // Changed to profile_id
      });
      
    if (insertError) {
      console.error("Error posting expenditure:", insertError);
      showError("Failed to post expenditure.");
    } else {
      // Update account balance
      const newBalance = currentAccount.current_balance - amount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', expenditureAccount)
        .eq('profile_id', currentUser.id); // Ensure user owns the account
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Expenditure posted, but failed to update account balance.");
      }
      
      showSuccess("Expenditure posted successfully!");
      fetchExpenditureTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
      
      // Reset form
      setExpenditureDate(new Date());
      setExpenditureAmount("");
      setExpenditureAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setExpenditurePurpose("");
    }
  };

  const handleEditTransaction = (id: string) => {
    // In a real app, this would open an edit dialog pre-filled with transaction data
    console.log("Editing expenditure transaction:", id);
    showError("Edit functionality is not yet implemented for expenditure transactions.");
  };

  const handleDeleteTransaction = async (id: string, amount: number, accountId: string) => {
    if (!currentUser) {
      showError("You must be logged in to delete expenditure.");
      return;
    }
    
    const { error: deleteError } = await supabase
      .from('expenditure_transactions')
      .delete()
      .eq('id', id)
      .eq('profile_id', currentUser.id); // Ensure only owner can delete
      
    if (deleteError) {
      console.error("Error deleting expenditure transaction:", deleteError);
      showError("Failed to delete expenditure transaction.");
    } else {
      // Revert account balance
      const currentAccount = financialAccounts.find(acc => acc.id === accountId);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance + amount;
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId)
          .eq('profile_id', currentUser.id); // Ensure user owns the account
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Expenditure transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Expenditure transaction deleted successfully!");
      fetchExpenditureTransactions();
      fetchFinancialAccounts(); // Re-fetch accounts to update balances
    }
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
      <p className="text-lg text-muted-foreground">
        Record and manage all financial outflows.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Expenditure Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Record New Expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-date">Date of Expenditure</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenditureDate && "text-muted-foreground"
                    )}
                    disabled={!canManageExpenditure}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenditureDate ? format(expenditureDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenditureDate}
                    onSelect={setExpenditureDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-amount">Amount</Label>
              <Input
                id="expenditure-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenditureAmount}
                onChange={(e) => setExpenditureAmount(e.target.value)}
                disabled={!canManageExpenditure}
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="expenditure-account">Debited From Account</Label>
              <Select value={expenditureAccount} onValueChange={setExpenditureAccount} disabled={!canManageExpenditure}>
                <SelectTrigger id="expenditure-account">
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
              <Label htmlFor="expenditure-purpose">Purpose/Description</Label>
              <Textarea
                id="expenditure-purpose"
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
        
        {/* Recent Expenditure Transactions Card */}
        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Expenditure Transactions</CardTitle>
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
                  placeholder="Search purpose..."
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
                    <TableHead>Purpose</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canManageExpenditure && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.date, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{tx.purpose}</TableCell>
                      <TableCell>{(tx as any).account_name}</TableCell>
                      <TableCell className="text-right">{currency.symbol}{tx.amount.toFixed(2)}</TableCell>
                      {canManageExpenditure && (
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
              <p className="text-muted-foreground">No expenditure transactions found for the selected period or matching your search.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Expenditure;