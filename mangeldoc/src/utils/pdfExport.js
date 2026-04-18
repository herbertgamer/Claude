import { jsPDF } from 'jspdf';
import { burnAnnotations } from './imageUtils';
import { COMPANY_LOGO } from './companyLogo';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COMPANY = {
  name: 'SAFE TECH GmbH & Co KG',
  lines: ['Salzburger Straße 19', 'A - 5303 Thalgau', 'info@safe-tech.at'],
};

const TOTAL_PAGES_PLACEHOLDER = '{tp}';
const BEHOBEN_H = 110;
const FOOTER_Y = PAGE_H - 30;

function drawHeader(doc) {
  if (COMPANY_LOGO) {
    try {
      doc.addImage(COMPANY_LOGO, 'PNG', MARGIN, 18, 260, 48);
    } catch (e) {
      // fallback: no logo
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY.name, PAGE_W - MARGIN, 34, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  let ty = 48;
  for (const line of COMPANY.lines) {
    doc.text(line, PAGE_W - MARGIN, ty, { align: 'right' });
    ty += 14;
  }
}

function drawTitle(doc, project) {
  const titleY = 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const titleText = 'M\u00C4NGELLISTE';
  const titleW = doc.getTextWidth(titleText);
  const titleX = PAGE_W / 2;
  doc.text(titleText, titleX, titleY, { align: 'center' });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(titleX - titleW / 2, titleY + 2, titleX + titleW / 2, titleY + 2);

  doc.setFontSize(11);
  const dateStr = new Date(project.createdAt).toLocaleDateString('de-DE');
  doc.text(`Begehung vom ${dateStr}`, titleX, titleY + 16, { align: 'center' });

  return titleY + 24;
}

function drawGrayBar(doc, text, y) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const lines = doc.splitTextToSize(text, CONTENT_W - 10);
  const lineH = 14;
  const barH = Math.max(20, lines.length * lineH + 8);

  doc.setFillColor(180, 180, 180);
  doc.rect(MARGIN, y, CONTENT_W, barH, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, y, CONTENT_W, barH, 'S');

  doc.setTextColor(0, 0, 0);
  doc.text(lines, MARGIN + 5, y + 13);

  return y + barH;
}

function drawFrame(doc, frameTop, imgData) {
  const frameBottom = FOOTER_Y - 15;
  const frameH = frameBottom - frameTop;
  const photoH = frameH - BEHOBEN_H;
  const behobenTop = frameTop + photoH;
  const colW = CONTENT_W / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Outer frame (photo + behoben combined)
  doc.rect(MARGIN, frameTop, CONTENT_W, frameH, 'S');

  // Horizontal line separating photo from behoben
  doc.line(MARGIN, behobenTop, MARGIN + CONTENT_W, behobenTop);

  // Vertical divider in behoben section
  doc.line(MARGIN + colW, behobenTop, MARGIN + colW, frameBottom);

  // Horizontal line for behoben header row (18pt from top of behoben)
  const behobenHeaderH = 18;
  doc.line(MARGIN, behobenTop + behobenHeaderH, MARGIN + CONTENT_W, behobenTop + behobenHeaderH);

  // Behoben labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Behoben am', MARGIN + 4, behobenTop + 13);
  doc.text('Behoben von', MARGIN + colW + 4, behobenTop + 13);

  // Place photo centered in the photo area
  if (imgData) {
    try {
      const padding = 6;
      const maxImgW = CONTENT_W - padding * 2;
      const maxImgH = photoH - padding * 2;

      if (imgData._img) {
        const imgAspect = imgData._img.width / imgData._img.height;
        let imgW = maxImgW;
        let imgH = imgW / imgAspect;
        if (imgH > maxImgH) {
          imgH = maxImgH;
          imgW = imgH * imgAspect;
        }

        const imgX = MARGIN + (CONTENT_W - imgW) / 2;
        const imgY = frameTop + (photoH - imgH) / 2;
        doc.addImage(imgData.src, 'JPEG', imgX, imgY, imgW, imgH);
      }
    } catch (e) {
      console.error('Failed to add image to PDF', e);
    }
  }
}

function drawFooter(doc, project, pageNum) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let footerText = project.name;
  if (project.address) {
    footerText += ', ' + project.address;
  }
  doc.text(footerText, MARGIN, FOOTER_Y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Seite ${pageNum} von ${TOTAL_PAGES_PLACEHOLDER}`,
    PAGE_W - MARGIN,
    FOOTER_Y,
    { align: 'right' }
  );
}

export async function generatePDF(project, defects) {
  const doc = new jsPDF('p', 'pt', 'a4');

  for (let i = 0; i < defects.length; i++) {
    if (i > 0) doc.addPage();
    const defect = defects[i];

    drawHeader(doc);
    let y = drawTitle(doc, project);

    let descText = '';
    if (defect.location && defect.description) {
      descText = `${defect.location} \u2013 ${defect.description}`;
    } else {
      descText = defect.description || defect.location || 'Mangel ohne Beschreibung';
    }
    y = drawGrayBar(doc, descText, y);

    // Prepare image data
    let imgPayload = null;
    if (defect.imageData) {
      let imgSrc = defect.imageData;
      if (defect.annotations && defect.annotations.length > 0 && defect.canvasWidth) {
        try {
          imgSrc = await burnAnnotations(defect.imageData, defect.annotations, defect.canvasWidth);
        } catch (e) {
          console.error('Failed to burn annotations', e);
        }
      }
      try {
        const img = await loadImage(imgSrc);
        imgPayload = { src: imgSrc, _img: img };
      } catch (e) {
        console.error('Failed to load image', e);
      }
    }

    drawFrame(doc, y, imgPayload);
    drawFooter(doc, project, i + 1);
  }

  if (defects.length === 0) {
    drawHeader(doc);
    drawTitle(doc, project);
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text('Keine M\u00E4ngel dokumentiert.', MARGIN, 160);
    drawFooter(doc, project, 1);
  }

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
