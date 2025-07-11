import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Pause, Square } from 'lucide-react';
import './index.css';

const PianoSheetPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration] = useState(8); // 8 seconds pour la démo
    const intervalRef = useRef(null);
    const sheetRef = useRef(null);

    const savedSong = localStorage.getItem('selectedSong');
    const songData = savedSong ? JSON.parse(savedSong) : null;

    const songTitle = songData?.title || "Twinkle, Twinkle, Little Star";
    const composer = songData?.composer || "Traditional";


    // Séquence de notes pour l'animation (notes MIDI simplifiées)
    const noteSequence = [
        { time: 0, note: 'C4', duration: 0.5 },
        { time: 0.5, note: 'C4', duration: 0.5 },
        { time: 1, note: 'G4', duration: 0.5 },
        { time: 1.5, note: 'G4', duration: 0.5 },
        { time: 2, note: 'A4', duration: 0.5 },
        { time: 2.5, note: 'A4', duration: 0.5 },
        { time: 3, note: 'G4', duration: 1 },
        { time: 4, note: 'F4', duration: 0.5 },
        { time: 4.5, note: 'F4', duration: 0.5 },
        { time: 5, note: 'E4', duration: 0.5 },
        { time: 5.5, note: 'E4', duration: 0.5 },
        { time: 6, note: 'D4', duration: 0.5 },
        { time: 6.5, note: 'D4', duration: 0.5 },
        { time: 7, note: 'C4', duration: 1 },
    ];

    // Touches du piano (2 octaves)
    const pianoKeys = [
        { note: 'C3', type: 'white', x: 0 },
        { note: 'C#3', type: 'black', x: 25 },
        { note: 'D3', type: 'white', x: 40 },
        { note: 'D#3', type: 'black', x: 65 },
        { note: 'E3', type: 'white', x: 80 },
        { note: 'F3', type: 'white', x: 120 },
        { note: 'F#3', type: 'black', x: 145 },
        { note: 'G3', type: 'white', x: 160 },
        { note: 'G#3', type: 'black', x: 185 },
        { note: 'A3', type: 'white', x: 200 },
        { note: 'A#3', type: 'black', x: 225 },
        { note: 'B3', type: 'white', x: 240 },
        { note: 'C4', type: 'white', x: 280 },
        { note: 'C#4', type: 'black', x: 305 },
        { note: 'D4', type: 'white', x: 320 },
        { note: 'D#4', type: 'black', x: 345 },
        { note: 'E4', type: 'white', x: 360 },
        { note: 'F4', type: 'white', x: 400 },
        { note: 'F#4', type: 'black', x: 425 },
        { note: 'G4', type: 'white', x: 440 },
        { note: 'G#4', type: 'black', x: 465 },
        { note: 'A4', type: 'white', x: 480 },
        { note: 'A#4', type: 'black', x: 505 },
        { note: 'B4', type: 'white', x: 520 },
        { note: 'C5', type: 'white', x: 560 },
    ];

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
    const sheetScrollOffset = (currentTime / duration) * 100;

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
                className="absolute inset-0 transition-transform duration-100 ease-linear"
                style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='120' viewBox='0 0 800 120'%3E%3Cg fill='none' stroke='%23333' stroke-width='1'%3E%3Cline x1='0' y1='20' x2='800' y2='20'/%3E%3Cline x1='0' y1='30' x2='800' y2='30'/%3E%3Cline x1='0' y1='40' x2='800' y2='40'/%3E%3Cline x1='0' y1='50' x2='800' y2='50'/%3E%3Cline x1='0' y1='60' x2='800' y2='60'/%3E%3Cline x1='0' y1='80' x2='800' y2='80'/%3E%3Cline x1='0' y1='90' x2='800' y2='90'/%3E%3Cline x1='0' y1='100' x2='800' y2='100'/%3E%3Cline x1='0' y1='110' x2='800' y2='110'/%3E%3Cline x1='0' y1='120' x2='800' y2='120'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat-x',
                transform: `translateX(-${sheetScrollOffset}px)`
                }}
            >
                {/* Notes factices */}
                {noteSequence.map((note, index) => (
                <div
                    key={index}
                    className={`absolute w-4 h-4 rounded-full transition-all duration-200 ${
                    currentTime >= note.time && currentTime < note.time + note.duration
                        ? 'bg-red-500 scale-125 shadow-lg'
                        : 'bg-black'
                    }`}
                    style={{
                    left: `${(note.time / duration) * 100}%`,
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
                    className="transition-all duration-200 cursor-pointer hover:fill-gray-100"
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
                    className="transition-all duration-200 cursor-pointer hover:fill-gray-700"
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