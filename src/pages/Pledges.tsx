"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePledgeManagement } from "@/hooks/use-pledge-management";
import PledgeForm from "@/components/pledges/PledgeForm";
import PledgeFilters from "@/components/pledges/PledgeFilters";
import PledgeTable from "@/components/pledges/PledgeTable";

const Pledges = () => {
  const {
    members,
    projects,
    pledges,
    loading,
    error,
    canManagePledges,
    newPledgeMemberId,
    setNewPledgeMemberId,
    newPledgeProjectId,
    setNewPledgeProjectId,
    newPledgeAmount,
    setNewPledgeAmount,
    newPledgeDueDate,
    setNewPledgeDueDate,
    filterStatus,
    setFilterStatus,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    searchQuery,
    setSearchQuery,
    months,
    years,
    getPledgeStatus,
    getStatusBadgeClasses,
    handleRecordPledge,
    handleEditPledge,
    handleDeletePledge,
    handleMarkAsPaid,
  } = usePledgeManagement();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-muted-foreground">Loading pledges data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Manage Pledges</h1>
      <p className="text-lg text-muted-foreground">
        Record and track financial commitments (pledges) from members for various projects.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PledgeForm
          members={members}
          projects={projects}
          newPledgeMemberId={newPledgeMemberId}
          setNewPledgeMemberId={setNewPledgeMemberId}
          newPledgeProjectId={newPledgeProjectId}
          setNewPledgeProjectId={setNewPledgeProjectId}
          newPledgeAmount={newPledgeAmount}
          setNewPledgeAmount={setNewPledgeAmount}
          newPledgeDueDate={newPledgeDueDate}
          setNewPledgeDueDate={setNewPledgeDueDate}
          handleRecordPledge={handleRecordPledge}
          canManagePledges={canManagePledges}
        />

        <Card className="transition-all duration-300 ease-in-out hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Pledges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PledgeFilters
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              months={months}
              years={years}
            />
            <PledgeTable
              pledges={pledges}
              members={members}
              projects={projects}
              canManagePledges={canManagePledges}
              handleMarkAsPaid={handleMarkAsPaid}
              handleEditPledge={handleEditPledge}
              handleDeletePledge={handleDeletePledge}
              getPledgeStatus={getPledgeStatus}
              getStatusBadgeClasses={getStatusBadgeClasses}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pledges;