// ====== PARTIE 1: AJOUT DE MUSIQUE AVEC TRAITEMENT AUTOMATIQUE ======

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, Play, Pause, Volume2, FileAudio, Zap, Download, Save } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly
} from '@spotify/basic-pitch';

// Configuration TensorFlow
await tf.setBackend('cpu');
await tf.ready();

let basicPitchInstance = null;
const secretKey = window.api.apiKey; // À remplacer par ta clé

const IntegratedMusicSystem = () => {
  // États pour l'ajout de musique
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  
  // États pour le traitement
  const [processing, setProcessing] = useState(false);
  const [midiNotes, setMidiNotes] = useState([]);
  const [error, setError] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // États pour la sauvegarde
  const [saving, setSaving] = useState(false);
  const [savedSongId, setSavedSongId] = useState(null);
  
  const audioContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Fonction pour obtenir l'AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  function closeModal() {
    const modal = document.getElementById('songModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open'); // si tu as désactivé le scroll body
    }
  }

  // Gestion du drag & drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);
      setMidiNotes([]);
      setAnalysisComplete(false);
    } else {
      setAudioFile(null);
      setError('Veuillez sélectionner un fichier audio valide (MP3, WAV, etc.)');
    }
  };

  // Fonctions de traitement audio (reprises de ton composant)
  function resampleAudioBuffer(buffer, targetSampleRate = 22050) {
    return new Promise((resolve) => {
      const offlineContext = new OfflineAudioContext({
        numberOfChannels: buffer.numberOfChannels,
        length: buffer.duration * targetSampleRate,
        sampleRate: targetSampleRate,
      });

      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start(0);

      offlineContext.startRendering().then(resolve);
    });
  }

  function convertToMono(audioBuffer) {
    if (audioBuffer.numberOfChannels === 1) return audioBuffer;

    const monoBuffer = new AudioBuffer({
      length: audioBuffer.length,
      numberOfChannels: 1,
      sampleRate: audioBuffer.sampleRate,
    });

    const output = monoBuffer.getChannelData(0);
    const channelDataLeft = audioBuffer.getChannelData(0);
    const channelDataRight = audioBuffer.getChannelData(1);

    for (let i = 0; i < audioBuffer.length; i++) {
      output[i] = (channelDataLeft[i] + channelDataRight[i]) / 2;
    }

    return monoBuffer;
  }

  // ====== NOUVELLE FONCTION: WORKFLOW COMPLET ======
  const processAndSaveWorkflow = async () => {
    if (!audioFile || !title || !artist) {
      setError('Veuillez remplir tous les champs obligatoires (titre, artiste, fichier audio)');
      return;
    }

    setProcessing(true);
    setError(null);
    setSaving(false);

    try {
      // ÉTAPE 1: Traitement audio avec Basic Pitch
      console.log('🎵 Étape 1: Traitement audio...');
      
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const resampledBuffer = await resampleAudioBuffer(audioBuffer);
      const monoBuffer = convertToMono(resampledBuffer);

      // Charger le modèle Basic Pitch
      if (!basicPitchInstance) {
        const modelUrl = '../public/basic-pitch-model/model.json';
        const model = await tf.loadGraphModel(modelUrl);
        basicPitchInstance = new BasicPitch(model);
      }

      // Traitement avec Basic Pitch
      const frames = [];
      const onsets = [];
      const contours = [];

      await basicPitchInstance.evaluateModel(
        monoBuffer,
        (f, o, c) => {
          frames.push(...f);
          onsets.push(...o);
          contours.push(...c);
        },
        (progress) => {
          console.log(`Progression: ${progress}%`);
        }
      );

      // Conversion en notes MIDI
      const rawEvents = outputToNotesPoly(frames, onsets, 0.5, 0.5, 5);
      const eventsWithBends = addPitchBendsToNoteEvents(contours, rawEvents);
      const noteList = noteFramesToTime(eventsWithBends) || [];

      const notes = noteList
        .filter(n => n && typeof n.pitchMidi === 'number' && typeof n.startTimeSeconds === 'number')
        .map(n => ({
          midi: n.pitchMidi,
          startTime: n.startTimeSeconds,
          endTime: n.endTimeSeconds,
          velocity: n.amplitude || 0.8,
        }));

      setMidiNotes(notes);
      setAnalysisComplete(true);

      // ÉTAPE 2: Sauvegarde dans Strapi
      console.log('💾 Étape 2: Sauvegarde dans Strapi...');
      setSaving(true);
      await saveToStrapi(notes);

    } catch (err) {
      console.error("Erreur lors du workflow :", err);
      setError(`Échec du traitement : ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // ====== FONCTION DE SAUVEGARDE DANS STRAPI ======
  const saveToStrapi = async (notes) => {
    try {
      // 1. Upload des fichiers (audio + cover)
      const formData = new FormData();
      
      if (coverFile) {
        formData.append('files', coverFile);
      }
      
      if (audioFile) {
        formData.append('files', audioFile);
      }

      formData.append('path', 'api::musique.musique');
      formData.append('name', title);
      formData.append('data', JSON.stringify({
        Title: title,
        Artist: artist
      }));

      const uploadResponse = await fetch("http://localhost:1337/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `${secretKey}`
        },
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(`Erreur upload: ${JSON.stringify(uploadResult)}`);
      }

      // 2. Créer la partition JSON
      const partitionData = {
        title: title,
        artist: artist,
        notes: notes,
        generatedAt: new Date().toISOString(),
        metadata: {
          totalNotes: notes.length,
          duration: notes.length > 0 ? Math.max(...notes.map(n => n.endTime)) : 0,
          averageVelocity: notes.length > 0 ? 
            notes.reduce((sum, note) => sum + note.velocity, 0) / notes.length : 0
        }
      };

      // 3. Créer un blob de la partition
      const partitionBlob = new Blob([JSON.stringify(partitionData, null, 2)], {
        type: 'application/json'
      });
      
      // 4. Upload de la partition
      const partitionFormData = new FormData();
      partitionFormData.append('files', partitionBlob, `${title}_partition.json`);
      partitionFormData.append('path', 'api::musique.musique');
      partitionFormData.append('name', `${title}_partition`);

      const partitionUploadResponse = await fetch("http://localhost:1337/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `${secretKey}`
        },
        body: partitionFormData
      });

      const partitionUploadResult = await partitionUploadResponse.json();
      
      if (!partitionUploadResponse.ok) {
        throw new Error(`Erreur upload partition: ${JSON.stringify(partitionUploadResult)}`);
      }

      // 5. Créer l'entrée musique avec tous les fichiers
      const fileIds = uploadResult.map(file => file.id);
      const partitionId = partitionUploadResult[0].id;
      
      const entryData = {
        data: {
          Title: title,
          Artist: artist,
          Cover: coverFile ? fileIds[0] : null,
          MusicFile: audioFile ? fileIds[coverFile ? 1 : 0] : null,
          Partition: partitionId, // Nouveau champ pour la partition
          ProcessedAt: new Date().toISOString(),
          NotesCount: notes.length
        }
      };

      const entryResponse = await fetch("http://localhost:1337/api/musiques", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${secretKey}`
        },
        body: JSON.stringify(entryData)
      });

      const entryResult = await entryResponse.json();
      
      if (!entryResponse.ok) {
        throw new Error(`Erreur création entrée: ${JSON.stringify(entryResult)}`);
      }

      setSavedSongId(entryResult.data.id);
      console.log('✅ Musique et partition sauvegardées avec succès!');

    } catch (err) {
      console.error("Erreur sauvegarde Strapi:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ====== FONCTION POUR RÉCUPÉRER ET TRAITER UNE MUSIQUE EXISTANTE ======
  const loadAndProcessExistingMusic = async (musicId) => {
    try {
      setProcessing(true);
      setError(null);

      // Récupérer la musique depuis Strapi
      const response = await fetch(`http://localhost:1337/api/musiques/${musicId}?populate=*`, {
        headers: {
          "Authorization": `${secretKey}`
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Erreur récupération: ${JSON.stringify(result)}`);
      }

      const music = result.data;
      
      // Mettre à jour les informations
      setTitle(music.attributes.Title);
      setArtist(music.attributes.Artist);
      
      // Récupérer le fichier audio
      const audioFileUrl = `http://localhost:1337${music.attributes.MusicFile.data.attributes.url}`;
      
      // Télécharger et traiter le fichier audio
      const audioResponse = await fetch(audioFileUrl);
      const audioBlob = await audioResponse.blob();
      const audioFile = new File([audioBlob], music.attributes.MusicFile.data.attributes.name);
      
      setAudioFile(audioFile);
      
      // Lancer le traitement
      await processAudio(audioFile);

    } catch (err) {
      console.error("Erreur chargement musique:", err);
      setError(`Erreur lors du chargement: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Fonction utilitaires
  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const midiToNote = (midi) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  };

  const exportLocalMIDI = () => {
    const dataStr = JSON.stringify(midiNotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${title || 'partition'}_notes.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setCoverFile(null);
    setAudioFile(null);
    setMidiNotes([]);
    setAnalysisComplete(false);
    setError(null);
    setSavedSongId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl shadow-2xl overflow-hidden ">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-3 relative">
        {/* Bouton de fermeture en haut à droite */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 text-white hover:text-gray-200 transition-colors duration-200"
          aria-label="Fermer"
        >
          {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-1 w-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg> */}
        </button>

        <div className="flex items-center justify-center gap-3 mb-2">
          <Music className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Ajouter une chanson</h1>
        </div>
      </div>


      {/* Formulaire d'informations */}
      <div className="p-3 border-b border-gray-200 bg-white">
        {/* <h2 className="text-xl font-bold text-gray-800 mb-4">Informations de la musique</h2> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nom de la chanson"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artiste *
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nom de l'artiste"
              required
            />
          </div>
        </div>
        
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image de couverture
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files[0])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Zone d'upload audio */}
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Fichier audio</h2>
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileSelection(e.target.files[0])}
            className="hidden"
          />
          
          {!audioFile ? (
            <div className="space-y-2">
              <div className="flex justify-center">
                <Upload className="w-16 h-16 text-indigo-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Glissez votre fichier audio ici
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Ou cliquez pour sélectionner un fichier
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Choisir un fichier
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileAudio className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-800">{audioFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(audioFile.size)}</p>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors duration-200"
              >
                Changer de fichier
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={processAndSaveWorkflow}
            disabled={!audioFile || !title || !artist || processing || saving}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${
              !audioFile || !title || !artist || processing || saving
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Traitement en cours...
              </>
            ) : saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Traiter et Sauvegarder
              </>
            )}
          </button>
          
          <button
            onClick={resetForm}
            className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Résultats */}
      {analysisComplete && midiNotes.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Music className="w-6 h-6" />
              Partition générée ({midiNotes.length} notes)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportLocalMIDI}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Local
              </button>
              {savedSongId && (
                <div className="bg-green-100 px-4 py-2 rounded-lg text-green-800 font-medium">
                  ✅ Sauvegardé (ID: {savedSongId})
                </div>
              )}
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-600 text-sm font-medium">Total notes</p>
              <p className="text-2xl font-bold text-blue-800">{midiNotes.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-600 text-sm font-medium">Durée</p>
              <p className="text-2xl font-bold text-green-800">
                {midiNotes.length > 0 ? Math.max(...midiNotes.map(n => n.endTime)).toFixed(1) : '0'}s
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-purple-600 text-sm font-medium">Vélocité moy.</p>
              <p className="text-2xl font-bold text-purple-800">
                {midiNotes.length > 0 ? (midiNotes.reduce((sum, note) => sum + note.velocity, 0) / midiNotes.length).toFixed(2) : '0'}
              </p>
            </div>
          </div>

          {/* Aperçu des notes */}
          <div className="bg-white rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                <span>Note</span>
                <span>MIDI</span>
                <span>Début</span>
                <span>Fin</span>
                <span>Vélocité</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {midiNotes.slice(0, 10).map((note, index) => (
                <div
                  key={index}
                  className="px-4 py-3 grid grid-cols-5 gap-4 text-sm hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="font-medium text-indigo-600">{midiToNote(note.midi)}</span>
                  <span className="text-gray-700">{note.midi}</span>
                  <span className="text-gray-700">
                    {typeof note.startTime === 'number' ? note.startTime.toFixed(3) : '—'}s
                  </span>
                  <span className="text-gray-700">
                    {typeof note.endTime === 'number' ? note.endTime.toFixed(3) : '—'}s
                  </span>
                  <span className="text-gray-700">
                    {typeof note.velocity === 'number' ? note.velocity.toFixed(2) : '—'}
                  </span>
                </div>
              ))}
            </div>
            {midiNotes.length > 10 && (
              <div className="p-3 text-center text-gray-500 text-sm">
                ... et {midiNotes.length - 10} autres notes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedMusicSystem;