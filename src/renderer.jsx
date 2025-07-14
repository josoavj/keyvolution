import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Pause, Square } from 'lucide-react';
import './index.css';

// Convertir un numéro MIDI en nom de note (ex: 60 → C4)
function midiToNoteName(midi) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}

// Convertir un nom de note (ex: 'C4') en valeur MIDI
function noteNameToMidi(note) {
  const regex = /^([A-G]#?)(-?\d)$/;
  const match = note.match(regex);
  if (!match) return 60;

  const n = match[1];
  const o = parseInt(match[2]);
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return notes.indexOf(n) + (o + 1) * 12;
}

// Génère les touches du piano dynamiquement
function generatePianoKeys(minMidi, maxMidi) {
  const keys = [];
  const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
  let x = 0;

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const name = midiToNoteName(midi);
    const base = name.slice(0, -1);
    const isBlack = blackNotes.includes(base);
    keys.push({ note: name, type: isBlack ? 'black' : 'white', x });
    x += isBlack ? 15 : 40;
  }

  return keys;
}

const PianoSheetPlayer = () => {
  const [noteSequence, setNoteSequence] = useState([]);
  const [pianoKeys, setPianoKeys] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8); // Valeur par défaut
  const intervalRef = useRef(null);
  const sheetRef = useRef(null);

  const savedSong = localStorage.getItem('selectedSong');
  const songData = savedSong ? JSON.parse(savedSong) : null;

  const songTitle = songData?.title || "Untitled Song";
  const composer = songData?.composer || "Unknown Composer";

  // Charger et formater le fichier MIDI JSON
  useEffect(() => {
    async function loadAndFormatNotes() {
      if (!songData?.url){
        console.log("song Partition not found")
        return;
      } 
     console.log(songData.url)
      try {
        const response = await fetch(songData.url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status} : fichier introuvable ou non accessible`);
        }

        const midiJson = await response.json();

        const noteArray = midiJson.notes;

        if (!Array.isArray(noteArray)) {
            throw new Error("Le champ 'notes' n'est pas un tableau");
        }

        const sorted = noteArray.sort((a, b) => a.startTime - b.startTime);
        const minStart = sorted[0]?.startTime || 0;

        const formatted = sorted.map((note, i) => {
            const currentTime = parseFloat((note.startTime - minStart).toFixed(2));
            const nextStart = sorted[i + 1]?.startTime ?? (note.startTime + 0.5);
            const duration = parseFloat((nextStart - note.startTime).toFixed(2)) || 0.5;

            return {
            time: currentTime,
            note: midiToNoteName(note.midi),
            duration: duration
            };
        });

        setNoteSequence(formatted);

        const firstNote = formatted[0];
        const lastNote = formatted[formatted.length - 1];
        const totalDuration = (lastNote.time + lastNote.duration) - firstNote.time;

        setDuration(parseFloat(totalDuration.toFixed(2)));

        const uniqueNotes = Array.from(new Set(formatted.map(n => n.note)));
        const midiValues = uniqueNotes.map(noteNameToMidi);
        const min = Math.min(...midiValues);
        const max = Math.max(...midiValues);
        const generatedKeys = generatePianoKeys(min - 2, max + 2);
        setPianoKeys(generatedKeys);

        } catch (error) {
        console.error("Erreur lors du chargement du JSON MIDI :", error.message);
        }
    }

    loadAndFormatNotes();
  }, [songData]);

    // Obtenir la note actuellement jouée
    const getCurrentNote = () => {
        const currentNote = noteSequence.find(n => 
        currentTime >= n.time && currentTime < n.time + n.duration
        );
        return currentNote ? currentNote.note : null;
    };

    // Contrôles de lecture
    const handlePlay = () => {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
            if (prev >= duration) {
            setIsPlaying(false);
            return 0;
            }
            return prev + 0.1;
        });
        }, 100);
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (intervalRef.current) {
        clearInterval(intervalRef.current);
        }
    };

    const handleStop = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (intervalRef.current) {
        clearInterval(intervalRef.current);
        }
    };

    // Nettoyage
    useEffect(() => {
        return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        };
    }, []);

    // Animation de la partition
    const sheetScrollOffset = (currentTime / duration) * 4000;


    return (
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-r from-teal-500/20 to-blue-800/20 border-1 shadow-2xl overflow-hidden rounded-lg">
        {/* En-tête avec titre */}
        <div className="border-white text-white p-4">
            <h2 className="text-2xl font-bold text-center">{songTitle}</h2>
            <p className="text-center text-blue-100 mt-1">{composer}</p>
        </div>

        {/* Zone de partition */}
        <div className="bg-white p-6 border-b border-gray-200">
            <div className="relative h-32 overflow-hidden rounded-lg border-2 border-gray-300">
            {/* Partition factice avec animation */}
            <div 
                ref={sheetRef}
                className="absolute inset-0 transition-transform duration-200 ease-linear"
                style={{
                backgroundImage: `url("../Design/Grand_staff.svg")`,
                backgroundRepeat: 'repeat-x',
                transform: `translateX(-${sheetScrollOffset}px)`
                }}
            >
                {/* Notes factices */}
                {noteSequence.map((note, index) => (
                <div
                    key={index}
                    className={`absolute w-3 h-3 rounded-full transition-all duration-300 ${
                    currentTime >= note.time && currentTime < note.time + note.duration
                        ? 'bg-red-500 scale-125 shadow-lg'
                        : 'bg-black'
                    }`}
                    style={{
                    left: `${(note.time / duration) * 250}%`,
                    top: `${getNotePosition(note.note)}px`,
                    }}
                />
                ))}
            </div>
            
            {/* Curseur de lecture */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-lg transition-all duration-100"
                style={{
                left: `${(currentTime / duration) * 100}%`,
                zIndex: 10
                }}
            />
            </div>
        </div>

        {/* Contrôles de lecture */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
            <div className="flex justify-center items-center gap-4">
            <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
                onClick={handleStop}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
                <Square size={20} />
                Stop
            </button>
            </div>
            
            {/* Barre de progression */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            </div>
            
            <div className="text-center mt-2 text-sm text-gray-600">
            {currentTime.toFixed(1)}s / {duration}s
            </div>
        </div>

        {/* Piano virtuel */}
        <div className="bg-gray-800 p-6">
            <div className="relative mx-auto" style={{ width: '600px', height: '120px' }}>
            <svg width="600" height="120" className="drop-shadow-lg">
                {/* Touches blanches */}
                {pianoKeys.filter(key => key.type === 'white').map((key, index) => (
                <rect
                    key={`white-${index}`}
                    x={key.x}
                    y="20"
                    width="35"
                    height="100"
                    fill={getCurrentNote() === key.note ? '#fbbf24' : '#ffffff'}
                    stroke="#333"
                    strokeWidth="1"
                    rx="2"
                    className="transition-all duration-300 cursor-pointer hover:fill-gray-100"
                />
                ))}
                
                {/* Touches noires */}
                {pianoKeys.filter(key => key.type === 'black').map((key, index) => (
                <rect
                    key={`black-${index}`}
                    x={key.x}
                    y="20"
                    width="20"
                    height="65"
                    fill={getCurrentNote() === key.note ? '#f59e0b' : '#1f2937'}
                    stroke="#000"
                    strokeWidth="1"
                    rx="2"
                    className="transition-all duration-300 cursor-pointer hover:fill-gray-700"
                />
                ))}
            </svg>
            </div>
        </div>
        </div>
    );
};

// Fonction helper pour positionner les notes sur la partition
function getNotePosition(note) {
  const noteMap = {
    'C3': 95, 'D3': 90, 'E3': 85, 'F3': 80, 'G3': 75, 'A3': 70, 'B3': 65,
    'C4': 60, 'D4': 55, 'E4': 50, 'F4': 45, 'G4': 40, 'A4': 35, 'B4': 30,
    'C5': 25
  };
  return noteMap[note] || 60;
}

export default PianoSheetPlayer;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<PianoSheetPlayer />);
  } else {
    console.error("Le conteneur #root est introuvable dans le DOM.");
  }
});