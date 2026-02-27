import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  otherDetails?: string;
  enableLogin: boolean;
  imageUrl?: string;
  status: "Active" | "Inactive" | "Suspended";
}

interface ReportOptions {
  reportName: string;
  brandLogoUrl?: string; // Now dynamic
  tagline?: string; // Now dynamic
  preparedBy?: string;
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

function fitIntoBox(imgW: number, imgH: number, maxW: number, maxH: number) {
  if (!imgW || !imgH) return { w: maxW, h: maxH };
  const imgRatio = imgW / imgH;
  const boxRatio = maxW / maxH;

  if (imgRatio >= boxRatio) {
    // limited by width
    const w = maxW;
    const h = maxW / imgRatio;
    return { w, h };
  }

  // limited by height
  const h = maxH;
  const w = maxH * imgRatio;
  return { w, h };
}

async function addLogo(doc: jsPDF, logoUrl?: string) {
  if (!logoUrl) return;

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => {
      try {
        const pageWidth = doc.internal.pageSize.getWidth();

        // Fit logo into a fixed box but preserve aspect ratio to avoid stretching.
        const maxW = 56;
        const maxH = 20;
        const { w, h } = fitIntoBox(img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, maxH);

        const marginRight = 14;
        const y = 14 + (maxH - h) / 2;
        const x = pageWidth - marginRight - w;

        doc.addImage(img, "PNG", x, y, w, h);
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

function getWrappedLines(doc: jsPDF, text: string, maxWidth: number) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return [] as string[];
  return doc.splitTextToSize(cleaned, maxWidth) as string[];
}

function addWrappedHeader(doc: jsPDF, opts: { title: string; subtitle?: string; marginX: number; hasLogo: boolean }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const reservedLogoWidth = opts.hasLogo ? 56 + 14 + 10 : 0;
  const maxTextWidth = Math.max(120, pageWidth - opts.marginX * 2 - reservedLogoWidth);

  doc.setLineHeightFactor(1.15);

  let y = 32;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleLines = getWrappedLines(doc, opts.title, maxTextWidth);
  doc.text(titleLines.length ? titleLines : [opts.title], opts.marginX, y);
  y += (titleLines.length || 1) * 16 * 1.15;

  // Subtitle
  if (opts.subtitle) {
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    const subtitleLines = getWrappedLines(doc, opts.subtitle, maxTextWidth);
    doc.text(subtitleLines.length ? subtitleLines : [opts.subtitle], opts.marginX, y);
    y += (subtitleLines.length || 1) * 10 * 1.15;
    doc.setTextColor(0);
  }

  return y + 14;
}

function applySubtotalRowStyles(hookData: any) {
  if (hookData.section !== "body") return;

  const raw = hookData.row?.raw as Array<string | number> | undefined;
  if (!raw || !Array.isArray(raw) || raw.length === 0) return;

  const firstCell = String(raw[0] ?? "").trim();
  const label = firstCell.toLowerCase();
  const lastCell = String(raw[raw.length - 1] ?? "").trim();

  const isTotal =
    label === "total" ||
    label === "grand total" ||
    label === "subtotal" ||
    label.startsWith("total ") ||
    label.startsWith("subtotal") ||
    label === "total for period" ||
    label === "grand total";

  const isNetCashflow = /net\s+cashflow/i.test(firstCell);
  const isCashAtHand = label.includes("cash on hand") || label.includes("cash at hand");

  if (!isTotal && !isNetCashflow && !isCashAtHand) return;

  hookData.cell.styles.fontStyle = "bold";

  if (isCashAtHand) {
    hookData.cell.styles.fillColor = [254, 243, 199];
    hookData.cell.styles.textColor = [146, 64, 14];
    return;
  }

  if (isTotal) {
    hookData.cell.styles.fillColor = [232, 240, 253];
    hookData.cell.styles.textColor = [22, 47, 79];
    return;
  }

  // Net cashflow styling (green/red)
  const isNegative = lastCell.includes("-");
  hookData.cell.styles.fillColor = isNegative ? [254, 242, 242] : [240, 253, 244];
  hookData.cell.styles.textColor = isNegative ? [190, 18, 60] : [21, 128, 61];
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

  const startY = addWrappedHeader(doc, {
    title: options.title,
    subtitle: options.subtitle,
    marginX,
    hasLogo: !!options.brandLogoUrl,
  });

  await addLogo(doc, options.brandLogoUrl);

  autoTable(doc, {
    startY,
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
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: applySubtotalRowStyles,
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
  const allCols = options.tables.reduce(
    (max, t) => (t.columns.length > max.length ? t.columns : max),
    options.tables[0]?.columns ?? [],
  );

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

  let cursorY = addWrappedHeader(doc, {
    title: options.title,
    subtitle: options.subtitle,
    marginX,
    hasLogo: !!options.brandLogoUrl,
  });

  await addLogo(doc, options.brandLogoUrl);

  for (const table of options.tables) {
    if (table.title) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = Math.max(120, pageWidth - marginX * 2);
      const lines = getWrappedLines(doc, table.title, maxWidth);
      doc.text(lines.length ? lines : [table.title], marginX, cursorY);
      cursorY += (lines.length || 1) * 12 * 1.15;
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
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didParseCell: applySubtotalRowStyles,
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
    const subtitle = options.preparedBy ? `prepared by: ${options.preparedBy}` : undefined;

    const sorted = [...members].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(options.reportName, 14, 22);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(subtitle, 14, 36);
      doc.setTextColor(0);
    }

    // Prepare table data
    const tableColumn = ["#", "Name", "Email", "Phone", "Other details", "Status"];
    const tableRows = sorted.map((member, idx) => [
      idx + 1,
      member.name,
      member.email,
      member.phone || "",
      member.otherDetails || "",
      member.status,
    ]);

    autoTable(doc, {
      startY: subtitle ? 48 : 36,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [22, 47, 79],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
    });

    // Add Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(options.tagline || "", 14, doc.internal.pageSize.height - 12);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 14 - 60,
        doc.internal.pageSize.height - 12,
      );
      doc.setTextColor(0);
    }

    doc.save(`${options.reportName.replace(/\s/g, "_")}.pdf`);
  };

  if (options.brandLogoUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = options.brandLogoUrl;
    img.onload = () => {
      try {
        const maxW = 56;
        const maxH = 20;
        const { w, h } = fitIntoBox(img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, maxH);
        const marginRight = 14;
        const x = doc.internal.pageSize.width - marginRight - w;
        const y = 10 + (maxH - h) / 2;
        doc.addImage(img, "PNG", x, y, w, h);
      } catch (e) {
        console.error("Failed to add logo to PDF:", e);
      }
      addTableAndFooter();
    };
    img.onerror = () => {
      console.error("Failed to load brand logo for PDF report.");
      addTableAndFooter();
    };
  } else {
    addTableAndFooter();
  }
};

export const exportMembersToExcel = (members: Member[], options: ReportOptions) => {
  const sorted = [...members].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

  const data = sorted.map((member, idx) => ({
    "#": idx + 1,
    Name: member.name,
    Email: member.email,
    Phone: member.phone || "",
    "Other details": member.otherDetails || "",
    Status: member.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  const metaRows = [
    [options.reportName],
    ...(options.preparedBy ? [[`prepared by: ${options.preparedBy}`]] : []),
    [],
  ];
  XLSX.utils.sheet_add_aoa(ws, metaRows, { origin: "A1" });

  XLSX.utils.book_append_sheet(wb, ws, options.reportName);

  XLSX.writeFile(wb, `${options.reportName.replace(/\s/g, "_")}.xlsx`);
};