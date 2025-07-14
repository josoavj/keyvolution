'use strict';

const {
  BasicPitch,
  outputToNotesPoly,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
} = require('@spotify/basic-pitch');

const fetch = require('node-fetch');
global.fetch = fetch; // simulate browser fetch() for tfjs

const path = require('path');
const tf = require('@tensorflow/tfjs'); // ✅ tfjs classique, pas tfjs-node

// ✅ Chemin absolu vers ton modèle local
const MODEL_PATH = `file://${path.resolve(__dirname, '../../../../public/basic-pitch-model/model.json')}`;

let basicPitchInstance = null;

// ✅ Chargement unique du modèle
async function loadModelOnce() {
  if (!basicPitchInstance) {
    await tf.setBackend('cpu');
    await tf.ready();

    const model = await tf.loadGraphModel(MODEL_PATH);
    basicPitchInstance = new BasicPitch(model);
    console.log('✅ Modèle BasicPitch chargé avec succès');
  }
  return basicPitchInstance;
}

module.exports = {
  async transcribe(ctx) {
    const { id } = ctx.params;

    // 1. Récupération de l'entrée musique
    const musicEntry = await strapi.entityService.findOne('api::musique.musique', id, {
      populate: ['MusicFile'],
    });

    if (!musicEntry || !musicEntry.MusicFile) {
      return ctx.badRequest("Fichier audio introuvable.");
    }

    const fileUrl = musicEntry.MusicFile.url.startsWith('http')
      ? musicEntry.MusicFile.url
      : `http://localhost:1337${musicEntry.MusicFile.url}`;

    // 2. Téléchargement du MP3
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer); // Pour futur décodage audio

    // 3. Chargement du modèle
    await loadModelOnce();

    // 4. Simulation de transcription (à remplacer plus tard par vraie analyse)
    const simulatedNotes = [
      { midi: 60, startTime: 0.5, endTime: 1.0, velocity: 0.8 },
      { midi: 62, startTime: 1.0, endTime: 1.5, velocity: 0.7 },
    ];

    // 5. Mise à jour de l’entrée avec la partition
    const updated = await strapi.entityService.update('api::musique.musique', id, {
      data: {
        Partition: simulatedNotes,
      },
    });

    if (ctx.send) {
      return ctx.send(updated);
    }

    return updated;
  },
};
