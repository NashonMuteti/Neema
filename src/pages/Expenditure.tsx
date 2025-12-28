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
import { useQueryClient } from "@tanstack/react-query"; // New import
import DeleteExpenditureDialog from "@/components/expenditure/DeleteExpenditureDialog"; // New import
import EditExpenditureDialog from "@/components/expenditure/EditExpenditureDialog"; // New import

interface FinancialAccount {
  id: string;
  name: string;
  current_balance: number;
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
  profile_id: string; // Changed from user_id to profile_id
  account_name: string; // Joined from financial_accounts
}

const Expenditure = () => {
  const { currentUser } = useAuth();
  const { userRoles: definedRoles } = useUserRoles();
  const { currency } = useSystemSettings();
  const queryClient = useQueryClient(); // Initialize queryClient
  
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
  const [members, setMembers] = React.useState<Member[]>([]); // New state for members
  const [transactions, setTransactions] = React.useState<ExpenditureTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // State for Edit/Delete Dialogs
  const [editingTransaction, setEditingTransaction] = React.useState<ExpenditureTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = React.useState<ExpenditureTransaction | null>(null);
  
  // Form State
  const [expenditureDate, setExpenditureDate] = React.useState<Date | undefined>(new Date());
  const [expenditureAmount, setExpenditureAmount] = React.useState("");
  const [expenditureAccount, setExpenditureAccount] = React.useState<string | undefined>(undefined);
  const [expenditurePurpose, setExpenditurePurpose] = React.useState("");
  const [selectedExpenditureMemberId, setSelectedExpenditureMemberId] = React.useState<string | undefined>(undefined); // New state for member
  
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

  const invalidateDashboardQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['financialData'] });
    queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardProjects'] });
    queryClient.invalidateQueries({ queryKey: ['contributionsProgress'] });
    queryClient.invalidateQueries({ queryKey: ['financialAccounts'] });
  };

  const fetchFinancialAccountsAndMembers = React.useCallback(async () => {
    let query = supabase
      .from('financial_accounts')
      .select('id, name, current_balance, initial_balance, profile_id');
      
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
    if (!isAdmin && currentUser) {
      query = query.eq('profile_id', currentUser.id);
    }
      
    const { data: accountsData, error: accountsError } = await query;
      
    if (accountsError) {
      console.error("Error fetching financial accounts:", accountsError);
      showError("Failed to load financial accounts.");
    } else {
      setFinancialAccounts(accountsData || []);
      queryClient.invalidateQueries({ queryKey: ['financialAccounts', currentUser?.id] });
    }

    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      showError("Failed to load members for expenditure association.");
    } else {
      setMembers(membersData || []);
    }
  }, [currentUser, queryClient]);

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
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString());
      
    const isAdmin = currentUser.role === "Admin" || currentUser.role === "Super Admin";
    if (!isAdmin) {
      query = query.eq('profile_id', currentUser.id);
    }
      
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
        profile_id: tx.profile_id,
        account_name: (tx.financial_accounts as { name: string })?.name || 'Unknown Account'
      })));
    }
    
    setLoading(false);
  }, [currentUser, filterMonth, filterYear, searchQuery]);

  React.useEffect(() => {
    fetchFinancialAccountsAndMembers();
    fetchExpenditureTransactions();
  }, [fetchFinancialAccountsAndMembers, fetchExpenditureTransactions]);

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

    const transactionProfileId = selectedExpenditureMemberId || currentUser.id;
    
    const { error: insertError } = await supabase
      .from('expenditure_transactions')
      .insert({
        date: expenditureDate.toISOString(),
        amount,
        account_id: expenditureAccount,
        purpose: expenditurePurpose,
        profile_id: transactionProfileId,
      });
      
    if (insertError) {
      console.error("Error posting expenditure:", insertError);
      showError("Failed to post expenditure.");
    } else {
      const newBalance = currentAccount.current_balance - amount;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', expenditureAccount)
        .eq('profile_id', currentUser.id);
        
      if (updateBalanceError) {
        console.error("Error updating account balance:", updateBalanceError);
        showError("Expenditure posted, but failed to update account balance.");
      }
      
      showSuccess("Expenditure posted successfully!");
      fetchExpenditureTransactions();
      fetchFinancialAccountsAndMembers();
      invalidateDashboardQueries(); // Invalidate dashboard queries
      
      // Reset form
      setExpenditureDate(new Date());
      setExpenditureAmount("");
      setExpenditureAccount(financialAccounts.length > 0 ? financialAccounts[0].id : undefined);
      setExpenditurePurpose("");
      setSelectedExpenditureMemberId(undefined);
    }
  };

  const handleEditTransaction = (transaction: ExpenditureTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleSaveEditedTransaction = async (updatedTx: ExpenditureTransaction) => {
    if (!currentUser) {
      showError("You must be logged in to edit expenditure.");
      return;
    }

    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) {
      showError("Original transaction not found.");
      return;
    }

    const parsedAmount = parseFloat(updatedTx.amount.toString());
    const validation = validateFinancialTransaction(parsedAmount, updatedTx.account_id, currentUser.id);
    if (!validation.isValid) {
      showError(validation.error || "Invalid expenditure amount.");
      return;
    }

    // Optimistically update local state
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));

    const { error: updateTxError } = await supabase
      .from('expenditure_transactions')
      .update({
        date: updatedTx.date.toISOString(),
        amount: parsedAmount,
        account_id: updatedTx.account_id,
        purpose: updatedTx.purpose,
        profile_id: updatedTx.profile_id,
      })
      .eq('id', updatedTx.id)
      .eq('profile_id', currentUser.id);

    if (updateTxError) {
      console.error("Error updating expenditure transaction:", updateTxError);
      showError("Failed to update expenditure transaction.");
      await fetchExpenditureTransactions(); // Revert optimistic update
      return;
    }

    const oldAccount = financialAccounts.find(acc => acc.id === oldTx.account_id);
    const newAccount = financialAccounts.find(acc => acc.id === updatedTx.account_id);

    if (!oldAccount || !newAccount) {
      showError("One or more financial accounts not found for balance adjustment.");
      return;
    }

    if (oldTx.account_id === updatedTx.account_id) {
      const amountDifference = oldTx.amount - parsedAmount; // Expenditure: old - new
      const newBalance = oldAccount.current_balance + amountDifference;
      const { error: updateBalanceError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newBalance })
        .eq('id', oldAccount.id)
        .eq('profile_id', currentUser.id);
      if (updateBalanceError) {
        console.error("Error updating account balance for same account:", updateBalanceError);
        showError("Transaction updated, but failed to adjust account balance.");
      }
    } else {
      const oldAccountNewBalance = oldAccount.current_balance + oldTx.amount; // Add back to old account
      const newAccountNewBalance = newAccount.current_balance - parsedAmount; // Deduct from new account

      const { error: updateOldAccountError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: oldAccountNewBalance })
        .eq('id', oldAccount.id)
        .eq('profile_id', currentUser.id);

      const { error: updateNewAccountError } = await supabase
        .from('financial_accounts')
        .update({ current_balance: newAccountNewBalance })
        .eq('id', newAccount.id)
        .eq('profile_id', currentUser.id);

      if (updateOldAccountError || updateNewAccountError) {
        console.error("Error updating account balances for different accounts:", updateOldAccountError, updateNewAccountError);
        showError("Transaction updated, but failed to adjust account balances.");
      }
    }

    showSuccess("Expenditure transaction updated successfully!");
    setEditingTransaction(null);
    await fetchExpenditureTransactions();
    await fetchFinancialAccountsAndMembers();
    invalidateDashboardQueries();
  };

  const handleDeleteTransaction = (transaction: ExpenditureTransaction) => {
    setDeletingTransaction(transaction);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction || !currentUser) {
      showError("No transaction selected for deletion or user not logged in.");
      return;
    }
    
    const { id, amount, account_id } = deletingTransaction;

    // Optimistically update local state
    setTransactions(prev => prev.filter(t => t.id !== id));

    const { error: deleteError } = await supabase
      .from('expenditure_transactions')
      .delete()
      .eq('id', id)
      .eq('profile_id', currentUser.id);
      
    if (deleteError) {
      console.error("Error deleting expenditure transaction:", deleteError);
      showError("Failed to delete expenditure transaction.");
      await fetchExpenditureTransactions(); // Revert optimistic update
    } else {
      const currentAccount = financialAccounts.find(acc => acc.id === account_id);
      if (currentAccount) {
        const newBalance = currentAccount.current_balance + amount; // Add back to account
        const { error: updateBalanceError } = await supabase
          .from('financial_accounts')
          .update({ current_balance: newBalance })
          .eq('id', account_id)
          .eq('profile_id', currentUser.id);
          
        if (updateBalanceError) {
          console.error("Error reverting account balance:", updateBalanceError);
          showError("Expenditure transaction deleted, but failed to revert account balance.");
        }
      }
      
      showSuccess("Expenditure transaction deleted successfully!");
      setDeletingTransaction(null);
      await fetchExpenditureTransactions();
      await fetchFinancialAccountsAndMembers();
      invalidateDashboardQueries();
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
              <Label htmlFor="expenditure-member">Expended On Behalf Of Member (Optional)</Label>
              <Select value={selectedExpenditureMemberId} onValueChange={setSelectedExpenditureMemberId} disabled={!canManageExpenditure || members.length === 0}>
                <SelectTrigger id="expenditure-member">
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
              {members.length === 0 && <p className="text-sm text-muted-foreground">No members available.</p>}
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
                            <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx)}>
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

      {editingTransaction && (
        <EditExpenditureDialog
          isOpen={!!editingTransaction}
          setIsOpen={() => setEditingTransaction(null)}
          initialData={editingTransaction}
          onSave={handleSaveEditedTransaction}
          financialAccounts={financialAccounts}
          members={members}
          canManageExpenditure={canManageExpenditure}
          currency={currency}
        />
      )}

      {deletingTransaction && (
        <DeleteExpenditureDialog
          isOpen={!!deletingTransaction}
          setIsOpen={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          onConfirm={handleConfirmDeleteTransaction}
          currency={currency}
        />
      )}
    </div>
  );
};

export default Expenditure;