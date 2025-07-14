// src/addsong.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import IntegratedMusicSystem from './IntegratedMusicSystem';

function showMusicProcessor() {
  const modal = document.getElementById("songModal");
  const container = document.getElementById("modalFormContainer");

  if (container) {
    container.innerHTML = ''; // Nettoie
    const reactContainer = document.createElement('div');
    container.appendChild(reactContainer);

    const root = createRoot(reactContainer);
    root.render(<IntegratedMusicSystem />);
    modal.classList.remove('hidden');
  } else {
    console.error("Le conteneur modalFormContainer est introuvable.");
  }
}

// ✅ Rendez la fonction accessible globalement
window.showMusicProcessor = showMusicProcessor;
