
import { UserRole } from '../types';
import { api } from './api';

// LIMITES
const BASIC_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 100;
const MAX_WORDS = 1200;

// Configuration GROQ
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Modèle mis à jour (l'ancien llama3-70b-8192 est déprécié)
const GROQ_MODEL = "llama-3.3-70b-versatile";
// Clé API fournie par l'utilisateur
const GROQ_API_KEY = "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";

// -- Logic for usage quotas --
const checkUsage = async (userId: string, role: UserRole) => {
    const currentCount = await api.getAiUsageCount(userId);
    const limit = (role === 'user_premium' || role === 'super_admin') ? PREMIUM_DAILY_LIMIT : BASIC_DAILY_LIMIT;
    
    if (currentCount >= limit) {
        throw new Error(`⚠️ Quota atteint (${currentCount}/${limit} par jour). Passez en Premium pour plus de diagnostics.`);
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

const callGroqApi = async (messages: any[], temperature: number = 0.2) => {
  if (!GROQ_API_KEY) throw new Error("Clé API interne manquante.");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: messages,
      model: GROQ_MODEL,
      temperature: temperature,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Erreur Groq détaillée:", errorData);
    const message = errorData.error?.message || `Erreur HTTP ${response.status}`;
    throw new Error(`API Groq: ${message}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

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
  
  return suggestions + "\n\n" + (errorMessage || "⚠️ Erreur de connexion au service IA (Groq).");
};

export const getDiagnosticSuggestions = async (symptoms: string, userId: string, role: UserRole) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  
  try {
      checkWordCount(symptoms);
      await checkUsage(userId, role);

      const responseText = await callGroqApi([
        { role: "system", content: DIAGNOSTIC_SYSTEM_PROMPT },
        { role: "user", content: `Symptômes du véhicule : "${symptoms}"` }
      ], 0.2);
      
      await api.logAiUsage(userId);
      return responseText;

  } catch (error: any) {
    console.error("❌ ERREUR API IA :", error);
    
    if (error.message.includes('Quota') || error.message.includes('Texte trop long')) {
        throw error;
    }
    
    return localExpertDiagnostic(symptoms, `⚠️ Problème connexion IA : ${error.message}`);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string, userId: string, role: UserRole) => {
  const fallbackMessage = `Bonjour ${customerName}, concernant votre véhicule : ${serviceDetails}. N'hésitez pas à nous contacter pour plus d'informations. Cordialement.`;

  try {
    checkWordCount(serviceDetails);
    await checkUsage(userId, role);

    const systemPrompt = `Tu es le secrétaire expert d'un garage automobile prestigieux.
    TA MISSION : Rédiger un SMS pour un client spécifique.
    
    CONTRAINTES :
    1. Le message doit être UNIQUE, courtois, professionnel et chaleureux. Ne répète jamais la même formule mot pour mot.
    2. Utilise le nom du client (${customerName}) de manière naturelle.
    3. Le message doit être basé précisément sur l'objet fourni.
    4. Format SMS : court, concis, pas d'objet de mail, pas de signature explicite (le système l'ajoute).
    5. Sois créatif dans la formulation tout en restant très pro.`;

    const userPrompt = `Rédige un message pour :
      Client : ${customerName}
      Objet / Contexte : ${serviceDetails}`;

    // Température augmentée à 0.7 pour plus de créativité et d'unicité
    const responseText = await callGroqApi([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ], 0.7);
    
    await api.logAiUsage(userId);
    return responseText || fallbackMessage;

  } catch (error: any) {
    console.error("Erreur IA Message:", error);
    if (error.message.includes('Quota') || error.message.includes('Texte trop long')) {
        throw error;
    }
    return fallbackMessage;
  }
};
