"use client";
import React from "react";
import PettyCashForm from "@/components/petty-cash/PettyCashForm";
import PettyCashTable from "@/components/petty-cash/PettyCashTable";
import { usePettyCashManagement } from "@/hooks/use-petty-cash-management";

const PettyCash = () => {
  const {
    financialAccounts,
    transactions,
    loading,
    error,
    canManagePettyCash,
    expenseDate,
    setExpenseDate,
    expenseAmount,
    setExpenseAmount,
    expenseAccount,
    setExpenseAccount,
    expensePurpose,
    setExpensePurpose,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostExpense,
    handleEditTransaction,
    handleDeleteTransaction,
  } = usePettyCashManagement();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures</h1>
        <p className="text-lg text-muted-foreground">Loading petty cash data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Petty Cash Expenditures</h1>
      <p className="text-lg text-muted-foreground">
        Track and manage all petty cash expenses.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PettyCashForm
          financialAccounts={financialAccounts}
          expenseDate={expenseDate}
          setExpenseDate={setExpenseDate}
          expenseAmount={expenseAmount}
          setExpenseAmount={setExpenseAmount}
          expenseAccount={expenseAccount}
          setExpenseAccount={setExpenseAccount}
          expensePurpose={expensePurpose}
          setExpensePurpose={setExpensePurpose}
          handlePostExpense={handlePostExpense}
          canManagePettyCash={canManagePettyCash}
        />
        
        <PettyCashTable
          transactions={transactions}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          months={months}
          years={years}
          handleEditTransaction={handleEditTransaction}
          handleDeleteTransaction={handleDeleteTransaction}
          canManagePettyCash={canManagePettyCash}
        />
      </div>
    </div>
  );
};

export default PettyCash;