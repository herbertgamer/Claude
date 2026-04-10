import { jsPDF } from 'jspdf';
import { burnAnnotations } from './imageUtils';
import { COMPANY_LOGO } from './companyLogo';

// A4 dimensions in points
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Company info (hardcoded for SAFE TECH)
const COMPANY = {
  name: 'SAFE TECH GmbH & Co KG',
  lines: ['Salzburger Straße 19', 'A - 5303 Thalgau', 'info@safe-tech.at'],
};

const TOTAL_PAGES_PLACEHOLDER = '{tp}';

function drawHeader(doc) {
  // Logo left side
  if (COMPANY_LOGO) {
    try {
      doc.addImage(COMPANY_LOGO, 'PNG', MARGIN, 25, 130, 30);
    } catch (e) {
      // fallback: no logo
    }
  }

  // Company text right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY.name, PAGE_W - MARGIN, 32, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  let ty = 44;
  for (const line of COMPANY.lines) {
    doc.text(line, PAGE_W - MARGIN, ty, { align: 'right' });
    ty += 12;
  }
}

function drawTitle(doc, project) {
  const titleY = 95;

  // "MÄNGELLISTE" - centered, bold, underlined
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const titleText = 'M\u00C4NGELLISTE';
  const titleW = doc.getTextWidth(titleText);
  const titleX = PAGE_W / 2;
  doc.text(titleText, titleX, titleY, { align: 'center' });
  // Manual underline
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(titleX - titleW / 2, titleY + 2, titleX + titleW / 2, titleY + 2);

  // Subtitle: "Begehung vom DD.MM.YYYY"
  doc.setFontSize(11);
  const dateStr = new Date(project.createdAt).toLocaleDateString('de-DE');
  doc.text(`Begehung vom ${dateStr}`, titleX, titleY + 18, { align: 'center' });

  return titleY + 28; // return next Y position
}

function drawGrayBar(doc, text, y) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, CONTENT_W - 10);
  const lineH = 14;
  const barH = Math.max(20, lines.length * lineH + 8);

  // Gray background
  doc.setFillColor(180, 180, 180);
  doc.rect(MARGIN, y, CONTENT_W, barH, 'F');

  // Black text
  doc.setTextColor(0, 0, 0);
  doc.text(lines, MARGIN + 5, y + 13);

  return y + barH + 4;
}

function drawBehobenTable(doc, y) {
  const colW = CONTENT_W / 2;
  const headerH = 16;
  const dataH = 22;
  const totalH = headerH + dataH;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Outer border
  doc.rect(MARGIN, y, CONTENT_W, totalH, 'S');
  // Vertical divider
  doc.line(MARGIN + colW, y, MARGIN + colW, y + totalH);
  // Horizontal divider
  doc.line(MARGIN, y + headerH, MARGIN + CONTENT_W, y + headerH);

  // Header labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Behoben am', MARGIN + 4, y + 11);
  doc.text('Behoben von', MARGIN + colW + 4, y + 11);

  return y + totalH;
}

function drawFooter(doc, project, pageNum) {
  const footerY = PAGE_H - 25;

  // Left: Project name + address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  let footerText = project.name;
  if (project.address) {
    footerText += ', ' + project.address;
  }
  doc.text(footerText, MARGIN, footerY);

  // Right: "Seite X von Y"
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Seite ${pageNum} von ${TOTAL_PAGES_PLACEHOLDER}`,
    PAGE_W - MARGIN,
    footerY,
    { align: 'right' }
  );
}

export async function generatePDF(project, defects) {
  const doc = new jsPDF('p', 'pt', 'a4');

  for (let i = 0; i < defects.length; i++) {
    if (i > 0) doc.addPage();
    const defect = defects[i];
    const pageNum = i + 1;

    // Header
    drawHeader(doc);

    // Title
    let y = drawTitle(doc, project);

    // Gray description bar
    let descText = '';
    if (defect.location && defect.description) {
      descText = `${defect.location} – ${defect.description}`;
    } else {
      descText = defect.description || defect.location || 'Mangel ohne Beschreibung';
    }
    y = drawGrayBar(doc, descText, y);

    // Photo with burned annotations
    if (defect.imageData) {
      let imgData = defect.imageData;
      if (defect.annotations && defect.annotations.length > 0 && defect.canvasWidth) {
        try {
          imgData = await burnAnnotations(defect.imageData, defect.annotations, defect.canvasWidth);
        } catch (e) {
          console.error('Failed to burn annotations', e);
        }
      }

      try {
        const img = await loadImage(imgData);
        const imgAspect = img.width / img.height;

        // Calculate max space for photo (leave room for table + footer)
        const tableH = 42; // headerH + dataH
        const footerSpace = 40;
        const maxImgH = PAGE_H - y - tableH - footerSpace - 20;
        const maxImgW = CONTENT_W - 4; // 2pt padding each side

        let imgW = maxImgW;
        let imgH = imgW / imgAspect;
        if (imgH > maxImgH) {
          imgH = maxImgH;
          imgW = imgH * imgAspect;
        }

        // Photo border box
        const boxX = MARGIN;
        const boxW = CONTENT_W;
        const boxH = imgH + 8;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(boxX, y, boxW, boxH, 'S');

        // Center image in box
        const imgX = boxX + (boxW - imgW) / 2;
        const imgY = y + 4;
        doc.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);

        y += boxH + 6;
      } catch (e) {
        console.error('Failed to add image to PDF', e);
      }
    }

    // Behoben table
    y = drawBehobenTable(doc, y);

    // Footer
    drawFooter(doc, project, pageNum);
  }

  // Handle empty report (no defects)
  if (defects.length === 0) {
    drawHeader(doc);
    drawTitle(doc, project);
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text('Keine M\u00E4ngel dokumentiert.', MARGIN, 160);
    drawFooter(doc, project, 1);
  }

  // Replace total pages placeholder
  doc.putTotalPages(TOTAL_PAGES_PLACEHOLDER);

  return doc;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportPDF(project, defects) {
  const doc = await generatePDF(project, defects);
  doc.save(`${project.name}-Maengelliste.pdf`);
}

export async function sharePDF(project, defects) {
  const doc = await generatePDF(project, defects);
  const blob = doc.output('blob');
  const file = new File([blob], `${project.name}-Maengelliste.pdf`, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `M\u00E4ngelliste - ${project.name}`,
      files: [file],
    });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
