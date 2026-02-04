"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { exportTableToPdf } from "@/utils/reportUtils";

type Props = {
  title: string;
  subtitle?: string;
  fileName?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export default function ReportActions({
  title,
  subtitle,
  fileName,
  columns,
  rows,
}: Props) {
  const { brandLogoUrl, tagline } = useBranding();
  const { currentUser } = useAuth();

  const subtitleWithPreparedBy = React.useMemo(() => {
    const preparedBy = currentUser?.name ? `prepared by: ${currentUser.name}` : undefined;
    if (subtitle && preparedBy) return `${subtitle} • ${preparedBy}`;
    return subtitle || preparedBy;
  }, [currentUser?.name, subtitle]);

  const handleExport = async (mode: "download" | "open") => {
    await exportTableToPdf({
      title,
      subtitle: subtitleWithPreparedBy,
      columns,
      rows,
      fileName: fileName || title,
      brandLogoUrl,
      tagline,
      mode,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("open")}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button size="sm" onClick={() => handleExport("download")}>
        <FileDown className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
    </div>
  );
}