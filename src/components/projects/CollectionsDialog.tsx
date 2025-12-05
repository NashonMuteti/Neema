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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Upload, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

interface MemberContribution {
  id: string;
  name: string;
  amount: number;
}

interface CollectionsDialogProps {
  projectId: string;
  projectName: string;
  onSaveCollections: (data: { date: Date; contributions: MemberContribution[]; paymentMethod: string }) => void;
}

const dummyMembers = [
  { id: "m1", name: "Alice Johnson" },
  { id: "m2", name: "Bob Williams" },
  { id: "m3", name: "Charlie Brown" },
];

const CollectionsDialog: React.FC<CollectionsDialogProps> = ({ projectId, projectName, onSaveCollections }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [contributions, setContributions] = React.useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = React.useState("cash");

  React.useEffect(() => {
    if (isOpen) {
      setDate(new Date());
      setContributions({});
      setPaymentMethod("cash");
    }
  }, [isOpen]);

  const handleContributionChange = (memberId: string, value: string) => {
    setContributions((prev) => ({ ...prev, [memberId]: value }));
  };

  const handlePost = () => {
    if (!date) {
      showError("Contribution date is required.");
      return;
    }

    const validContributions: MemberContribution[] = dummyMembers
      .map((member) => ({
        id: member.id,
        name: member.name,
        amount: parseFloat(contributions[member.id] || "0"),
      }))
      .filter((c) => c.amount > 0);

    if (validContributions.length === 0) {
      showError("Please enter at least one contribution.");
      return;
    }

    onSaveCollections({ date, contributions: validContributions, paymentMethod });
    showSuccess("Collections posted successfully!");
    setIsOpen(false);
  };

  const handleExcelUpload = () => {
    showSuccess("Excel upload initiated (placeholder).");
    console.log("Uploading Excel for project:", projectName);
    // Actual implementation would involve file input and parsing
  };

  const handleExcelDownload = () => {
    showSuccess("Excel download initiated (placeholder).");
    console.log("Downloading Excel for project:", projectName);
    // Actual implementation would involve generating and downloading a file
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Collections</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Collections for {projectName}</DialogTitle>
          <DialogDescription>
            Record contributions from members for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="contribution-date">Contribution Date:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleExcelUpload}>
                <Upload className="mr-2 h-4 w-4" /> Upload Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExcelDownload}>
                <Download className="mr-2 h-4 w-4" /> Download Excel
              </Button>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">Member Contributions</h3>
          <div className="space-y-2">
            {dummyMembers.map((member) => (
              <div key={member.id} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`member-${member.id}`} className="text-right">
                  {member.name}
                </Label>
                <Input
                  id={`member-${member.id}`}
                  type="number"
                  value={contributions[member.id] || ""}
                  onChange={(e) => handleContributionChange(member.id, e.target.value)}
                  className="col-span-3"
                  placeholder="Amount"
                />
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold mt-4">Payment Method</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="r1" />
              <Label htmlFor="r1">Cash</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank-transfer" id="r2" />
              <Label htmlFor="r2">Bank Transfer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="online-payment" id="r3" />
              <Label htmlFor="r3">Online Payment</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="flex justify-end">
          <Button onClick={handlePost}>Post Collections</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Note: Excel upload/download and actual payment processing require backend integration.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionsDialog;