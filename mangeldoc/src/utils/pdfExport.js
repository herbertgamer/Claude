import { jsPDF } from 'jspdf';
import { burnAnnotations } from './imageUtils';

export async function generatePDF(project, defects) {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  // Title page
  doc.setFontSize(28);
  doc.setTextColor(212, 98, 11); // #D4620B
  doc.text('MängelDoc', margin, 80);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Mängelbericht', margin, 100);

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(project.name, margin, 150);

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  let y = 180;
  if (project.address) {
    doc.text(`Adresse: ${project.address}`, margin, y);
    y += 20;
  }
  if (project.inspectionType) {
    doc.text(`Prüfart: ${project.inspectionType}`, margin, y);
    y += 20;
  }
  doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, margin, y);
  y += 40;

  const openCount = defects.filter(d => d.status !== 'behoben').length;
  const fixedCount = defects.filter(d => d.status === 'behoben').length;

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Zusammenfassung`, margin, y);
  y += 25;
  doc.setFontSize(12);
  doc.text(`Gesamt: ${defects.length} Mängel`, margin, y);
  y += 18;
  doc.setTextColor(196, 43, 43);
  doc.text(`Offen: ${openCount}`, margin, y);
  y += 18;
  doc.setTextColor(27, 125, 58);
  doc.text(`Behoben: ${fixedCount}`, margin, y);

  // Defect pages
  for (let i = 0; i < defects.length; i++) {
    const defect = defects[i];
    doc.addPage();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`Mangel #${i + 1}`, margin, 50);

    // Status badge
    const statusText = defect.status === 'behoben' ? 'Behoben' : 'Offen';
    const statusColor = defect.status === 'behoben' ? [27, 125, 58] : [196, 43, 43];
    doc.setFontSize(10);
    doc.setTextColor(...statusColor);
    doc.text(statusText, margin + 120, 50);

    let currentY = 70;

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
        let imgW = contentW;
        let imgH = imgW / imgAspect;
        const maxImgH = pageH - currentY - margin - 100; // leave space for text
        if (imgH > maxImgH) {
          imgH = maxImgH;
          imgW = imgH * imgAspect;
        }
        doc.addImage(imgData, 'JPEG', margin, currentY, imgW, imgH);
        currentY += imgH + 15;
      } catch (e) {
        console.error('Failed to add image to PDF', e);
      }
    }

    // Details
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    if (defect.location) {
      doc.text(`Bereich: ${defect.location}`, margin, currentY);
      currentY += 18;
    }
    if (defect.description) {
      const lines = doc.splitTextToSize(`Beschreibung: ${defect.description}`, contentW);
      doc.text(lines, margin, currentY);
    }
  }

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
  doc.save(`${project.name}-Maengelbericht.pdf`);
}

export async function sharePDF(project, defects) {
  const doc = await generatePDF(project, defects);
  const blob = doc.output('blob');
  const file = new File([blob], `${project.name}-Maengelbericht.pdf`, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `Mängelbericht - ${project.name}`,
      files: [file],
    });
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
