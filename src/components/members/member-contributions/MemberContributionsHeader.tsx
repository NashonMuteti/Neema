"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface MemberContributionsHeaderProps {
  memberName: string;
}

const MemberContributionsHeader: React.FC<MemberContributionsHeaderProps> = ({ memberName }) => {
  return (
    <div className="flex items-center gap-4">
      <Link to="/members">
        <Button variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <h1 className="text-3xl font-bold text-foreground">{memberName}'s Contributions</h1>
    </div>
  );
};

export default MemberContributionsHeader;