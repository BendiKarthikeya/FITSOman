import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export Dashboard Report as PDF
 * Captures the dashboard metrics and charts
 */
export async function exportDashboardPDF(metrics: {
  eviScore: number;
  npsScore: number;
  csatScore: number;
  totalFeedback30d: number;
  promotersPercent: number;
  passivesPercent: number;
  detractorsPercent: number;
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(30, 41, 59); // slate-800
  pdf.text('Customer Experience Dashboard', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  const reportDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Generated on ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });

  // Summary Metrics Section
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Key Metrics Summary', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setTextColor(71, 85, 105); // slate-600
  
  // EVI Score
  pdf.text('EVI Score:', 20, yPosition);
  pdf.setTextColor(16, 185, 129); // green-500
  pdf.text(metrics.eviScore.toFixed(1), 60, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(71, 85, 105);
  pdf.text('NPS Score:', 20, yPosition);
  pdf.setTextColor(59, 130, 246); // blue-500
  pdf.text(metrics.npsScore.toFixed(1), 60, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(71, 85, 105);
  pdf.text('CSAT Score:', 20, yPosition);
  pdf.setTextColor(168, 85, 247); // purple-500
  pdf.text(metrics.csatScore.toFixed(1), 60, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(71, 85, 105);
  pdf.text('Total Feedback (30d):', 20, yPosition);
  pdf.setTextColor(245, 158, 11); // amber-500
  pdf.text(metrics.totalFeedback30d.toString(), 60, yPosition);

  // NPS Breakdown
  yPosition += 15;
  pdf.setFontSize(14);
  pdf.setTextColor(30, 41, 59);
  pdf.text('NPS Breakdown', 20, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Promoters: ${metrics.promotersPercent.toFixed(1)}%`, 20, yPosition);
  pdf.text(`Passives: ${metrics.passivesPercent.toFixed(1)}%`, 80, yPosition);
  pdf.text(`Detractors: ${metrics.detractorsPercent.toFixed(1)}%`, 140, yPosition);

  // Capture charts section
  yPosition += 15;
  const chartsElement = document.getElementById('dashboard-charts');
  if (chartsElement) {
    try {
      const canvas = await html2canvas(chartsElement, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
    } catch (error) {
      
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('InsightPulse - Customer Experience Analytics', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  pdf.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Analytics Report as PDF
 * Comprehensive export of survey analytics including all metrics and visualizations
 */
export async function exportAnalyticsPDF(
  surveyName: string,
  metrics: {
    eviScore: number;
    npsScore: number;
    csatScore: number;
    totalFeedback30d: number;
    promotersPercent: number;
    passivesPercent: number;
    detractorsPercent: number;
  },
  additionalData?: {
    surveyCount?: number;
    responseCount?: number;
  }
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Survey Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text(surveyName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  const reportDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Generated on ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });

  // Executive Summary
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Executive Summary', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setTextColor(71, 85, 105);
  
  if (additionalData?.surveyCount) {
    pdf.text(`Total Surveys: ${additionalData.surveyCount}`, 20, yPosition);
    yPosition += 8;
  }
  
  if (additionalData?.responseCount) {
    pdf.text(`Total Responses: ${additionalData.responseCount}`, 20, yPosition);
    yPosition += 8;
  }

  // Key Performance Indicators
  yPosition += 10;
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Key Performance Indicators', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  
  // Create a table-like layout
  const metrics_data = [
    { label: 'EVI Score', value: metrics.eviScore.toFixed(1), color: [16, 185, 129] },
    { label: 'Net Promoter Score (NPS)', value: metrics.npsScore.toFixed(1), color: [59, 130, 246] },
    { label: 'Customer Satisfaction (CSAT)', value: metrics.csatScore.toFixed(1), color: [168, 85, 247] },
    { label: 'Total Feedback (30 days)', value: metrics.totalFeedback30d.toString(), color: [245, 158, 11] }
  ];

  metrics_data.forEach((metric) => {
    pdf.setTextColor(71, 85, 105);
    pdf.text(metric.label + ':', 20, yPosition);
    pdf.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
    pdf.text(metric.value, 100, yPosition);
    yPosition += 8;
  });

  // NPS Distribution
  yPosition += 10;
  pdf.setFontSize(14);
  pdf.setTextColor(30, 41, 59);
  pdf.text('NPS Distribution', 20, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  
  // Draw simple bar representation
  const barWidth = 50;
  const barHeight = 6;
  
  // Promoters
  pdf.text('Promoters:', 20, yPosition);
  pdf.setFillColor(16, 185, 129); // green
  pdf.rect(60, yPosition - 4, (metrics.promotersPercent / 100) * barWidth, barHeight, 'F');
  pdf.text(`${metrics.promotersPercent.toFixed(1)}%`, 115, yPosition);
  yPosition += 10;
  
  // Passives
  pdf.text('Passives:', 20, yPosition);
  pdf.setFillColor(245, 158, 11); // amber
  pdf.rect(60, yPosition - 4, (metrics.passivesPercent / 100) * barWidth, barHeight, 'F');
  pdf.text(`${metrics.passivesPercent.toFixed(1)}%`, 115, yPosition);
  yPosition += 10;
  
  // Detractors
  pdf.text('Detractors:', 20, yPosition);
  pdf.setFillColor(239, 68, 68); // red
  pdf.rect(60, yPosition - 4, (metrics.detractorsPercent / 100) * barWidth, barHeight, 'F');
  pdf.text(`${metrics.detractorsPercent.toFixed(1)}%`, 115, yPosition);

  // Capture Overview section
  yPosition += 15;
  const overviewElement = document.getElementById('analytics-overview');
  if (overviewElement) {
    try {
      const canvas = await html2canvas(overviewElement, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: overviewElement.scrollWidth,
        windowHeight: overviewElement.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.text('Detailed Visualizations', 20, yPosition);
        yPosition += 10;
      }
      
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      
    }
  }

  // Capture Charts section if available
  const chartsElement = document.getElementById('analytics-charts');
  if (chartsElement && yPosition < pageHeight - 60) {
    try {
      const canvas = await html2canvas(chartsElement, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
    } catch (error) {
      
    }
  }

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('InsightPulse - Survey Analytics Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  const fileName = `analytics-report-${surveyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

/**
 * Export Survey Analysis (Individual Survey) as PDF
 * For the SurveyAnalysis page with D3 charts
 */
export async function exportSurveyAnalysisPDF(
  surveyName: string,
  surveyId: string
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Survey Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text(surveyName, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Survey ID: ${surveyId}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  const reportDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Generated on ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });

  // Capture the entire D3 dashboard
  yPosition += 15;
  const dashboardElement = document.querySelector('.analytics-d3-dashboard');
  
  if (dashboardElement) {
    try {
      // Capture metrics section
      const metricsElement = dashboardElement.querySelector('.metrics-section');
      if (metricsElement) {
        const canvas = await html2canvas(metricsElement as HTMLElement, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Capture charts section
      const chartsSection = dashboardElement.querySelector('.charts-grid');
      if (chartsSection) {
        const canvas = await html2canvas(chartsSection as HTMLElement, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      }
    } catch (error) {
      
      
      // Fallback: try to capture the entire card content
      const cardContent = document.querySelector('[class*="CardContent"]');
      if (cardContent) {
        const canvas = await html2canvas(cardContent as HTMLElement, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight <= pageHeight - 20) {
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        }
      }
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('InsightPulse - Survey Analytics Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  const fileName = `survey-analysis-${surveyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

type ExportPageOptions = {
  title: string;
  fileName?: string;
  rootSelector?: string;
  orientation?: 'p' | 'l';
  marginMm?: number;
  backgroundColor?: string;
};

function slugifyFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Export the current page (or a specific container) as a PDF.
 */
export async function exportPagePDF(options: ExportPageOptions) {
  const {
    title,
    fileName,
    rootSelector = 'body',
    orientation = 'p',
    marginMm = 10,
    backgroundColor = '#ffffff'
  } = options;

  const target = document.querySelector(rootSelector) as HTMLElement | null;
  if (!target) {
    throw new Error(`Export target not found for selector: ${rootSelector}`);
  }

  const pdf = new jsPDF(orientation, 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const canvas = await html2canvas(target, {
    scale: 2,
    logging: false,
    backgroundColor,
    windowWidth: target.scrollWidth,
    windowHeight: target.scrollHeight
  });

  const imgWidth = pageWidth - marginMm * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const availableHeight = pageHeight - marginMm * 2;

  if (imgHeight <= availableHeight) {
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidth, imgHeight);
  } else {
    const pageHeightPx = Math.floor((availableHeight * canvas.width) / imgWidth);
    let renderedHeight = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const context = pageCanvas.getContext('2d');
      if (context) {
        context.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const imgData = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceHeight * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidth, sliceHeightMm);

      renderedHeight += sliceHeight;
      if (renderedHeight < canvas.height) {
        pdf.addPage();
      }
    }
  }

  const dateStamp = new Date().toISOString().split('T')[0];
  const resolvedName = fileName || `${slugifyFileName(title)}-${dateStamp}.pdf`;
  pdf.save(resolvedName);
}
