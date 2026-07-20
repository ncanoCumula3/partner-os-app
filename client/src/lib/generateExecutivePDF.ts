/**
 * Executive Summary PDF Generator
 * Generates a polished, branded PDF report of the Downsell Mitigation dashboard
 * for leadership reviews — at-risk accounts, active mitigations, and projected revenue impact.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ACCOUNTS, DOWNSELL_SIGNALS, MITIGATION_ACTIONS, AI_RECOMMENDATIONS,
  getAllRiskProfiles, riskScoreLabel,
  signalCategoryConfig,
  daysUntilLED, formatLEDDate,
  type AccountRiskProfile, type SignalCategory,
  type DownsellWeightsConfig, type RiskThresholdConfig,
} from "@/lib/data";
import type { AutoTask, ScheduledCall, AutomationEvent } from "@/contexts/MitigationEngineContext";

/* ── Color Palette (matching Partner OS Golden Hour theme) ──── */
const COLORS = {
  primary: [45, 45, 45] as [number, number, number],          // Dark charcoal
  accent: [180, 120, 40] as [number, number, number],         // Golden amber
  accentLight: [255, 243, 224] as [number, number, number],   // Light amber bg
  red: [185, 28, 28] as [number, number, number],             // Critical red
  redLight: [254, 226, 226] as [number, number, number],
  orange: [194, 65, 12] as [number, number, number],          // High risk orange
  orangeLight: [255, 237, 213] as [number, number, number],
  amber: [146, 64, 14] as [number, number, number],           // Moderate amber
  green: [21, 128, 61] as [number, number, number],           // Low risk green
  greenLight: [220, 252, 231] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],         // Gray text
  border: [229, 231, 235] as [number, number, number],        // Light border
  white: [255, 255, 255] as [number, number, number],
  bg: [250, 250, 250] as [number, number, number],
  headerBg: [30, 30, 30] as [number, number, number],
};

function riskColor(score: number, t?: Partial<RiskThresholdConfig>): [number, number, number] {
  const thresholds = { low: 20, medium: 45, high: 70, ...t };
  if (score >= thresholds.high) return COLORS.red;
  if (score >= thresholds.medium) return COLORS.orange;
  if (score >= thresholds.low) return COLORS.amber;
  return COLORS.green;
}

function riskBgColor(score: number, t?: Partial<RiskThresholdConfig>): [number, number, number] {
  const thresholds = { low: 20, medium: 45, high: 70, ...t };
  if (score >= thresholds.high) return COLORS.redLight;
  if (score >= thresholds.medium) return COLORS.orangeLight;
  if (score >= thresholds.low) return COLORS.accentLight;
  return COLORS.greenLight;
}

interface PDFExportOptions {
  tasks?: AutoTask[];
  scheduledCalls?: ScheduledCall[];
  automationLog?: AutomationEvent[];
  engineStats?: {
    totalTasksGenerated: number;
    tasksCompleted: number;
    tasksPending: number;
    callsScheduled: number;
    strategiesApplied: number;
  };
  downsellConfig?: DownsellWeightsConfig;
  riskThresholds?: Partial<RiskThresholdConfig>;
}

export function generateExecutivePDF(options: PDFExportOptions = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  /* ── Helper: Add new page if needed ── */
  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
      addFooter();
    }
  }

  /* ── Helper: Draw footer on current page ── */
  function addFooter() {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Partner OS — Downsell Mitigation Executive Summary`, margin, pageHeight - 8);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  /* ── Helper: Section heading ── */
  function sectionHeading(title: string, subtitle?: string) {
    checkPageBreak(16);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(title, margin, y);
    if (subtitle) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.text(subtitle, margin, y + 5);
      y += 10;
    } else {
      y += 6;
    }
    // Accent underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 6;
  }

  /* ── Helper: KPI box ── */
  function kpiBox(x: number, w: number, label: string, value: string, subtext: string, valueColor: [number, number, number] = COLORS.primary) {
    doc.setFillColor(...COLORS.bg);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, w, 22, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x + 4, y + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...valueColor);
    doc.text(value, x + 4, y + 15);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(subtext, x + 4, y + 20);
  }

  /* ════════════════════════════════════════════════════════════
     PAGE 1: COVER & EXECUTIVE OVERVIEW
     ════════════════════════════════════════════════════════════ */

  // Dark header band
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 52, "F");

  // Accent stripe
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 52, pageWidth, 2, "F");

  // Logo area
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.accent);
  doc.text("PARTNER OS", margin, 16);

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Downsell Mitigation", margin, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("Executive Summary Report", margin, 38);

  // Date
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(reportDate, margin, 46);

  // Confidential badge
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.accent);
  doc.text("CONFIDENTIAL", pageWidth - margin, 16, { align: "right" });

  y = 64;

  /* ── Gather Data ── */
  const rt = options.riskThresholds;
  const riskProfiles = getAllRiskProfiles(options.downsellConfig);
  const totalARRExposed = riskProfiles.reduce((sum, p) => sum + p.arrExposed, 0);
  const highThreshold = rt?.high ?? 70;
  const criticalAccounts = riskProfiles.filter(p => p.compositeScore >= highThreshold).length;
  const totalSignals = DOWNSELL_SIGNALS.filter(s => !s.resolved).length;
  const criticalSignals = DOWNSELL_SIGNALS.filter(s => !s.resolved && s.severity === "critical").length;
  const activeMitigations = MITIGATION_ACTIONS.filter(m => m.status === "in_progress" || m.status === "pending").length;
  const completedMitigations = MITIGATION_ACTIONS.filter(m => m.status === "completed").length;

  /* ── Executive Summary Paragraph ── */
  sectionHeading("Executive Overview", "High-level assessment of downsell risk across the SaaS portfolio");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.primary);
  const summaryText = `This report provides a comprehensive analysis of downsell risk across ${riskProfiles.length} SaaS accounts managed by the Partner OS platform. AI-powered signal detection has identified ${totalSignals} active risk signals (${criticalSignals} critical) across ${new Set(DOWNSELL_SIGNALS.filter(s => !s.resolved).map(s => s.category)).size} categories, with a total of $${(totalARRExposed / 1000).toFixed(0)}K in annual recurring revenue at risk. ${criticalAccounts} account${criticalAccounts !== 1 ? "s" : ""} require${criticalAccounts === 1 ? "s" : ""} immediate intervention based on composite risk scoring.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 4.5 + 6;

  /* ── KPI Cards ── */
  const kpiW = (contentWidth - 9) / 4;
  kpiBox(margin, kpiW, "ARR AT RISK", `$${(totalARRExposed / 1000).toFixed(0)}K`, `Across ${riskProfiles.length} SaaS accounts`, COLORS.red);
  kpiBox(margin + kpiW + 3, kpiW, "CRITICAL ACCOUNTS", `${criticalAccounts}`, `Risk score ≥ ${highThreshold}`, COLORS.orange);
  kpiBox(margin + (kpiW + 3) * 2, kpiW, "ACTIVE SIGNALS", `${totalSignals}`, `${criticalSignals} critical`, COLORS.primary);
  kpiBox(margin + (kpiW + 3) * 3, kpiW, "MITIGATIONS", `${activeMitigations}`, `${completedMitigations} completed`, COLORS.green);
  y += 30;

  /* ── Automation Stats (if available) ── */
  if (options.engineStats && options.engineStats.totalTasksGenerated > 0) {
    checkPageBreak(30);
    doc.setFillColor(...COLORS.accentLight);
    doc.setDrawColor(...COLORS.accent);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.accent);
    doc.text("AUTOMATION ENGINE STATUS", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    const statsText = `${options.engineStats.totalTasksGenerated} tasks generated  |  ${options.engineStats.tasksCompleted} completed  |  ${options.engineStats.tasksPending} pending  |  ${options.engineStats.callsScheduled} calls scheduled  |  ${options.engineStats.strategiesApplied} strategies applied`;
    doc.text(statsText, margin + 4, y + 13);
    y += 24;
  }

  /* ════════════════════════════════════════════════════════════
     SECTION: ACCOUNT RISK MATRIX
     ════════════════════════════════════════════════════════════ */
  sectionHeading("Account Risk Matrix", "Ranked by composite risk score — higher scores indicate greater downsell probability");

  const tableData = riskProfiles.map(p => {
    const account = ACCOUNTS.find(a => a.id === p.accountId)!;
    const led = account.saasLicense?.licenseEndDate;
    const daysLeft = led ? daysUntilLED(led) : null;
    return [
      p.account,
      `${p.compositeScore}/100`,
      riskScoreLabel(p.compositeScore, rt),
      `$${(p.arrExposed / 1000).toFixed(0)}K`,
      `${p.signalCount} (${p.criticalSignals} crit)`,
      `${p.activeMitigations} active`,
      led ? `${formatLEDDate(led)} (${daysLeft}d)` : "N/A",
      p.trendDirection === "worsening" ? "↗ Worsening" : p.trendDirection === "improving" ? "↘ Improving" : "→ Stable",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Account", "Risk Score", "Risk Level", "ARR Exposed", "Signals", "Mitigations", "License End Date", "Trend"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.white,
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 25 },
      1: { halign: "center", cellWidth: 16 },
      2: { cellWidth: 18 },
      3: { halign: "right", cellWidth: 16 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 18 },
      6: { cellWidth: 28 },
      7: { cellWidth: 20 },
    },
    didParseCell: (data: any) => {
      // Color-code risk level cells
      if (data.section === "body" && data.column.index === 2) {
        const score = riskProfiles[data.row.index]?.compositeScore ?? 0;
        data.cell.styles.textColor = riskColor(score, rt);
        data.cell.styles.fontStyle = "bold";
      }
      // Color-code trend
      if (data.section === "body" && data.column.index === 7) {
        const trend = riskProfiles[data.row.index]?.trendDirection;
        if (trend === "worsening") data.cell.styles.textColor = COLORS.red;
        else if (trend === "improving") data.cell.styles.textColor = COLORS.green;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* ════════════════════════════════════════════════════════════
     SECTION: SIGNAL BREAKDOWN BY CATEGORY
     ════════════════════════════════════════════════════════════ */
  checkPageBreak(50);
  sectionHeading("Signal Breakdown", "Active downsell signals grouped by detection category");

  const categories: SignalCategory[] = ["support", "csat", "outreach", "usage", "billing", "engagement"];
  const categoryData = categories.map(cat => {
    const signals = DOWNSELL_SIGNALS.filter(s => !s.resolved && s.category === cat);
    const critical = signals.filter(s => s.severity === "critical").length;
    const high = signals.filter(s => s.severity === "high").length;
    return [
      signalCategoryConfig[cat].label,
      `${signals.length}`,
      `${critical}`,
      `${high}`,
      `${signals.length - critical - high}`,
      signals.map(s => s.account).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "—",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Category", "Total", "Critical", "High", "Other", "Affected Accounts"]],
    body: categoryData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.white,
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { halign: "center", cellWidth: 14 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "center", cellWidth: 14 },
      5: { cellWidth: "auto" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 2) {
        const val = parseInt(data.cell.raw);
        if (val > 0) { data.cell.styles.textColor = COLORS.red; data.cell.styles.fontStyle = "bold"; }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* ════════════════════════════════════════════════════════════
     SECTION: CRITICAL ACCOUNT DEEP DIVES
     ════════════════════════════════════════════════════════════ */
  checkPageBreak(30);
  sectionHeading("Critical Account Analysis", `Detailed breakdown for accounts with risk score ≥ ${highThreshold}`);

  const criticalProfiles = riskProfiles.filter(p => p.compositeScore >= highThreshold);

  criticalProfiles.forEach((profile, idx) => {
    const account = ACCOUNTS.find(a => a.id === profile.accountId)!;
    const signals = DOWNSELL_SIGNALS.filter(s => s.accountId === profile.accountId && !s.resolved);
    const mitigations = MITIGATION_ACTIONS.filter(m => m.accountId === profile.accountId);
    const recommendations = AI_RECOMMENDATIONS.filter(r => r.accountId === profile.accountId);
    const led = account.saasLicense?.licenseEndDate;
    const daysLeft = led ? daysUntilLED(led) : null;

    checkPageBreak(60);

    // Account header bar
    const rc = riskColor(profile.compositeScore, rt);
    const rbg = riskBgColor(profile.compositeScore, rt);
    doc.setFillColor(...rbg);
    doc.setDrawColor(...rc);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rc);
    doc.text(`${profile.compositeScore}`, margin + 4, y + 6);
    doc.setTextColor(...COLORS.primary);
    doc.text(profile.account, margin + 16, y + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`${riskScoreLabel(profile.compositeScore, rt)}  |  $${(profile.arrExposed / 1000).toFixed(0)}K at risk  |  LED: ${led ? formatLEDDate(led) : "N/A"} ${daysLeft !== null ? `(${daysLeft}d)` : ""}`, margin + 16, y + 11);
    y += 18;

    // Downsell notes
    if (account.saasLicense?.downsellNotes) {
      checkPageBreak(14);
      doc.setFillColor(255, 248, 240);
      doc.roundedRect(margin + 2, y, contentWidth - 4, 10, 1, 1, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...COLORS.orange);
      doc.text(`⚠ ${account.saasLicense.downsellNotes}`, margin + 5, y + 6);
      y += 14;
    }

    // Key signals
    if (signals.length > 0) {
      checkPageBreak(8 + signals.length * 5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text("Key Signals:", margin + 4, y + 3);
      y += 6;

      signals.slice(0, 5).forEach(sig => {
        checkPageBreak(6);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const sevLabel = sig.severity.toUpperCase();
        const sevColor = sig.severity === "critical" ? COLORS.red : sig.severity === "high" ? COLORS.orange : COLORS.muted;
        doc.setTextColor(...sevColor);
        doc.text(`[${sevLabel}]`, margin + 6, y + 2);
        doc.setTextColor(...COLORS.primary);
        doc.text(sig.title, margin + 22, y + 2);
        if (sig.impactEstimate) {
          doc.setTextColor(...COLORS.red);
          doc.text(sig.impactEstimate, pageWidth - margin, y + 2, { align: "right" });
        }
        y += 5;
      });
    }

    // AI Recommendations
    if (recommendations.length > 0) {
      checkPageBreak(8 + recommendations.length * 8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text("AI Recommendations:", margin + 4, y + 3);
      y += 6;

      recommendations.forEach(rec => {
        checkPageBreak(10);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.accent);
        doc.text(`● ${rec.title}`, margin + 6, y + 2);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(`${rec.confidence}% confidence`, margin + 6 + doc.getTextWidth(`● ${rec.title}  `), y + 2);
        y += 4;
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.primary);
        const recLines = doc.splitTextToSize(rec.summary, contentWidth - 14);
        doc.text(recLines, margin + 8, y + 2);
        y += recLines.length * 3.5 + 3;
      });
    }

    // Active mitigations summary
    const activeMit = mitigations.filter(m => m.status === "in_progress" || m.status === "pending");
    const completedMit = mitigations.filter(m => m.status === "completed");
    if (mitigations.length > 0) {
      checkPageBreak(8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.text(`Mitigations: ${activeMit.length} active, ${completedMit.length} completed of ${mitigations.length} total`, margin + 4, y + 2);
      y += 6;
    }

    y += 4;

    // Divider between accounts
    if (idx < criticalProfiles.length - 1) {
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);
      y += 6;
    }
  });

  /* ════════════════════════════════════════════════════════════
     SECTION: PROJECTED REVENUE IMPACT
     ════════════════════════════════════════════════════════════ */
  checkPageBreak(60);
  sectionHeading("Projected Revenue Impact", "Estimated ARR outcomes based on current risk levels and mitigation effectiveness");

  // Calculate projections
  const totalPortfolioARR = ACCOUNTS.filter(a => a.saasLicense).reduce((sum, a) => sum + (a.saasLicense?.annualLicenseValue ?? 0), 0);
  const projections = riskProfiles.map(p => {
    const account = ACCOUNTS.find(a => a.id === p.accountId)!;
    const licenseARR = account.saasLicense?.annualLicenseValue ?? 0;
    // Estimate downsell amount based on risk score
    const _h = rt?.high ?? 70; const _m = rt?.medium ?? 45; const _l = rt?.low ?? 20;
    const downsellPct = p.compositeScore >= _h ? 0.35 : p.compositeScore >= _m ? 0.20 : p.compositeScore >= _l ? 0.10 : 0.02;
    const projectedLoss = Math.round(licenseARR * downsellPct);
    // Mitigation effectiveness estimate
    const mitigationEffectiveness = p.completedMitigations > 0 ? 0.6 : p.activeMitigations > 0 ? 0.35 : 0.1;
    const mitigatedAmount = Math.round(projectedLoss * mitigationEffectiveness);
    const netRisk = projectedLoss - mitigatedAmount;
    return {
      account: p.account,
      licenseARR,
      projectedLoss,
      mitigatedAmount,
      netRisk,
      bestCase: licenseARR,
      worstCase: licenseARR - projectedLoss,
      likelyCase: licenseARR - netRisk,
    };
  });

  const totalProjectedLoss = projections.reduce((sum, p) => sum + p.projectedLoss, 0);
  const totalMitigated = projections.reduce((sum, p) => sum + p.mitigatedAmount, 0);
  const totalNetRisk = projections.reduce((sum, p) => sum + p.netRisk, 0);

  // Summary boxes
  const projW = (contentWidth - 6) / 3;
  doc.setFillColor(...COLORS.redLight);
  doc.setDrawColor(...COLORS.red);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, projW, 16, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.red);
  doc.text("PROJECTED LOSS (UNMITIGATED)", margin + 3, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`$${(totalProjectedLoss / 1000).toFixed(0)}K`, margin + 3, y + 13);

  doc.setFillColor(...COLORS.greenLight);
  doc.setDrawColor(...COLORS.green);
  doc.roundedRect(margin + projW + 3, y, projW, 16, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.green);
  doc.text("MITIGATED AMOUNT", margin + projW + 6, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`$${(totalMitigated / 1000).toFixed(0)}K`, margin + projW + 6, y + 13);

  doc.setFillColor(...COLORS.orangeLight);
  doc.setDrawColor(...COLORS.orange);
  doc.roundedRect(margin + (projW + 3) * 2, y, projW, 16, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.orange);
  doc.text("NET ARR AT RISK", margin + (projW + 3) * 2 + 3, y + 5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`$${(totalNetRisk / 1000).toFixed(0)}K`, margin + (projW + 3) * 2 + 3, y + 13);
  y += 22;

  // Projection table
  const projTableData = projections.map(p => [
    p.account,
    `$${(p.licenseARR / 1000).toFixed(0)}K`,
    `-$${(p.projectedLoss / 1000).toFixed(0)}K`,
    `+$${(p.mitigatedAmount / 1000).toFixed(0)}K`,
    `-$${(p.netRisk / 1000).toFixed(0)}K`,
    `$${(p.worstCase / 1000).toFixed(0)}K`,
    `$${(p.likelyCase / 1000).toFixed(0)}K`,
    `$${(p.bestCase / 1000).toFixed(0)}K`,
  ]);

  // Add totals row
  projTableData.push([
    "TOTAL",
    `$${(totalPortfolioARR / 1000).toFixed(0)}K`,
    `-$${(totalProjectedLoss / 1000).toFixed(0)}K`,
    `+$${(totalMitigated / 1000).toFixed(0)}K`,
    `-$${(totalNetRisk / 1000).toFixed(0)}K`,
    `$${((totalPortfolioARR - totalProjectedLoss) / 1000).toFixed(0)}K`,
    `$${((totalPortfolioARR - totalNetRisk) / 1000).toFixed(0)}K`,
    `$${(totalPortfolioARR / 1000).toFixed(0)}K`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Account", "License ARR", "Proj. Loss", "Mitigated", "Net Risk", "Worst Case", "Likely Case", "Best Case"]],
    body: projTableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.white,
      fontSize: 6.5,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    didParseCell: (data: any) => {
      // Color projected loss red
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.textColor = COLORS.red;
      }
      // Color mitigated green
      if (data.section === "body" && data.column.index === 3) {
        data.cell.styles.textColor = COLORS.green;
      }
      // Color net risk orange
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.textColor = COLORS.orange;
      }
      // Bold totals row
      if (data.section === "body" && data.row.index === projTableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = COLORS.accentLight;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* ════════════════════════════════════════════════════════════
     SECTION: ACTIVE MITIGATIONS
     ════════════════════════════════════════════════════════════ */
  checkPageBreak(40);
  sectionHeading("Active Mitigations", "Current mitigation actions in progress or pending across all accounts");

  const activeMitActions = MITIGATION_ACTIONS.filter(m => m.status === "in_progress" || m.status === "pending");

  if (activeMitActions.length > 0) {
    const mitData = activeMitActions.map(m => [
      m.account,
      m.title,
      m.assignee,
      m.priority.charAt(0).toUpperCase() + m.priority.slice(1),
      m.status === "in_progress" ? "In Progress" : "Pending",
      m.dueDate,
      m.aiGenerated ? "AI" : "Manual",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Account", "Action", "Assignee", "Priority", "Status", "Due Date", "Source"]],
      body: mitData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: COLORS.primary,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.white,
        fontSize: 6.5,
        fontStyle: "bold",
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 24 },
      1: { cellWidth: 46 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15 },
      4: { cellWidth: 17 },
      5: { cellWidth: 20 },
      6: { halign: "center", cellWidth: 14 },
    },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 3) {
          if (data.cell.raw === "Urgent") data.cell.styles.textColor = COLORS.red;
          else if (data.cell.raw === "High") data.cell.styles.textColor = COLORS.orange;
        }
        if (data.section === "body" && data.column.index === 6 && data.cell.raw === "AI") {
          data.cell.styles.textColor = COLORS.accent;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("No active mitigations at this time.", margin + 4, y);
    y += 8;
  }

  /* ════════════════════════════════════════════════════════════
     SECTION: AUTOMATION ENGINE TASKS (if any)
     ════════════════════════════════════════════════════════════ */
  if (options.tasks && options.tasks.length > 0) {
    checkPageBreak(40);
    sectionHeading("Auto-Generated Tasks", "Tasks created by the AI Mitigation Engine from applied strategies and analysis");

    const taskData = options.tasks.slice(0, 15).map(t => [
      t.account,
      t.title.length > 55 ? t.title.substring(0, 52) + "..." : t.title,
      t.assignee,
      t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      t.status.charAt(0).toUpperCase() + t.status.slice(1).replace("_", " "),
      t.dueDate,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Account", "Task", "Assignee", "Priority", "Status", "Due"]],
      body: taskData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: COLORS.primary,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 6.5,
        fontStyle: "bold",
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ════════════════════════════════════════════════════════════
     SECTION: SCHEDULED CALLS (if any)
     ════════════════════════════════════════════════════════════ */
  if (options.scheduledCalls && options.scheduledCalls.filter(c => c.status === "scheduled").length > 0) {
    checkPageBreak(30);
    sectionHeading("Scheduled Calls", "Upcoming calls generated by the Mitigation Engine");

    const callData = options.scheduledCalls.filter(c => c.status === "scheduled").map(c => [
      c.account,
      c.title.length > 45 ? c.title.substring(0, 42) + "..." : c.title,
      c.callType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
      `${c.duration}min`,
      c.participants.join(", "),
      c.scheduledDate,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Account", "Call", "Type", "Duration", "Participants", "Date"]],
      body: callData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: COLORS.primary,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 6.5,
        fontStyle: "bold",
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ════════════════════════════════════════════════════════════
     SECTION: RECOMMENDATIONS & NEXT STEPS
     ════════════════════════════════════════════════════════════ */
  checkPageBreak(50);
  sectionHeading("Recommendations & Next Steps", "Prioritized actions for the leadership team");

  const recommendations = [
    {
      priority: "IMMEDIATE",
      color: COLORS.red,
      items: [
        `Schedule executive escalation calls for ${criticalProfiles.map(p => p.account).join(" and ")} within 48 hours`,
        `Review and approve AI-generated mitigation strategies for $${(totalARRExposed / 1000).toFixed(0)}K at-risk ARR`,
        `Assign dedicated renewal managers to all accounts with LED within 90 days`,
      ],
    },
    {
      priority: "THIS WEEK",
      color: COLORS.orange,
      items: [
        "Conduct value realization workshops for accounts showing usage decline signals",
        "Review pricing and contract restructure options for accounts requesting renewal negotiations",
        "Align support team on priority handling for critical account tickets",
      ],
    },
    {
      priority: "THIS MONTH",
      color: COLORS.accent,
      items: [
        "Implement proactive health check cadence for all accounts entering renewal window",
        "Develop executive sponsorship program to strengthen relationships at risk accounts",
        "Review and update SaaS Renewal Playbook based on current signal patterns",
      ],
    },
  ];

  recommendations.forEach(section => {
    checkPageBreak(20);
    doc.setFillColor(...(section.color === COLORS.red ? COLORS.redLight : section.color === COLORS.orange ? COLORS.orangeLight : COLORS.accentLight));
    doc.roundedRect(margin, y, 22, 5, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...section.color);
    doc.text(section.priority, margin + 2, y + 3.5);
    y += 8;

    section.items.forEach(item => {
      checkPageBreak(8);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.primary);
      doc.text("•", margin + 4, y);
      const itemLines = doc.splitTextToSize(item, contentWidth - 12);
      doc.text(itemLines, margin + 8, y);
      y += itemLines.length * 3.5 + 2;
    });
    y += 3;
  });

  /* ── Add footers to all pages ── */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("Partner OS — Downsell Mitigation Executive Summary", margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      pageWidth / 2, pageHeight - 8, { align: "center" }
    );
    // Bottom accent line
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  }

  /* ── Save ── */
  doc.save("Partner_OS_Downsell_Mitigation_Executive_Summary.pdf");
}
