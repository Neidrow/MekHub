
import { GoogleGenAI } from "@google/genai";

// Prompt système expert pour le diagnostic mécanique
const DIAGNOSTIC_SYSTEM_PROMPT = `Tu es un Expert Technique Automobile expérimenté. Tu t'adresses à un technicien en atelier.

🎯 OBJECTIF : 
Fournir un diagnostic rapide, pertinent et technique pour orienter le technicien vers la panne.

🗣️ TON ET STYLE : 
- Professionnel, direct et technique (style "Chef d'atelier" parlant à son équipe).
- Utilise le vocabulaire métier précis (ex: "Vanne EGR", "Silentbloc", "Sonde Lambda", "Débitmètre").
- Ne vulgarise pas à outrance : ton interlocuteur connaît la mécanique.
- Va à l'essentiel : Symptôme -> Cause Technique -> Méthode de contrôle.

⛔ FORMATTAGE (Respect strict) :
- PAS de Markdown (ni gras **, ni titres ##).
- Utilise des MAJUSCULES pour mettre en évidence les PIÈCES et les ACTIONS CRITIQUES.
- Utilise les emojis indiqués pour structurer visuellement.

🧾 STRUCTURE DE RÉPONSE OBLIGATOIRE :

🔍 ANALYSE RAPIDE
[Reformulation technique synthétique du problème identifié]

📉 HYPOTHÈSES PRIORITAIRES
1️⃣ [NOM DE LA PIÈCE/PANNE EN MAJUSCULES]
   ↳ [Explication technique concise : pourquoi cette pièce cause ce symptôme]

2️⃣ [NOM DE LA PIÈCE/PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

3️⃣ [NOM DE LA PIÈCE/PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

🛠️ PROCÉDURE DE CONTRÔLE
👉 [ACTION 1 EN MAJUSCULES] : [Détail technique (ex: relever les codes défauts, vérifier les valeurs réelles, inspection visuelle)]
👉 [ACTION 2 EN MAJUSCULES] : [Détail technique (ex: test actionneur, mesure résistance)]
👉 [ACTION 3 EN MAJUSCULES] : [Détail technique]

⚠️ VIGILANCE
[Point de sécurité ou erreur de diagnostic fréquente à éviter]

💡 L'AVIS DE L'EXPERT
[Une astuce de métier pour gagner du temps sur ce type de panne]`;

const localExpertDiagnostic = (symptoms: string): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "🛠️ DIAGNOSTIC LOCAL (MODE HORS LIGNE)\n\n";
  
  if (s.includes('frein')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ USURE DES PLAQUETTES\n   ↳ Garniture inférieure à la cote mini constructeur.\n2️⃣ DISQUES VOILÉS\n   ↳ Voile hors tolérance provoquant des vibrations au freinage.\n\n🛠️ PROCÉDURE DE CONTRÔLE\n👉 DÉPOSER LES ROUES : Inspection visuelle des étriers et coulisseaux.\n👉 MESURE AU COMPARATEUR : Contrôler le voile du disque.\n";
  } else if (s.includes('batterie') || s.includes('démarrage')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ BATTERIE HS\n   ↳ Élément en court-circuit ou capacité insuffisante (CCA).\n2️⃣ CIRCUIT DE CHARGE DÉFAILLANT\n   ↳ Alternateur ou régulateur ne délivrant plus la tension requise.\n\n🛠️ PROCÉDURE DE CONTRÔLE\n👉 TEST MULTIMÈTRE : Tension repos (<12.3V = critique) et moteur tournant (cible 13.5V-14.5V).\n👉 TEST DE CHARGE : Vérifier la chute de tension sous action démarreur.\n";
  } else {
    suggestions += "🔍 ANALYSE RAPIDE\nSymptôme générique nécessitant investigation approfondie.\n\n🛠️ PROCÉDURE DE CONTRÔLE\n👉 LECTURE CODES DÉFAUTS : Interroger les calculateurs via la prise OBD.\n👉 ESSAI ROUTIER : Reproduire le défaut en conditions réelles pour affiner le diagnostic.\n";
  }
  
  return suggestions + "\n⚠️ Connexion API instable - Mode secours.";
};

export const getDiagnosticSuggestions = async (symptoms: string) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Symptômes du véhicule : "${symptoms}"`,
      config: {
        systemInstruction: DIAGNOSTIC_SYSTEM_PROMPT,
        temperature: 0.2, 
      },
    });
    return response.text || localExpertDiagnostic(symptoms);
  } catch (error) {
    console.error("Erreur IA Diagnostic:", error);
    return localExpertDiagnostic(symptoms);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un SMS professionnel pour un client garage nommé ${customerName}.
      Sujet : ${serviceDetails}.
      Consignes : Court, poli, factuel. Pas de titre, juste le corps du message.`,
    });
    return response.text || `Bonjour ${customerName}, travaux terminés : ${serviceDetails}. Cordialement, L'Atelier.`;
  } catch (error) {
    console.error("Erreur IA Message:", error);
    return `Bonjour ${customerName}, concernant votre véhicule : ${serviceDetails}. Merci de nous contacter.`;
  }
};
