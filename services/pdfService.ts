
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Devis, Client, Vehicule, GarageSettings } from '../types';

export const generateQuotePDF = (d: Devis, client: Client | undefined, vehicule: Vehicule | undefined, settings: GarageSettings | null) => {
  const doc = new jsPDF();
  
  let vatPercent = settings?.tva !== undefined ? settings.tva : 20;
  if (d.montant_ht && d.montant_ht > 0) {
      const calc = ((d.montant_ttc - d.montant_ht) / d.montant_ht) * 100;
      vatPercent = Math.round(calc * 10) / 10;
  }

  // Logo
  if (settings?.logo_url) {
    try { doc.addImage(settings.logo_url, 'JPEG', 15, 15, 30, 30); } catch (e) { console.warn("Logo error", e); }
  }

  // En-tête Garage
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(settings?.nom || "Garage", 15, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.adresse || "", 15, 62);
  doc.text(`${settings?.email} | ${settings?.telephone}`, 15, 68);
  doc.text(`SIRET: ${settings?.siret}`, 15, 74);
  
  // Mentions Légales TVA
  if (vatPercent > 0 && settings?.tva_intracom) {
     doc.text(`TVA Intracom : ${settings.tva_intracom}`, 15, 80);
  } else if (vatPercent === 0) {
     doc.setFontSize(9);
     doc.setFont("helvetica", "italic");
     doc.text("TVA non applicable, art. 293B du CGI", 15, 80);
     doc.setFont("helvetica", "normal");
     doc.setFontSize(10);
  }

  // Info Devis
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Bleu
  doc.text("DEVIS", 150, 25, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`N° ${d.numero_devis}`, 150, 32, { align: 'right' });
  doc.text(`Émis le : ${new Date(d.date_devis).toLocaleDateString('fr-FR')}`, 150, 38, { align: 'right' });
  
  const validityDays = settings?.validite_devis || 30;
  const dateDevis = new Date(d.date_devis);
  const dateValidite = new Date(dateDevis);
  dateValidite.setDate(dateDevis.getDate() + validityDays);
  
  doc.setFontSize(9);
  doc.text(`Valable jusqu'au : ${dateValidite.toLocaleDateString('fr-FR')}`, 150, 44, { align: 'right' });

  // Encadré Client
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, 50, 80, 40, 2, 2, 'F');
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Client", 125, 58);
  doc.setFont("helvetica", "normal");
  if (client) {
    doc.text(`${client.nom} ${client.prenom}`, 125, 65);
    doc.text(client.adresse || "", 125, 71);
    doc.text(client.telephone || "", 125, 77);
  }

  // Info Véhicule
  if (vehicule) {
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(`Véhicule : ${vehicule.marque} ${vehicule.modele} - ${vehicule.immatriculation} (${vehicule.kilometrage} km)`, 15, 95);
  }

  // Tableau
  const tableBody = (d.items || []).map(item => [
    item.description, item.quantity, `${item.unitPrice.toFixed(2)} €`, `${item.total.toFixed(2)} €`
  ]);

  autoTable(doc, {
    startY: 105,
    head: [['Description', 'Qté', 'Prix Unit.', 'Total HT']],
    body: tableBody,
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } }
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Totaux
  doc.setFont("helvetica", "bold");
  doc.text(`Total HT :`, 140, finalY);
  doc.text(`${d.montant_ht.toFixed(2)} €`, 190, finalY, { align: 'right' });
  
  if (vatPercent > 0) {
    doc.text(`TVA (${vatPercent}%) :`, 140, finalY + 6);
    doc.text(`${(d.montant_ttc - d.montant_ht).toFixed(2)} €`, 190, finalY + 6, { align: 'right' });
  }
  
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`Total TTC :`, 140, finalY + 14);
  doc.text(`${d.montant_ttc.toFixed(2)} €`, 190, finalY + 14, { align: 'right' });

  finalY += 30; 
  
  // Zone Signature
  doc.setDrawColor(200);
  doc.rect(15, finalY, 180, 40);

  if ((d.statut === 'accepte' || d.statut === 'refuse') && d.signature_metadata) {
      const isAccepted = d.statut === 'accepte';
      const color = isAccepted ? [37, 99, 235] : [225, 29, 72]; // Bleu ou Rouge
      
      doc.setFontSize(12);
      // @ts-ignore
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      const title = isAccepted ? "DEVIS ACCEPTÉ ET SIGNÉ ÉLECTRONIQUEMENT" : "DEVIS REFUSÉ PAR LE CLIENT";
      doc.text(title, 20, finalY + 10);
      
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      
      const sig = d.signature_metadata;
      doc.text(`Signataire : ${sig.signed_by}`, 20, finalY + 18);
      doc.text(`Date : ${new Date(sig.signed_at).toLocaleString('fr-FR')}`, 20, finalY + 23);
      
      doc.setFontSize(6);
      doc.setTextColor(100);
      
      // Modification ici : Ne plus afficher "IP: Masquée" si pas d'IP.
      // On affiche uniquement l'empreinte UserAgent.
      let proofText = `Empreinte numérique : ${sig.user_agent.substring(0, 60)}...`;
      
      // Si on a vraiment une IP (cas futur), on l'affiche, sinon rien.
      if (sig.ip_address && sig.ip_address !== 'IP_NOT_CAPTURED_CLIENT_SIDE') {
          proofText += ` (IP: ${sig.ip_address})`;
      }
      
      doc.text(proofText, 20, finalY + 35);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`" ${sig.consent_text} "`, 110, finalY + 18);

  } else if (d.statut === 'accepte') {
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.text("DEVIS ACCEPTÉ (Validation Manuelle)", 20, finalY + 12);
  } else {
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Validation du devis", 20, finalY + 8);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Date et Signature du client :", 20, finalY + 15);
      
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text("(Précédée de la mention manuscrite 'Bon pour accord')", 20, finalY + 20);
  }
  
  // Footer
  doc.setTextColor(0);
  const pageHeight = doc.internal.pageSize.height;
  let footerY = pageHeight - 35;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const paymentTerms = settings?.conditions_paiement || "Paiement à réception";
  doc.text(`Conditions de paiement : ${paymentTerms}`, 15, footerY);
  footerY += 5;

  if (settings?.penalites_retard) {
     const splitPenalties = doc.splitTextToSize(`Pénalités de retard : ${settings.penalites_retard}`, 180);
     doc.text(splitPenalties, 15, footerY);
     footerY += (splitPenalties.length * 4);
  } else {
     doc.text(`Pénalités de retard : Taux légal en vigueur.`, 15, footerY);
     footerY += 5;
  }

  doc.text("Devis Gratuit", 15, footerY); 
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Document généré et signé via GaragePro SaaS", 105, pageHeight - 10, { align: 'center' });

  return doc;
};
