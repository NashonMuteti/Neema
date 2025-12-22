"use client";
import React from "react";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable from "@/components/income/IncomeTable";
import { useIncomeManagement } from "@/hooks/use-income-management";

const Income = () => {
  const {
    financialAccounts,
    transactions,
    loading,
    error,
    canManageIncome,
    incomeDate,
    setIncomeDate,
    incomeAmount,
    setIncomeAmount,
    incomeAccount,
    setIncomeAccount,
    incomeSource,
    setIncomeSource,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostIncome,
    handleEditTransaction,
    handleDeleteTransaction,
  } = useIncomeManagement();

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
        <IncomeForm
          financialAccounts={financialAccounts}
          incomeDate={incomeDate}
          setIncomeDate={setIncomeDate}
          incomeAmount={incomeAmount}
          setIncomeAmount={setIncomeAmount}
          incomeAccount={incomeAccount}
          setIncomeAccount={setIncomeAccount}
          incomeSource={incomeSource}
          setIncomeSource={setIncomeSource}
          handlePostIncome={handlePostIncome}
          canManageIncome={canManageIncome}
        />
        
        <IncomeTable
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
          canManageIncome={canManageIncome}
        />
      </div>
    </div>
  );
};

export default Income;