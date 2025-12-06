import jsPDF from "jspdf";
import "jspdf-autotable";
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
  // In a real app, brandLogoPath and tagline would be passed here or fetched from a global state/context
  // For this example, we'll use placeholders and assume they are globally available.
}

// Placeholder for global branding settings (in a real app, these would be fetched from a context/backend)
// For now, we'll use static placeholders as direct context access isn't feasible in a pure utility function
const REPORT_BRAND_LOGO_PATH = "/placeholder.svg"; // This would ideally come from BrandingContext
const REPORT_TAGLINE = "Your cinematic tagline here."; // This would ideally come from BrandingContext

export const exportMembersToPdf = (members: Member[], options: ReportOptions) => {
  const doc = new jsPDF();

  // Add Header
  doc.setFontSize(18);
  doc.text(options.reportName, 14, 22);
  if (REPORT_BRAND_LOGO_PATH) {
    const img = new Image();
    img.src = REPORT_BRAND_LOGO_PATH;
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

  const addTableAndFooter = () => {
    // Prepare table data
    const tableColumn = ["Name", "Email", "Login Enabled", "Status"];
    const tableRows = members.map((member) => [
      member.name,
      member.email,
      member.enableLogin ? "Yes" : "No",
      member.status,
    ]);

    // Add table
    (doc as any).autoTable({
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
      doc.text(REPORT_TAGLINE, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save(`${options.reportName.replace(/\s/g, "_")}.pdf`);
  };
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

  // Add header and footer to a separate sheet or as metadata if needed for more complex reports
  // For simplicity, we'll just add a header row to the main sheet for now.
  // More advanced Excel customization would involve direct cell manipulation.

  XLSX.writeFile(wb, `${options.reportName.replace(/\s/g, "_")}.xlsx`);
};