"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { Trash2 } from "lucide-react";

interface ClearSampleDataDialogProps {
  onClearData: (selectedTables: string[]) => void;
}

const dummyTables = [
  { id: "members", name: "Members" },
  { id: "projects", name: "Projects" },
  { id: "contributions", name: "Contributions" },
  { id: "pledges", name: "Pledges" },
  { id: "boardMembers", name: "Board Members" },
  { id: "financialTransactions", name: "Financial Transactions (Income/Expenditure)" },
];

const ClearSampleDataDialog: React.FC<ClearSampleDataDialogProps> = ({ onClearData }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTables, setSelectedTables] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (isOpen) {
      // Reset selections when dialog opens
      const initialSelections: Record<string, boolean> = {};
      dummyTables.forEach(table => {
        initialSelections[table.id] = false;
      });
      setSelectedTables(initialSelections);
    }
  }, [isOpen]);

  const handleCheckboxChange = (tableId: string, checked: boolean | "indeterminate") => {
    setSelectedTables(prev => ({
      ...prev,
      [tableId]: checked === true,
    }));
  };

  const handleClear = () => {
    const tablesToClear = Object.keys(selectedTables).filter(tableId => selectedTables[tableId]);

    if (tablesToClear.length === 0) {
      showError("Please select at least one table to clear.");
      return;
    }

    onClearData(tablesToClear);
    showSuccess(`Sample data cleared for: ${tablesToClear.map(id => dummyTables.find(t => t.id === id)?.name || id).join(", ")}.`);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Clear Sample Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Clear Sample Database Data</DialogTitle>
          <DialogDescription>
            Select the tables from which you want to clear sample data. This action is irreversible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choose which data sets to remove. Only sample data will be affected.
          </p>
          <div className="space-y-2">
            {dummyTables.map(table => (
              <div key={table.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`clear-${table.id}`}
                  checked={selectedTables[table.id]}
                  onCheckedChange={(checked) => handleCheckboxChange(table.id, checked)}
                />
                <Label htmlFor={`clear-${table.id}`}>{table.name}</Label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear Selected Data
          </Button>
        </div>
        <p className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive mt-2">
          <span className="font-bold">Warning:</span> This action will permanently delete data from the selected tables.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ClearSampleDataDialog;