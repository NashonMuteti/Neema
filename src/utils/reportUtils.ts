import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Member {
  id: string;
  name: string;
  email: string;
  enableLogin: boolean;
  imageUrl?: string;
  status: "Active" | "Inactive" | "Suspended";
}

interface ReportOptions {
  reportName: string;
  brandLogoUrl?: string; // Now dynamic
  tagline?: string; // Now dynamic
}

type TablePdfOptions = {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  brandLogoUrl?: string;
  tagline?: string;
  mode: "download" | "open";
  orientation?: "portrait" | "landscape" | "auto";
};

type MultiTablePdfOptions = {
  title: string;
  subtitle?: string;
  fileName: string;
  tables: Array<{
    title?: string;
    columns: string[];
    rows: Array<Array<string | number>>;
  }>;
  brandLogoUrl?: string;
  tagline?: string;
  mode: "download" | "open";
  orientation?: "portrait" | "landscape" | "auto";
};

function chooseOrientation(columns: string[], rows: Array<Array<string | number>>) {
  // Heuristic: many columns or long values => landscape
  const colCount = columns.length;
  const longestCell = rows
    .flat()
    .map((v) => String(v ?? ""))
    .reduce((max, v) => Math.max(max, v.length), 0);

  if (colCount >= 7) return "landscape" as const;
  if (colCount >= 6 && longestCell >= 18) return "landscape" as const;
  if (longestCell >= 30) return "landscape" as const;
  return "portrait" as const;
}

async function addLogo(doc: jsPDF, logoUrl?: string) {
  if (!logoUrl) return;

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => {
      try {
        // Place logo in the top-right.
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.addImage(img, "PNG", pageWidth - 70, 14, 56, 20);
      } catch (e) {
        console.error("Failed to add logo to PDF:", e);
      }
      resolve();
    };
    img.onerror = () => resolve();
  });
}

function addFooter(doc: jsPDF, tagline?: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(9);
    doc.setTextColor(90);
    if (tagline) {
      doc.text(tagline, 40, pageHeight - 18);
    }
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40 - 60, pageHeight - 18);
    doc.setTextColor(0);
  }
}

export async function exportTableToPdf(options: TablePdfOptions) {
  const orientation =
    options.orientation === "auto" || !options.orientation
      ? chooseOrientation(options.columns, options.rows)
      : options.orientation;

  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: "a4",
  });

  const marginX = 40;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, marginX, 32);

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(options.subtitle, marginX, 48);
    doc.setTextColor(0);
  }

  await addLogo(doc, options.brandLogoUrl);

  // Table
  autoTable(doc, {
    startY: options.subtitle ? 64 : 54,
    head: [options.columns],
    body: options.rows,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [22, 47, 79],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: marginX, right: marginX },
  });

  addFooter(doc, options.tagline);

  const safeName = options.fileName.replace(/\s+/g, "_");

  if (options.mode === "download") {
    doc.save(`${safeName}.pdf`);
    return;
  }

  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function exportMultiTableToPdf(options: MultiTablePdfOptions) {
  const allRows = options.tables.flatMap((t) => t.rows);
  const allCols = options.tables.reduce((max, t) => (t.columns.length > max.length ? t.columns : max), options.tables[0]?.columns ?? []);

  const orientation =
    options.orientation === "auto" || !options.orientation
      ? chooseOrientation(allCols, allRows)
      : options.orientation;

  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: "a4",
  });

  const marginX = 40;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, marginX, 32);

  let cursorY = 54;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(options.subtitle, marginX, 48);
    doc.setTextColor(0);
    cursorY = 64;
  }

  await addLogo(doc, options.brandLogoUrl);

  for (const table of options.tables) {
    if (table.title) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(table.title, marginX, cursorY);
      cursorY += 10;
    }

    autoTable(doc, {
      startY: cursorY,
      head: [table.columns],
      body: table.rows,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [22, 47, 79],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: marginX, right: marginX },
    });

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 18;
  }

  addFooter(doc, options.tagline);

  const safeName = options.fileName.replace(/\s+/g, "_");

  if (options.mode === "download") {
    doc.save(`${safeName}.pdf`);
    return;
  }

  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}

export const exportMembersToPdf = (members: Member[], options: ReportOptions) => {
  const doc = new jsPDF();

  const addTableAndFooter = () => {
    // Prepare table data
    const tableColumn = ["Name", "Email", "Login Enabled", "Status"];
    const tableRows = members.map((member) => [
      member.name,
      member.email,
      member.enableLogin ? "Yes" : "No",
      member.status,
    ]);

    autoTable(doc, {
      startY: 30, // Start table below the header
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [22, 47, 79], // Dark blue for header
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Light gray for alternate rows
      },
      margin: { top: 30 },
    });

    // Add Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(options.tagline || "", 14, doc.internal.pageSize.height - 10); // Use dynamic tagline
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10,
      );
    }

    doc.save(`${options.reportName.replace(/\s/g, "_")}.pdf`);
  };

  // Add Header
  doc.setFontSize(18);
  doc.text(options.reportName, 14, 22);
  if (options.brandLogoUrl) {
    const img = new Image();
    img.src = options.brandLogoUrl;
    // Ensure the image is loaded before adding it to the PDF
    img.onload = () => {
      doc.addImage(img, "PNG", 170, 10, 20, 20); // Adjust position and size as needed
      addTableAndFooter();
    };
    img.onerror = () => {
      console.error("Failed to load brand logo for PDF report.");
      addTableAndFooter(); // Proceed without logo if it fails to load
    };
  } else {
    addTableAndFooter();
  }
};

export const exportMembersToExcel = (members: Member[], options: ReportOptions) => {
  const data = members.map((member) => ({
    Name: member.name,
    Email: member.email,
    "Login Enabled": member.enableLogin ? "Yes" : "No",
    Status: member.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.reportName);

  XLSX.writeFile(wb, `${options.reportName.replace(/\s/g, "_")}.xlsx`);
};