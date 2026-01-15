
// Service IA utilisant Groq (Llama 3.3)
import { UserRole } from '../types';
import { api } from './api';

// LIMITES
const BASIC_HOURLY_LIMIT = 10;
const PREMIUM_HOURLY_LIMIT = 100;
const MAX_WORDS = 1200;

// Fonction utilitaire pour récupérer la clé API
const getApiKey = (): string | undefined => {
  // 1. Vérifie les variables d'environnement (Vercel / Local)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  // 2. Clé de secours pour les tests (Configuration directe demandée)
  return "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";
};

// --- LOGIQUE DE QUOTAS VIA SUPABASE ---
const checkUsage = async (userId: string, role: UserRole) => {
    // Récupérer le compte réel depuis la DB
    const currentCount = await api.getAiUsageCount(userId);
    
    // Définir la limite
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Fonction générique pour appeler l'API Groq avec Retry & Backoff
const callGroqAPI = async (messages: any[]) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
            },
            body: JSON.stringify({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 1024,
            })
        });

        if (response.status === 429) {
            // Rate Limit Hit
            if (attempt === MAX_RETRIES) {
                throw new Error("⚠️ Service surchargé (Trop de requêtes globales). Veuillez réessayer dans une minute.");
            }
            // Backoff: 2s, 4s, 8s
            const delay = 2000 * Math.pow(2, attempt);
            console.warn(`Rate limit 429. Retrying in ${delay}ms...`);
            await sleep(delay);
            attempt++;
            continue;
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `Groq Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";

    } catch (error: any) {
        // Si c'est notre erreur 429 custom ou une erreur fatale, on throw
        if (attempt === MAX_RETRIES || error.message.includes("Service surchargé")) {
            throw error;
        }
        attempt++;
        await sleep(1000); // Petit délai pour les erreurs réseau standard
    }
  }
  throw new Error("Echec de connexion au service IA.");
};

export const getDiagnosticSuggestions = async (symptoms: string, userId: string, role: UserRole) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  
  try {
      // 1. Check Word Count
      checkWordCount(symptoms);
      
      // 2. Check User Quota (Server Side Check)
      await checkUsage(userId, role);

      const apiKey = getApiKey();
      if (!apiKey) {
        return localExpertDiagnostic(symptoms, "⚠️ CLÉ API MANQUANTE");
      }

      // 3. Call API
      const result = await callGroqAPI([
        { role: "system", content: DIAGNOSTIC_SYSTEM_PROMPT },
        { role: "user", content: `Symptômes du véhicule : "${symptoms}"` }
      ]);
      
      // 4. Log Usage only on success (Server Side)
      await api.logAiUsage(userId);

      return result || localExpertDiagnostic(symptoms);

  } catch (error: any) {
    console.error("❌ ERREUR API IA :", error);
    
    // Si c'est une erreur de quota ou de mot, on l'affiche directement
    if (error.message.includes('Quota') || error.message.includes('Texte trop long') || error.message.includes('Service surchargé')) {
        throw error; // Remonter l'erreur à l'UI
    }
    
    // Sinon fallback soft
    let userMessage = "⚠️ Erreur de connexion.";
    if (error.message === "API_KEY_MISSING") userMessage = "⚠️ Clé API manquante.";
    
    return localExpertDiagnostic(symptoms, userMessage);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string, userId: string, role: UserRole) => {
  const fallbackMessage = `Bonjour ${customerName}, les travaux suivants sont terminés : ${serviceDetails}. Vous pouvez récupérer votre véhicule. Cordialement.`;

  try {
    // 1. Check Word Count
    checkWordCount(serviceDetails);

    // 2. Check User Quota
    await checkUsage(userId, role);

    const apiKey = getApiKey();
    if (!apiKey) return fallbackMessage;

    // 3. Call API
    const result = await callGroqAPI([
      { role: "system", content: "Tu es un assistant administratif de garage automobile. Tu rédiges des SMS courts et professionnels." },
      { role: "user", content: `Rédige un SMS pour un client.
      Nom Client : ${customerName}
      Contexte : ${serviceDetails}
      
      CONSIGNES :
      - Court, poli et factuel (format SMS).
      - Pas d'objet, pas de titre.
      - Ne signe pas (le système l'ajoute).` }
    ]);
    
    // 4. Log Usage
    await api.logAiUsage(userId);

    return result || fallbackMessage;
  } catch (error: any) {
    console.error("Erreur IA Message:", error);
    if (error.message.includes('Quota') || error.message.includes('Texte trop long')) {
        throw error;
    }
    return fallbackMessage;
  }
};
