
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChessService } from './services/chessLogic';
import ChessBoard from './components/ChessBoard';
import { Color, GameState, PeerMessage } from './types';
import { RefreshCcw, Undo2, Share2, Info, Star, MessageCircle, Trophy, Wifi, WifiOff, CheckCircle2, Circle } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

const STORAGE_KEY = 'catur_ceria_state';

const App: React.FC = () => {
  const [chess] = useState(new ChessService());
  const [gameStatus, setGameStatus] = useState<GameState>({
    fen: chess.getFen(),
    history: chess.getHistory(),
    turn: chess.getTurn(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw()
  });
  const [legalMoves, setLegalMoves] = useState<any[]>(chess.moves());
  const [showTutorial, setShowTutorial] = useState(false);
  const [lastMove, setLastMove] = useState<{from: string, to: string} | undefined>();
  const [message, setMessage] = useState("Ayo main catur! Giliran Putih.");
  
  // Multiplayer states
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<DataConnection | null>(null);

  // Persistence: Save state
  useEffect(() => {
    const state = {
      fen: chess.getFen(),
      history: chess.getHistory(),
      lastMove,
      remotePeerId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [gameStatus.fen, remotePeerId]);

  // Persistence: Load state & Auto-reconnect
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        chess.loadFen(parsed.fen);
        setLastMove(parsed.lastMove);
        if (parsed.remotePeerId) {
          setRemotePeerId(parsed.remotePeerId);
        }
        updateStatus();
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
  }, []);

  // PeerJS setup
  useEffect(() => {
    const p = new Peer();
    p.on('open', (id) => {
      setPeerId(id);
      setPeer(p);
      
      // If we have a room ID in URL, connect automatically
      const urlParams = new URLSearchParams(window.location.search);
      const room = urlParams.get('room');
      if (room && room !== id) {
        connectToPeer(room, p);
      }
    });

    p.on('connection', (conn) => {
      setupConnection(conn);
    });

    return () => {
      p.destroy();
    };
  }, []);

  const setupConnection = (conn: DataConnection) => {
    connectionRef.current = conn;
    setConnection(conn);
    setIsConnected(true);
    setRemotePeerId(conn.peer);

    conn.on('data', (data: any) => {
      const msg = data as PeerMessage;
      handleRemoteMessage(msg);
    });

    conn.on('close', () => {
      setIsConnected(false);
      setConnection(null);
      connectionRef.current = null;
      setRemoteReady(false);
    });

    // Send current game state for sync
    conn.on('open', () => {
      conn.send({
        type: 'SYNC',
        payload: { fen: chess.getFen(), ready: localReady }
      });
    });
  };

  const connectToPeer = (id: string, p: Peer | null = peer) => {
    if (!p) return;
    const conn = p.connect(id);
    setupConnection(conn);
  };

  const handleRemoteMessage = (msg: PeerMessage) => {
    switch (msg.type) {
      case 'MOVE':
        chess.move(msg.payload.from, msg.payload.to);
        setLastMove(msg.payload);
        updateStatus();
        break;
      case 'UNDO':
        chess.undo();
        setLastMove(undefined);
        updateStatus();
        break;
      case 'RESET':
        chess.reset();
        setLastMove(undefined);
        updateStatus();
        break;
      case 'SYNC':
        chess.loadFen(msg.payload.fen);
        setRemoteReady(msg.payload.ready);
        updateStatus();
        break;
      case 'READY_CHANGE':
        setRemoteReady(msg.payload);
        break;
    }
  };

  const broadcast = (msg: PeerMessage) => {
    if (connectionRef.current && connectionRef.current.open) {
      connectionRef.current.send(msg);
    }
  };

  const updateStatus = useCallback(() => {
    setGameStatus({
      fen: chess.getFen(),
      history: chess.getHistory(),
      turn: chess.getTurn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw()
    });
    setLegalMoves(chess.moves());

    const isGameOver = chess.isGameOver();
    const isCheck = chess.isCheck();
    const turn = chess.getTurn();

    if (chess.isCheckmate()) {
      setMessage(`Yey! ${turn === 'w' ? 'Hitam' : 'Putih'} Menang!`);
    } else if (isCheck) {
      setMessage(`Awas! Raja ${turn === 'w' ? 'Putih' : 'Hitam'} terancam!`);
    } else if (isGameOver) {
      setMessage("Permainan Selesai!");
    } else {
      setMessage(`Giliran ${turn === 'w' ? 'Putih' : 'Hitam'}.`);
    }
  }, [chess]);

  const handleMove = (from: string, to: string) => {
    if (!localReady || !remoteReady) return;
    const move = chess.move(from, to);
    if (move) {
      setLastMove({ from, to });
      updateStatus();
      broadcast({ type: 'MOVE', payload: { from, to } });
    }
  };

  const handleUndo = () => {
    chess.undo();
    setLastMove(undefined);
    updateStatus();
    broadcast({ type: 'UNDO', payload: null });
  };

  const handleReset = () => {
    if (window.confirm("Ulang permainan?")) {
      chess.reset();
      setLastMove(undefined);
      updateStatus();
      broadcast({ type: 'RESET', payload: null });
    }
  };

  const toggleReady = () => {
    const newState = !localReady;
    setLocalReady(newState);
    broadcast({ type: 'READY_CHANGE', payload: newState });
  };

  const shareGame = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${peerId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link permainan disalin! Kirim ke teman.");
    });
  };

  const isBothReady = localReady && remoteReady;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-2xl shadow-lg">
            <Trophy className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">Catur Ceria</h1>
            <p className="text-emerald-600 text-sm font-semibold">Bermain & Belajar Online</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'Terhubung' : 'Offline'}
          </div>
          <button 
            onClick={shareGame}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold hover:bg-blue-200 transition-all shadow-sm"
          >
            <Share2 size={18} /> Undang Teman
          </button>
        </div>
      </header>

      {/* Connection Dashboard */}
      {!isConnected && !remotePeerId && (
        <div className="mb-8 p-4 bg-white rounded-2xl shadow-md border-2 border-dashed border-emerald-200 text-center max-w-md w-full">
          <p className="text-emerald-800 font-bold mb-2">Kamu belum terhubung dengan siapa pun.</p>
          <p className="text-sm text-emerald-600 mb-4">Klik "Undang Teman" dan kirim linknya ke temanmu!</p>
        </div>
      )}

      {/* Main Content */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Readiness Section */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-emerald-100">
            <h3 className="text-xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Persiapan
            </h3>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border-2 transition-all ${localReady ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">Kamu (Lokal)</span>
                  {localReady ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-gray-300" />}
                </div>
                <button 
                  onClick={toggleReady}
                  className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${localReady ? 'bg-red-100 text-red-600' : 'bg-emerald-500 text-white shadow-md active:scale-95'}`}
                >
                  {localReady ? 'Batal Siap' : 'Saya Siap!'}
                </button>
              </div>

              <div className={`p-4 rounded-2xl border-2 transition-all ${remoteReady ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Teman (Remote)</span>
                  {remoteReady ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-gray-300 animate-pulse" />}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {remoteReady ? 'Teman sudah siap bermain!' : 'Menunggu teman siap...'}
                </p>
              </div>

              {!isBothReady && (
                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-xs text-yellow-700 font-medium">
                   Permainan baru bisa dimulai setelah kedua pemain menekan tombol "Siap".
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-blue-100 hidden lg:block">
            <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
              <MessageCircle size={20} className="text-blue-500" /> Status
            </h3>
            <div className={`p-3 rounded-xl font-bold text-center text-sm ${gameStatus.isCheck ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {message}
            </div>
          </div>
        </div>

        {/* Board Section */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className={`relative ${!isBothReady ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            {!isBothReady && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-[2px] rounded-xl">
                 <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-emerald-500 animate-bounce">
                    <p className="font-bold text-emerald-800 text-sm">Siap-siap dulu ya!</p>
                 </div>
              </div>
            )}
            <ChessBoard 
              board={chess.getBoard()} 
              onMove={handleMove}
              turn={gameStatus.turn}
              legalMoves={legalMoves}
              lastMove={lastMove}
              isCheck={gameStatus.isCheck}
            />
          </div>
          
          <div className="w-full flex justify-center gap-4 mt-6">
            <button 
              onClick={handleUndo}
              disabled={!isBothReady}
              className="group flex flex-col items-center gap-2 bg-white text-emerald-700 p-4 rounded-2xl shadow-lg border-2 border-emerald-100 hover:bg-emerald-50 disabled:opacity-50 transition-all active:translate-y-1"
            >
              <Undo2 className="group-hover:-rotate-45 transition-transform" />
              <span className="text-xs font-bold">Undo</span>
            </button>
            <button 
              onClick={handleReset}
              disabled={!isBothReady}
              className="group flex flex-col items-center gap-2 bg-white text-red-600 p-4 rounded-2xl shadow-lg border-2 border-red-100 hover:bg-red-50 disabled:opacity-50 transition-all active:translate-y-1"
            >
              <RefreshCcw className="group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-xs font-bold">Ulang</span>
            </button>
          </div>
        </div>

        {/* History & Info */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-orange-100 h-[400px] flex flex-col">
            <h3 className="text-xl font-bold text-orange-800 mb-4">Langkah</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {gameStatus.history.length === 0 && (
                <p className="text-gray-400 italic text-sm text-center mt-10">Pilih bidakmu!</p>
              )}
              {Array.from({ length: Math.ceil(gameStatus.history.length / 2) }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center bg-orange-50 p-2 rounded-xl text-xs font-bold">
                  <span className="text-orange-300 w-4">{i + 1}.</span>
                  <span className="text-blue-700 flex-1">{gameStatus.history[i * 2]}</span>
                  <span className="text-orange-700 flex-1">{gameStatus.history[i * 2 + 1] || ''}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="bg-yellow-400 text-yellow-900 font-bold py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all"
          >
            <Info size={18} /> Cara Main
          </button>
        </div>
      </main>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500 p-6 text-white text-center">
              <h2 className="text-3xl font-bold">Halo, Juara! 👋</h2>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><CheckCircle2 size={24} /></div>
                <p className="text-sm font-medium text-gray-700">Tekan tombol <strong>"Saya Siap!"</strong> untuk mulai. Temanmu juga harus menekan tombol yang sama di HP/Laptop mereka.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-green-100 p-2 rounded-xl text-green-600"><Wifi size={24} /></div>
                <p className="text-sm font-medium text-gray-700">Jika internet terputus, jangan panik! Cukup buka link yang sama, game akan <strong>otomatis lanjut</strong> dari posisi terakhir.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Undo2 size={24} /></div>
                <p className="text-sm font-medium text-gray-700">Kamu boleh membatalkan langkah (Undo) kapan saja tanpa perlu ijin lawan. Belajarlah dari setiap langkah!</p>
              </div>
              
              <button 
                onClick={() => setShowTutorial(false)}
                className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg active:scale-95 mt-4"
              >
                Paham!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fed7aa;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;
