import React, { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

// --- SVG Icons (self-contained to avoid external dependencies) ---
const UploadCloud = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

const XCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

const Play = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
);

const Pause = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
);

// --- Main App Component ---
export default function App() {
  const playerContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const playerRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // --- File Upload Handler ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    setFileName(file.name);
    setIsPlaying(false); // Reset playing state on new file

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        const parsedJson = JSON.parse(fileContent);
        
        let eventsArray = Array.isArray(parsedJson) ? parsedJson : (parsedJson && Array.isArray(parsedJson.events)) ? parsedJson.events : [];

        if (eventsArray.length > 0) {
          setEvents(eventsArray);
        } else {
          throw new Error('JSON is valid, but no events array was found or it is empty.');
        }
      } catch (err) {
        console.error("File parsing error:", err);
        setError(`Failed to parse file: ${err.message}. Please upload a valid rrweb JSON recording.`);
        setEvents([]);
        setFileName('');
      }
    };
    reader.onerror = () => {
        setError('An error occurred while reading the file.');
        setEvents([]);
        setFileName('');
    }
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // --- Custom Play/Pause Handlers ---
  const handlePlay = () => {
      if (playerRef.current) {
          playerRef.current.play();
      }
  };

  const handlePause = () => {
      if (playerRef.current) {
          playerRef.current.pause();
      }
  };

  // --- Initialize or Re-initialize Player ---
  useEffect(() => {
    if (playerRef.current) {
        playerRef.current.pause();
        if(playerContainerRef.current) {
            playerContainerRef.current.innerHTML = '';
        }
        playerRef.current = null;
    }

    if (playerContainerRef.current && events.length > 0) {
      try {
          const playerInstance = new rrwebPlayer({
            target: playerContainerRef.current,
            props: {
              events,
              width: playerContainerRef.current.clientWidth,
              height: playerContainerRef.current.clientHeight,
              autoPlay: false, 
              showController: true, 
            },
          });
          
          playerRef.current = playerInstance;

          // --- Event listeners to sync custom controls with player state ---
          const onPlay = () => setIsPlaying(true);
          const onPause = () => setIsPlaying(false);
          
          playerInstance.addEventListener('play', onPlay);
          playerInstance.addEventListener('pause', onPause);
          // The 'finish' event is also treated as a pause
          playerInstance.addEventListener('finish', onPause);

          // Cleanup function to remove listeners
          return () => {
              playerInstance.removeEventListener('play', onPlay);
              playerInstance.removeEventListener('pause', onPause);
              playerInstance.removeEventListener('finish', onPause);
          };

      } catch (playerError) {
          console.error("rrweb player initialization error:", playerError);
          setError("Failed to initialize the player with the provided events.");
      }
    }
    
  }, [events]);

  return (
    <div className="bg-white text-black min-h-screen flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-blue-600">rrweb React Player</h1>
          <p className="text-lg text-gray-600">
            Upload and replay your own rrweb session recordings.
          </p>
        </header>

        <main className="bg-gray-100 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Session Recording</h2>
              <p className="text-gray-600 text-sm mt-1">
                {fileName ? `Now playing: ${fileName}` : 'Upload a JSON file to begin.'}
              </p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/json,.json" className="hidden" />
            <button
              onClick={triggerFileSelect}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            >
              <UploadCloud size={20} />
              Upload Recording
            </button>
          </div>
          
          {error && (
            <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center gap-3">
              <XCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div 
            className="rr-player-wrapper relative"
            style={{ width: '100%', height: '600px', backgroundColor: '#f7fafc' }}
          >
            <div ref={playerContainerRef} className="rr-player w-full h-full"></div>

            {events.length === 0 && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center pointer-events-none">
                <UploadCloud size={48} className="mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold">Awaiting Recording</h3>
                <p>Please upload an rrweb session file to start the playback.</p>
              </div>
            )}
          </div>
          {/* --- Custom Controls Section --- */}
          {events.length > 0 && !error && (
            <div className="p-4 bg-gray-200/50 flex justify-center items-center gap-4">
                {isPlaying ? (
                    <button onClick={handlePause} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                        <Pause size={20} />
                        Pause
                    </button>
                ) : (
                    <button onClick={handlePlay} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                        <Play size={20} />
                        Play
                    </button>
                )}
            </div>
          )}
        </main>
        
        <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Ensure your file is a valid JSON array of rrweb events.</p>
        </footer>
      </div>
    </div>
  );
}
