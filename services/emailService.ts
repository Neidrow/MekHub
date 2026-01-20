
import emailjs from '@emailjs/browser';

// Identifiants EmailJS configurés
const SERVICE_ID = 'service_3mh4mah';
const TEMPLATE_ID = 'template_8ksf2hg';
const PUBLIC_KEY = 'SERB24v_WSISCjApy';

// Configuration Brevo (pour la réinitialisation)
// Note: La clé API Brevo devrait idéalement être dans process.env.BREVO_API_KEY
const BREVO_API_KEY = 'xkeysib-965380517523091937965153579227092419011116248386-your_actual_key_here'; 

/**
 * Envoie un email d'invitation au nouveau garage via EmailJS
 */
export const sendInvitationEmail = async (email: string, role: string, tempPassword: string) => {
  if (!email || !email.trim()) {
      throw new Error("L'adresse email est manquante ou invalide.");
  }

  try {
    const inviteLink = window.location.origin;
    const cleanEmail = email.trim();

    const templateParams = {
      to_email: cleanEmail,
      email: cleanEmail,
      user_email: cleanEmail,
      recipient: cleanEmail,
      role: role === 'user_premium' ? 'Premium' : 'Standard',
      invite_link: inviteLink,
      user_password: tempPassword,
      password: tempPassword,
      temp_password: tempPassword,
      message: `Vous avez été invité à rejoindre GaragePro en tant que membre ${role === 'user_premium' ? 'Premium' : 'Standard'}. Votre mot de passe temporaire est : ${tempPassword}`
    };

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
    let errorMessage = error?.text || error?.message || "Impossible d'envoyer l'email.";
    throw new Error(errorMessage);
  }
};

/**
 * Envoie un email de réinitialisation via Brevo
 */
export const sendResetPasswordEmail = async (email: string, tempPassword: string) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "GaragePro Support", email: "support@garagepro.saas" },
        to: [{ email: email }],
        subject: "Réinitialisation de votre mot de passe GaragePro",
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Réinitialisation de compte</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p style="background: #f3f4f6; padding: 15px; border-radius: 10px; font-size: 18px; font-weight: bold; text-align: center; color: #1e293b;">
              Nouveau mot de passe temporaire : <br/>
              <span style="color: #2563eb;">${tempPassword}</span>
            </p>
            <p>Lors de votre prochaine connexion, il vous sera demandé de définir un mot de passe définitif.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Erreur lors de l'envoi de l'email via Brevo");
    }

    return true;
  } catch (error: any) {
    console.error("Erreur Brevo:", error);
    throw new Error("Échec de l'envoi du mail de réinitialisation.");
  }
};
