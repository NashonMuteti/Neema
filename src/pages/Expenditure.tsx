"use client";
import React from "react";
import ExpenditureForm from "@/components/expenditure/ExpenditureForm";
import ExpenditureTable from "@/components/expenditure/ExpenditureTable";
import { useExpenditureManagement } from "@/hooks/use-expenditure-management";

const Expenditure = () => {
  const {
    financialAccounts,
    transactions,
    loading,
    error,
    canManageExpenditure,
    expenditureDate,
    setExpenditureDate,
    expenditureAmount,
    setExpenditureAmount,
    expenditureAccount,
    setExpenditureAccount,
    expenditurePurpose,
    setExpenditurePurpose,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    handlePostExpenditure,
    handleEditTransaction,
    handleDeleteTransaction,
  } = useExpenditureManagement();

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
        <ExpenditureForm
          financialAccounts={financialAccounts}
          expenditureDate={expenditureDate}
          setExpenditureDate={setExpenditureDate}
          expenditureAmount={expenditureAmount}
          setExpenditureAmount={setExpenditureAmount}
          expenditureAccount={expenditureAccount}
          setExpenditureAccount={setExpenditureAccount}
          expenditurePurpose={expenditurePurpose}
          setExpenditurePurpose={expenditurePurpose}
          handlePostExpenditure={handlePostExpenditure}
          canManageExpenditure={canManageExpenditure}
        />
        
        <ExpenditureTable
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
          canManageExpenditure={canManageExpenditure}
        />
      </div>
    </div>
  );
};

export default Expenditure;