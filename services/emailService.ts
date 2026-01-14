
import emailjs from '@emailjs/browser';

// Identifiants EmailJS configurés
const SERVICE_ID = 'service_3mh4mah';
const TEMPLATE_ID = 'template_8ksf2hg';
const PUBLIC_KEY = 'SERB24v_WSISCjApy';

/**
 * Envoie un email d'invitation au nouveau garage via EmailJS
 */
export const sendInvitationEmail = async (email: string, role: string, tempPassword: string) => {
  if (!email || !email.trim()) {
      throw new Error("L'adresse email est manquante ou invalide.");
  }

  try {
    const inviteLink = window.location.origin; // Lien vers la page d'accueil de ton SaaS
    const cleanEmail = email.trim();

    // On passe l'email sous plusieurs clés courantes pour s'adapter à la config du template EmailJS
    // Variable user_password EXPLICITEMENT passée ici comme demandé
    const templateParams = {
      to_email: cleanEmail,        // Convention standard
      email: cleanEmail,           // Souvent utilisé par défaut dans les templates
      user_email: cleanEmail,      // Autre variante fréquente
      recipient: cleanEmail,       // Autre variante
      
      role: role === 'user_premium' ? 'Premium' : 'Standard',
      invite_link: inviteLink,
      
      // Variables pour le mot de passe (correspondance avec le template {{user_password}})
      user_password: tempPassword,
      password: tempPassword,
      temp_password: tempPassword,
      
      message: `Vous avez été invité à rejoindre GaragePro en tant que membre ${role === 'user_premium' ? 'Premium' : 'Standard'}. Cliquez sur le lien pour vous connecter. Votre mot de passe temporaire est : ${tempPassword}`
    };

    console.log("Tentative d'envoi EmailJS vers:", cleanEmail);

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    if (response.status !== 200) {
      throw new Error(`Erreur Status ${response.status}: ${response.text}`);
    }

    return true;
  } catch (error: any) {
    console.error("Détails erreur EmailJS:", error);
    
    // Extraction propre du message d'erreur pour l'afficher dans l'UI
    let errorMessage = "Impossible d'envoyer l'email.";
    
    if (typeof error === 'string') {
        errorMessage = error;
    } else if (error?.text) {
        // Erreur typique renvoyée par l'API EmailJS (ex: "The recipients address is empty")
        errorMessage = error.text;
    } else if (error?.message) {
        errorMessage = error.message;
    } else {
        try {
            errorMessage = JSON.stringify(error);
        } catch (e) {
            errorMessage = "Erreur inconnue (objet non lisible)";
        }
    }

    throw new Error(errorMessage);
  }
};
