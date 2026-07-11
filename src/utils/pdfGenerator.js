// FILE: src/utils/pdfGenerator.js — React Native Expo version
// CHANGES FROM PWA: jsPDF → expo-print (generates real PDF on device)
// expo-sharing → directly share PDF via WhatsApp, email, etc.
// In React Native we CAN attach PDF directly to WhatsApp — no manual steps needed!

import * as Print   from "expo-print";
import * as Sharing from "expo-sharing";

// Generate HTML template for the visit report
function buildReportHTML({ visits, employee, telecaller, date }) {
  const summary = {
    total:       visits.length,
    interested:  visits.filter((v) => v.followUp?.status === "interested").length,
    callback:    visits.filter((v) => ["callback","busy"].includes(v.followUp?.status)).length,
    orderPlaced: visits.filter((v) => v.followUp?.status === "order_placed").length,
    paymentDue:  visits.filter((v) => v.followUp?.status === "payment_due").length,
  };

  const rows = visits.map((v, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
      <td>${i + 1}</td>
      <td><strong>${v.shopName}</strong><br/><small>${v.shopCode || ""}</small></td>
      <td>${v.ownerName || "—"}</td>
      <td>${v.mobile || "—"}</td>
      <td>${v.fieldType || "—"}</td>
      <td>${v.followUp?.status?.replace("_"," ") || "—"}</td>
      <td>${v.status}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; margin: 20px; }
        h1 { color: #1d4ed8; font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        .meta { display: flex; gap: 24px; margin-bottom: 20px; }
        .meta-item label { color: #6b7280; font-size: 11px; display: block; }
        .meta-item span { font-weight: 600; font-size: 13px; }
        .summary { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-box { background: #eff6ff; border-radius: 8px; padding: 10px 16px; text-align: center; }
        .stat-box .num { font-size: 22px; font-weight: 700; color: #1d4ed8; }
        .stat-box .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1d4ed8; color: #fff; padding: 8px 10px; text-align: left; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Daily Visit Report</h1>
      <p class="subtitle">${date}</p>

      <div class="meta">
        <div class="meta-item"><label>Employee</label><span>${employee?.name || "—"} (${employee?.employeeId || "—"})</span></div>
        <div class="meta-item"><label>Assigned To</label><span>${telecaller?.name || "—"}</span></div>
      </div>

      <div class="summary">
        <div class="stat-box"><div class="num">${summary.total}</div><div class="lbl">Total</div></div>
        <div class="stat-box"><div class="num">${summary.interested}</div><div class="lbl">Interested</div></div>
        <div class="stat-box"><div class="num">${summary.orderPlaced}</div><div class="lbl">Orders</div></div>
        <div class="stat-box"><div class="num">${summary.paymentDue}</div><div class="lbl">Payment Due</div></div>
      </div>

      <table>
        <thead><tr><th>#</th><th>Shop</th><th>Owner</th><th>Mobile</th><th>Type</th><th>Follow-up</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="footer">
        Generated: ${new Date().toLocaleString("en-IN")} · Sridhi Field Sales
      </div>
    </body>
    </html>
  `;
}

// Generate PDF and return the file URI
export async function generateAndSharePDF({ visits, employee, telecaller, date }) {
  const html     = buildReportHTML({ visits, employee, telecaller, date });
  const filename = `visit-report-${telecaller?.name?.replace(/\s/g,"-") || "report"}-${new Date().toISOString().split("T")[0]}`;

  // expo-print converts HTML to PDF
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  return { uri, filename: `${filename}.pdf` };
}

// Share PDF via native share sheet (WhatsApp, email, etc.)
// In React Native, this DIRECTLY attaches the file — no manual steps!
export async function sharePDF(uri) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing not available on this device");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Send Visit Report",
    UTI: "com.adobe.pdf",
  });
}