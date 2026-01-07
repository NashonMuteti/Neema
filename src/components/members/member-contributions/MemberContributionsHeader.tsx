"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberContributionsHeaderProps {
  memberName: string;
  memberImageUrl?: string; // New prop for member's image URL
}

const MemberContributionsHeader: React.FC<MemberContributionsHeaderProps> = ({ memberName, memberImageUrl }) => {
  return (
    <div className="flex items-center gap-4">
      <Link to="/members">
        <Button variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <Avatar className="h-9 w-9">
        {memberImageUrl ? (
          <AvatarImage src={memberImageUrl} alt={memberName} />
        ) : (
          <AvatarFallback>
            <UserIcon className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>
      <h1 className="text-3xl font-bold text-foreground">{memberName}'s Contributions</h1>
    </div>
  );
};

export default MemberContributionsHeader;