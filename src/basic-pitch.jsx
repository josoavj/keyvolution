import React, { useState, useRef } from 'react';
import { Upload, Music, Play, Pause, Volume2, FileAudio, Zap, Download } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import './index.css';
import * as tf from '@tensorflow/tfjs';
import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly
} from '@spotify/basic-pitch';

await tf.setBackend('cpu'); // ou 'cpu' si wasm pose problème
await tf.ready();            // important !

console.log('✅ Backend TensorFlow:', tf.getBackend());

let basicPitchInstance = null;

const BasicPitchAnalyzer = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [midiNotes, setMidiNotes] = useState([]);
  const [error, setError] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false); // Correction du typo
  const audioContextRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fonction pour obtenir ou créer l'AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleFileSelection(file);
  };

  /**
 * Convertit un AudioBuffer vers 22050Hz pour BasicPitch.
 * @param {AudioBuffer} buffer - L'audio original (souvent à 44100 ou 48000 Hz)
 * @returns {Promise<AudioBuffer>} - Un nouveau buffer à 22050 Hz
 */
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


  const processAudio = async () => {
  if (!audioFile) {
    setError('Veuillez sélectionner un fichier audio avant de lancer le traitement.');
    return;
  }

  setProcessing(true);
  setError(null);
  setMidiNotes([]);
  setAnalysisComplete(false);

  try {
    // 1. Charger et décoder l’audio
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const resampledBuffer = await resampleAudioBuffer(audioBuffer); // ✅
    const monoBuffer = convertToMono(resampledBuffer);              // Mono ✅
    //const noteEvents = await model.predict(resampledBuffer); // au lieu de audioBuffer


    // 2. Charger le modèle *une seule fois*
    if (!basicPitchInstance) {
      const modelUrl = '../public/basic-pitch-model/model.json';
      const model = await tf.loadGraphModel(modelUrl);
      basicPitchInstance = new BasicPitch(model);
    }

    // 3. Préparer les buffers pour récupérer frames, onsets & contours
    const frames = [];
    const onsets = [];
    const contours = [];
    let progress = 0;

    // 4. Évaluer le modèle
    await basicPitchInstance.evaluateModel(
      monoBuffer,
      (f, o, c) => {
        frames.push(...f);
        onsets.push(...o);
        contours.push(...c);
      },
      (p) => {
        progress = p;
        // tu peux afficher `progress` (%) si besoin
      }
    );

    // 5. Transformer en notes MIDI
    const rawEvents = outputToNotesPoly(frames, onsets, 0.5, 0.5, 5);
    const eventsWithBends = addPitchBendsToNoteEvents(contours, rawEvents);
    const noteList = noteFramesToTime(eventsWithBends) || [];
    console.log("🔍 Notes brutes :", noteList);

    // Sécurité : ignore les notes invalides
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

  } catch (err) {
    console.error("Erreur lors du traitement de l'audio :", err);
    setError(`Échec du traitement : ${err.message}`);

    // Fallback de simulation
    const simulatedNotes = [
      { midi: 60, startTime: 0.5, endTime: 1.0, velocity: 0.8 },
      { midi: 62, startTime: 1.0, endTime: 1.5, velocity: 0.7 },
      { midi: 64, startTime: 1.5, endTime: 2.0, velocity: 0.9 },
      { midi: 67, startTime: 2.0, endTime: 2.5, velocity: 0.6 },
      { midi: 69, startTime: 2.5, endTime: 3.0, velocity: 0.8 },
    ];
    setMidiNotes(simulatedNotes);
    setAnalysisComplete(true);

  } finally {
    setProcessing(false);
  }
};



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

  const exportMIDI = () => {
    // Export réel MIDI ou JSON selon tes besoins
    const dataStr = JSON.stringify(midiNotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'notes_midi.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl shadow-2xl overflow-hidden">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Music className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Basic Pitch Analyzer</h1>
          <Zap className="w-8 h-8" />
        </div>
        <p className="text-center text-indigo-100">
          Transcription audio vers MIDI avec l'IA de Spotify
        </p>
      </div>

      {/* Zone d'upload */}
      <div className="p-6 border-b border-gray-200">
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
            onChange={handleFileChange}
            className="hidden"
          />
          
          {!audioFile ? (
            <div className="space-y-4">
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
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Bouton de traitement */}
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={processAudio}
          disabled={!audioFile || processing}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${
            !audioFile || processing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Analyse en cours...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Lancer l'analyse
            </>
          )}
        </button>
      </div>

      {/* Résultats */}
      {analysisComplete && midiNotes.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Music className="w-6 h-6" />
              Notes détectées ({midiNotes.length})
            </h2>
            <button
              onClick={exportMIDI}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-600 text-sm font-medium">Total notes</p>
              <p className="text-2xl font-bold text-blue-800">{midiNotes.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-600 text-sm font-medium">Durée analysée</p>
              <p className="text-2xl font-bold text-green-800">
                {midiNotes.length > 0 ? Math.max(...midiNotes.map(n => n.endTime)).toFixed(1) : '0'}s
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-purple-600 text-sm font-medium">Vélocité moyenne</p>
              <p className="text-2xl font-bold text-purple-800">
                {midiNotes.length > 0 ? (midiNotes.reduce((sum, note) => sum + note.velocity, 0) / midiNotes.length).toFixed(2) : '0'}
              </p>
            </div>
          </div>

          {/* Liste des notes */}
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
              {[...midiNotes]
              .sort((a, b) => a.startTime - b.startTime)
              .map((note, index) => {
                const pitchName = midiToNote(note.midi ?? 0);
                const midi = note.midi ?? "?";
                const start = typeof note.startTime === "number" ? note.startTime.toFixed(3) : "?";
                const end = typeof note.endTime === "number" ? note.endTime.toFixed(3) : "?";
                const velocityValue = typeof note.velocity === "number" ? note.velocity : 0;
                const velocity = velocityValue.toFixed(2);

                return (
                  <div
                    key={index}
                    className="px-4 py-3 grid grid-cols-5 gap-4 text-sm hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="font-medium text-indigo-600">{pitchName}</span>
                    <span className="text-gray-700">{midi}</span>
                    <span className="text-gray-700">{start}s</span>
                    <span className="text-gray-700">{end}s</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{velocity}</span>
                      <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${velocityValue * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Message si aucune note détectée */}
      {analysisComplete && midiNotes.length === 0 && (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Volume2 className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-yellow-800 font-medium mb-2">Aucune note détectée</p>
            <p className="text-yellow-600 text-sm">
              Essayez avec un fichier audio contenant des instruments monophoniques plus clairs
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicPitchAnalyzer;

// Initialisation pour Electron
// document.addEventListener('DOMContentLoaded', () => {
//   const container = document.getElementById('test-basic');
//   if (container) {
//     const root = createRoot(container);
//     root.render(<BasicPitchAnalyzer />);
//   }
// });