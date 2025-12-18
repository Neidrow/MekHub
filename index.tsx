
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Impossible de trouver l'élément racine #root");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erreur fatale au rendu React:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; text-align: center;">
        <h1 style="color: #e11d48;">Erreur de chargement</h1>
        <p>L'application n'a pas pu démarrer. Vérifiez la console de votre navigateur.</p>
      </div>
    `;
  }
}
