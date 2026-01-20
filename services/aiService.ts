
// Service IA utilisant Google Gemini API
import { GoogleGenAI } from "@google/genai";
import { UserRole } from '../types';
import { api } from './api';

// LIMITES
const BASIC_HOURLY_LIMIT = 10;
const PREMIUM_HOURLY_LIMIT = 100;
const MAX_WORDS = 1200;

// -- Logic for usage quotas --
const checkUsage = async (userId: string, role: UserRole) => {
    const currentCount = await api.getAiUsageCount(userId);
    const limit = (role === 'user_premium' || role === 'super_admin') ? PREMIUM_HOURLY_LIMIT : BASIC_HOURLY_LIMIT;
    
    if (currentCount >= limit) {
        throw new Error(`⚠️ Quota atteint (${currentCount}/${limit} par heure). Passez en Premium pour plus de diagnostics.`);
    }

    return currentCount;
};

const checkWordCount = (text: string) => {
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > MAX_WORDS) {
        throw new Error(`⚠️ Texte trop long (${wordCount}/${MAX_WORDS} mots). Veuillez raccourcir votre demande.`);
    }
};

// Prompt système expert pour le diagnostic mécanique
const DIAGNOSTIC_SYSTEM_PROMPT = `Tu es un Chef d'Atelier Expert Automobile. Tu assistes un mécanicien professionnel.

🎯 OBJECTIF : 
Donner un diagnostic structuré, priorisé et directement exploitable à l'atelier.

🗣️ TON ET STYLE : 
- Parle de pro à pro : sois technique, précis, mais pédagogue.
- Va droit au but. Pas de phrases inutiles.
- Utilise le vocabulaire métier (ex: "valise", "multimètre", "jeu axial", "encrassement").

⛔ FORMATTAGE (TRES IMPORTANT) :
- N'utilise PAS de gras markdown (**) car l'interface ne le gère pas.
- Pour mettre en évidence les PIÈCES et les ACTIONS, utilise des MAJUSCULES.
- Respecte strictement la structure ci-dessous avec les émojis.

🧾 STRUCTURE DE LA RÉPONSE :

🔍 ANALYSE RAPIDE
[Une phrase simple résumant le problème technique]

📉 HYPOTHÈSES PRIORITAIRES (Top 3)
1️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Pourquoi c'est le suspect n°1 : lien technique symptôme/cause]

2️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

3️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

🛠️ VÉRIFICATIONS ATELIER
👉 [ACTION 1 EN MAJUSCULES] : [Détail (ex: Lecture codes défauts, Contrôle visuel...)]
👉 [ACTION 2 EN MAJUSCULES] : [Détail (ex: Test des retours injecteurs, Prise de compressions)]
👉 [ACTION 3 EN MAJUSCULES] : [Détail (ex: Essai routier spécifique)]

⚠️ VIGILANCE
[Un point de sécurité ou une erreur de débutant à éviter]`;

const localExpertDiagnostic = (symptoms: string, errorMessage: string = ""): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "🛠️ DIAGNOSTIC LOCAL (MODE SECOURS)\n\n";
  
  if (s.includes('frein')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ PLAQUETTES DE FREIN HS\n   ↳ Garniture sous la cote minimale ou glacée.\n2️⃣ DISQUES VOILÉS\n   ↳ Si vibrations importantes ressenties dans la pédale.\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 DÉPOSER LES ROUES : Contrôle visuel de l'épaisseur et de l'état des surfaces.\n👉 CONTRÔLER LE VOILE : Utiliser un comparateur sur les disques.\n";
  } else if (s.includes('batterie') || s.includes('démarrage')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ BATTERIE DÉCHARGÉE OU HS\n   ↳ Élément en court-circuit ou manque de capacité (CCA).\n2️⃣ ALTERNATEUR DÉFAILLANT\n   ↳ Ne recharge plus la batterie (charbons usés, régulateur HS).\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 TESTER LA TENSION BATTERIE : Doit être > 12.5V à l'arrêt.\n👉 TESTER LA CHARGE : Moteur tournant, on doit avoir entre 13.5V et 14.5V.\n";
  } else {
    suggestions += "🔍 ANALYSE RAPIDE\nSymptôme générique nécessitant une investigation standard.\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 LECTURE CODES DÉFAUTS : Brancher la valise OBD pour relever les DTC.\n👉 ESSAI ROUTIER : Reproduire le défaut pour affiner le ressenti.\n";
  }
  
  return suggestions + "\n" + (errorMessage || "⚠️ Connexion API instable - Diagnostic générique affiché.");
};

export const getDiagnosticSuggestions = async (symptoms: string, userId: string, role: UserRole) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  
  try {
      checkWordCount(symptoms);
      await checkUsage(userId, role);

      // Create Gemini client instance - API key obtained from environment variable API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Complex text task
        contents: `Symptômes du véhicule : "${symptoms}"`,
        config: {
          systemInstruction: DIAGNOSTIC_SYSTEM_PROMPT,
          temperature: 0.2,
        },
      });
      
      await api.logAiUsage(userId);
      return response.text || localExpertDiagnostic(symptoms);

  } catch (error: any) {
    console.error("❌ ERREUR API GEMINI :", error);
    
    if (error.message.includes('Quota') || error.message.includes('Texte trop long')) {
        throw error;
    }
    
    return localExpertDiagnostic(symptoms, "⚠️ Erreur de connexion au service Gemini.");
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string, userId: string, role: UserRole) => {
  const fallbackMessage = `Bonjour ${customerName}, les travaux suivants sont terminés : ${serviceDetails}. Vous pouvez récupérer votre véhicule. Cordialement.`;

  try {
    checkWordCount(serviceDetails);
    await checkUsage(userId, role);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Basic text generation
      contents: `Rédige un SMS pour un client.
      Nom Client : ${customerName}
      Contexte : ${serviceDetails}`,
      config: {
        systemInstruction: "Tu es un assistant administratif de garage automobile. Tu rédiges des SMS courts et professionnels. CONSIGNES : - Court, poli et factuel (format SMS). - Pas d'objet, pas de titre. - Ne signe pas (le système l'ajoute).",
        temperature: 0.7,
      }
    });
    
    await api.logAiUsage(userId);
    return response.text || fallbackMessage;

  } catch (error: any) {
    console.error("Erreur Gemini Message:", error);
    if (error.message.includes('Quota') || error.message.includes('Texte trop long')) {
        throw error;
    }
    return fallbackMessage;
  }
};
