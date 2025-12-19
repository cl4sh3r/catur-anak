
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChessService } from './services/chessLogic';
import ChessBoard from './components/ChessBoard';
import { Color, GameState, PeerMessage, GameMode, ChatMessage } from './types';
import { 
  RefreshCcw, Undo2, Share2, Info, Star, Trophy, 
  Wifi, WifiOff, CheckCircle2, User, Globe, Users,
  ArrowLeft, RotateCw, Send, MessageCircle, X, Bell,
  Smile, Heart, Hand, PartyPopper, Target, History,
  Check, CheckCheck
} from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

const App: React.FC = () => {
  const [chess] = useState(new ChessService());
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
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
  const [message, setMessage] = useState("Ayo pilih cara main!");
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Multiplayer states
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [myColor, setMyColor] = useState<Color>('w'); 
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Chat & Greeting states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputChat, setInputChat] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [incomingToast, setIncomingToast] = useState<string | null>(null);
  const [activeBubble, setActiveBubble] = useState<{text: string, sender: 'me' | 'friend'} | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'moves' | 'chat'>('moves');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sideChatEndRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const bubbleTimeoutRef = useRef<number | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (sideChatEndRef.current) {
      sideChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen, rightPanelTab]);

  // Auto-connect if URL has room param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room) {
      setGameMode('online');
      setMyColor('b');
      initPeer(room);
    }
  }, []);

  const initPeer = (joinRoomId?: string) => {
    const p = new Peer();
    p.on('open', (id) => {
      setPeerId(id);
      setPeer(p);
      if (joinRoomId) {
        connectToPeer(joinRoomId, p);
      }
    });

    p.on('connection', (conn) => {
      setupConnection(conn);
    });
  };

  const setupConnection = (conn: DataConnection) => {
    connectionRef.current = conn;
    setConnection(conn);
    setIsConnected(true);

    conn.on('data', (data: any) => {
      const msg = data as PeerMessage;
      handleRemoteMessage(msg);
    });

    conn.on('close', () => {
      setIsConnected(false);
      setConnection(null);
      connectionRef.current = null;
      setRemoteReady(false);
      setMessage("Teman terputus. Menunggu menyambung kembali...");
    });

    conn.on('open', () => {
      conn.send({
        type: 'SYNC',
        payload: { fen: chess.getFen(), ready: localReady }
      });
    });
  };

  const connectToPeer = (id: string, p: Peer | null) => {
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
      case 'CHAT':
        setChatMessages(prev => [...prev, { sender: 'friend', text: msg.payload, timestamp: Date.now() }]);
        showBubble(msg.payload, 'friend');
        if (!isChatOpen && rightPanelTab !== 'chat') {
          setHasNewMessage(true);
          showIncomingToast(msg.payload);
        }
        break;
    }
  };

  const showIncomingToast = (text: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setIncomingToast(text);
    toastTimeoutRef.current = window.setTimeout(() => {
      setIncomingToast(null);
    }, 4000);
  };

  const showBubble = (text: string, sender: 'me' | 'friend') => {
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    setActiveBubble({ text, sender });
    bubbleTimeoutRef.current = window.setTimeout(() => {
      setActiveBubble(null);
    }, 3000);
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
    const turn = chess.getTurn();

    if (chess.isCheckmate()) {
      setMessage(`Yeay! ${turn === 'w' ? 'Hitam' : 'Putih'} Menang!`);
    } else if (chess.isCheck()) {
      setMessage(`Awas! Raja ${turn === 'w' ? 'Putih' : 'Hitam'} sedang di-skak!`);
    } else if (isGameOver) {
      setMessage("Permainan selesai imbang.");
    } else {
      if (gameMode === 'online') {
        if (turn === myColor) {
          setMessage("Sekarang giliranmu! Pilih langkahmu.");
        } else {
          setMessage(`Tunggu sebentar, teman sedang berpikir...`);
        }
      } else {
        setMessage(`Giliran ${turn === 'w' ? 'Putih' : 'Hitam'}. Ayo melangkah!`);
      }
    }
  }, [chess, myColor, gameMode]);

  const handleMove = (from: string, to: string) => {
    if (gameMode === 'online' && (!localReady || !remoteReady)) return;
    
    const move = chess.move(from, to);
    if (move) {
      setLastMove({ from, to });
      updateStatus();
      if (gameMode === 'online') {
        broadcast({ type: 'MOVE', payload: { from, to } });
      }
    }
  };

  const handleUndo = () => {
    chess.undo();
    setLastMove(undefined);
    updateStatus();
    if (gameMode === 'online') {
      broadcast({ type: 'UNDO', payload: null });
    }
  };

  const handleReset = () => {
    if (window.confirm("Mulai ulang papan dari awal?")) {
      chess.reset();
      setLastMove(undefined);
      updateStatus();
      if (gameMode === 'online') {
        broadcast({ type: 'RESET', payload: null });
      }
    }
  };

  const toggleReady = () => {
    const newState = !localReady;
    setLocalReady(newState);
    if (gameMode === 'online') {
      broadcast({ type: 'READY_CHANGE', payload: newState });
    }
  };

  const sendChat = (text: string = inputChat) => {
    if (!text.trim()) return;
    const msg = { sender: 'me', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, msg as ChatMessage]);
    showBubble(text, 'me');
    broadcast({ type: 'CHAT', payload: text });
    setInputChat('');
    setHasNewMessage(false);
  };

  const shareGame = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${peerId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link disalin! Kirim ke temanmu untuk main bareng.");
    });
  };

  const quickReplies = ["Halo!", "Hebat!", "Ayo!", "Tunggu ya", "Skak!", "Hore!", "Semangat!"];
  
  const greetings = [
    { label: "Halo!", emoji: "👋", color: "bg-blue-500" },
    { label: "Hebat!", emoji: "👏", color: "bg-yellow-500" },
    { label: "Ayo!", emoji: "🚀", color: "bg-emerald-500" },
    { label: "Maaf!", emoji: "😅", color: "bg-orange-500" },
    { label: "Hore!", emoji: "🎉", color: "bg-purple-500" }
  ];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // UI Selection Screen
  if (!gameMode) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border-8 border-emerald-500 max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="bg-emerald-500 w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-lg">
            <Trophy className="text-white w-14 h-14" />
          </div>
          <h1 className="text-4xl font-black text-emerald-800 uppercase leading-tight">Catur Ceria</h1>
          <p className="text-emerald-600 font-bold">Pilih cara bermain hari ini:</p>
          
          <div className="grid gap-4">
            <button 
              onClick={() => { setGameMode('local'); updateStatus(); }}
              className="flex items-center gap-4 bg-blue-500 text-white p-6 rounded-3xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg group"
            >
              <Users size={32} className="group-hover:rotate-12 transition-transform" />
              <div className="text-left">
                <p className="font-black text-xl leading-none">MAIN LOKAL</p>
                <p className="text-xs opacity-80 uppercase mt-1">1 HP untuk berdua</p>
              </div>
            </button>

            <button 
              onClick={() => { setGameMode('online'); initPeer(); updateStatus(); }}
              className="flex items-center gap-4 bg-orange-500 text-white p-6 rounded-3xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg group"
            >
              <Globe size={32} className="group-hover:rotate-12 transition-transform" />
              <div className="text-left">
                <p className="font-black text-xl leading-none">MAIN ONLINE</p>
                <p className="text-xs opacity-80 uppercase mt-1">2 HP berjauhan</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOnlineMode = gameMode === 'online';
  const isBothReady = !isOnlineMode || (localReady && remoteReady);

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center p-4 md:p-8 select-none">
      {/* Header */}
      <header className="w-full max-w-[1400px] flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-emerald-100 rounded-full transition-colors"
          >
            <ArrowLeft className="text-emerald-700" />
          </button>
          <div className="bg-emerald-500 p-2 rounded-xl shadow-md">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-emerald-800">Catur Ceria</h1>
        </div>

        <div className="flex items-center gap-2">
          {isOnlineMode && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm ${isConnected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? 'Teman Online' : 'Menunggu Teman...'}
            </div>
          )}
          {isOnlineMode && (
            <button 
              onClick={shareGame}
              className="flex items-center gap-2 bg-white text-emerald-700 border-2 border-emerald-100 px-4 py-1.5 rounded-full text-xs font-black hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
            >
              <Share2 size={16} /> UNDANG
            </button>
          )}
          {!isOnlineMode && (
             <button 
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-2 bg-blue-100 text-blue-700 border-2 border-blue-200 px-4 py-1.5 rounded-full text-xs font-black hover:bg-blue-200 transition-all shadow-sm active:scale-95"
            >
              <RotateCw size={16} /> BALIK PAPAN
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Stats & Chat Toggle */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-emerald-100 relative">
             {/* Speech Bubble for Remote Player */}
             {activeBubble && activeBubble.sender === 'friend' && (
               <div className="absolute -right-4 -top-12 z-[60] bg-white border-4 border-orange-400 p-3 rounded-2xl shadow-2xl animate-in zoom-in slide-in-from-bottom duration-300">
                  <p className="text-sm font-black text-orange-600">{activeBubble.text}</p>
                  <div className="absolute -bottom-3 right-8 w-6 h-6 bg-white border-r-4 border-b-4 border-orange-400 rotate-45" />
               </div>
             )}

             <div className="flex items-center gap-2 mb-4">
               <User className="text-emerald-500" />
               <h3 className="font-black text-emerald-800">Status Main</h3>
             </div>

             {isOnlineMode ? (
               <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${localReady ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'} relative`}>
                    {activeBubble && activeBubble.sender === 'me' && (
                      <div className="absolute -right-4 -top-12 z-[60] bg-blue-500 text-white p-3 rounded-2xl shadow-2xl animate-in zoom-in slide-in-from-bottom duration-300">
                        <p className="text-sm font-black">{activeBubble.text}</p>
                        <div className="absolute -bottom-3 right-8 w-6 h-6 bg-blue-500 rotate-45" />
                      </div>
                    )}
                    <span className="text-sm font-bold">Kamu ({myColor === 'w' ? 'Putih' : 'Hitam'})</span>
                    <button onClick={toggleReady} className={`px-4 py-1.5 rounded-xl text-xs font-black ${localReady ? 'bg-green-500 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                      {localReady ? 'SIAP ✓' : 'KLIK SIAP'}
                    </button>
                  </div>
                  <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${remoteReady ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-sm font-bold">Teman ({myColor === 'w' ? 'Hitam' : 'Putih'})</span>
                    {remoteReady ? <CheckCircle2 size={24} className="text-green-500" /> : <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />}
                  </div>
               </div>
             ) : (
               <div className="bg-blue-50 p-5 rounded-2xl text-center">
                  <p className="text-sm font-bold text-blue-800">Mode Lokal Aktif</p>
                  <p className="text-xs text-blue-600 leading-tight">Main gantian di HP ini ya!</p>
               </div>
             )}
          </div>

          <div className={`p-6 rounded-3xl shadow-xl border-4 transition-colors ${gameStatus.isCheck ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
             <p className={`text-lg font-black text-center ${gameStatus.isCheck ? 'text-red-700' : 'text-blue-700'}`}>
               {message}
             </p>
          </div>

          {/* Chat Toggle for Online Mode */}
          {isOnlineMode && isConnected && (
            <button 
              onClick={() => { setRightPanelTab('chat'); setHasNewMessage(false); }}
              className={`w-full relative flex items-center justify-center gap-3 p-5 rounded-3xl font-black shadow-lg transition-all active:scale-95 ${hasNewMessage && rightPanelTab !== 'chat' ? 'bg-orange-500 text-white animate-bounce' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              <MessageCircle size={24} /> 
              PESAN {hasNewMessage && rightPanelTab !== 'chat' && "BARU!"}
              {hasNewMessage && rightPanelTab !== 'chat' && <span className="absolute -top-2 -right-2 bg-red-600 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px]">!</span>}
            </button>
          )}
        </div>

        {/* Center Column: Board & Greetings */}
        <div className="lg:col-span-2 flex flex-col items-center gap-4">
          
          {/* Kotak Sapaan Ceria (Greeting Bar) */}
          {isOnlineMode && isConnected && (
            <div className="w-full flex justify-center gap-2 mb-2 animate-in slide-in-from-top duration-500">
               {greetings.map((g) => (
                 <button
                   key={g.label}
                   onClick={() => sendChat(`${g.emoji} ${g.label}`)}
                   className={`${g.color} text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg hover:scale-105 active:scale-90 transition-all font-black text-sm group`}
                 >
                   <span className="text-xl group-hover:rotate-12 transition-transform">{g.emoji}</span>
                   <span className="hidden sm:inline uppercase">{g.label}</span>
                 </button>
               ))}
            </div>
          )}

          <div className={`relative w-full flex justify-center transition-all duration-500 ${!isBothReady ? 'opacity-40 grayscale blur-[2px]' : ''}`}>
             <ChessBoard 
                board={chess.getBoard()}
                onMove={handleMove}
                turn={gameStatus.turn}
                legalMoves={legalMoves}
                lastMove={lastMove}
                isCheck={gameStatus.isCheck}
                myColor={myColor}
                gameMode={gameMode}
                flipped={isFlipped}
             />
             {!isBothReady && isOnlineMode && (
               <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl border-8 border-emerald-500 text-center animate-bounce">
                     <p className="font-black text-2xl text-emerald-800 uppercase leading-none">Klik "Siap" dulu!</p>
                  </div>
               </div>
             )}
          </div>

          <div className="flex gap-6 mt-4">
             <button 
                onClick={handleUndo}
                className="flex flex-col items-center gap-2 bg-white text-emerald-700 p-6 rounded-[40px] shadow-lg border-2 border-emerald-100 hover:bg-emerald-50 transition-all active:scale-90"
             >
                <Undo2 size={48} />
                <span className="text-xs font-black uppercase">Undo</span>
             </button>
             <button 
                onClick={handleReset}
                className="flex flex-col items-center gap-2 bg-white text-red-500 p-6 rounded-[40px] shadow-lg border-2 border-red-500 hover:bg-red-50 transition-all active:scale-90"
             >
                <RefreshCcw size={48} />
                <span className="text-xs font-black uppercase">Reset</span>
             </button>
          </div>
        </div>

        {/* Right Column: Integrated WhatsApp Style Chat and Move History */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white rounded-3xl shadow-xl border-4 border-orange-100 h-[500px] flex flex-col overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b-2 border-orange-100">
                <button 
                  onClick={() => setRightPanelTab('moves')}
                  className={`flex-1 py-3 font-black text-sm flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'moves' ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-400 hover:bg-orange-50'}`}
                >
                  <History size={18} /> LANGKAH
                </button>
                <button 
                  onClick={() => { setRightPanelTab('chat'); setHasNewMessage(false); }}
                  className={`flex-1 py-3 font-black text-sm flex items-center justify-center gap-2 transition-colors relative ${rightPanelTab === 'chat' ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
                >
                  <MessageCircle size={18} /> OBROLAN
                  {hasNewMessage && rightPanelTab !== 'chat' && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {rightPanelTab === 'moves' ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {gameStatus.history.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <Star size={64} className="text-orange-400 mb-2" />
                        <p className="text-sm font-bold italic">Belum ada langkah</p>
                      </div>
                    )}
                    {Array.from({ length: Math.ceil(gameStatus.history.length / 2) }).map((_, i) => (
                        <div key={i} className="flex gap-3 items-center text-xs font-black">
                          <span className="w-6 text-orange-300">{i+1}.</span>
                          <span className="flex-1 bg-emerald-50 p-3 rounded-xl text-emerald-700 shadow-sm">{gameStatus.history[i*2]}</span>
                          {gameStatus.history[i*2+1] && <span className="flex-1 bg-orange-50 p-3 rounded-xl text-orange-700 shadow-sm">{gameStatus.history[i*2+1]}</span>}
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col bg-[#e5ddd5] overflow-hidden">
                    {/* Chat Area (WhatsApp Background Style) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {chatMessages.length === 0 && (
                        <div className="text-center opacity-40 py-10">
                           <p className="font-bold text-gray-600 text-sm">Ayo sapa temanmu! 👋</p>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`relative max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm text-sm font-bold flex flex-col ${msg.sender === 'me' ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                              <span>{msg.text}</span>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-[9px] text-gray-400 font-normal">{formatTime(msg.timestamp)}</span>
                                {msg.sender === 'me' && <CheckCheck size={12} className="text-blue-400" />}
                              </div>
                              {/* Tail effect */}
                              <div className={`absolute top-0 w-2 h-2 ${msg.sender === 'me' ? '-right-1.5 bg-[#dcf8c6] [clip-path:polygon(0_0,0_100%,100%_0)]' : '-left-1.5 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]'}`} />
                           </div>
                        </div>
                      ))}
                      <div ref={sideChatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-2 bg-[#f0f0f0] flex items-center gap-2 border-t border-gray-300">
                      <input 
                        type="text" 
                        value={inputChat}
                        onChange={(e) => setInputChat(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                        placeholder="Ketik pesan..."
                        className="flex-1 bg-white rounded-full px-4 py-2 text-xs font-bold outline-none border border-gray-200"
                      />
                      <button 
                        onClick={() => sendChat()}
                        className="bg-[#128c7e] text-white p-2 rounded-full hover:bg-[#075e54] transition-all active:scale-90"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>

           <button 
            onClick={() => setShowTutorial(true)}
            className="w-full bg-yellow-400 text-yellow-900 font-black py-5 rounded-[40px] shadow-xl flex items-center justify-center gap-3 hover:bg-yellow-500 transition-all active:scale-95 text-xl"
           >
            <Info size={24} /> CARA MAIN
          </button>
        </div>
      </main>

      {/* Floating Incoming Chat Toast */}
      {incomingToast && rightPanelTab !== 'chat' && (
        <div 
          onClick={() => { setRightPanelTab('chat'); setHasNewMessage(false); setIncomingToast(null); }}
          className="fixed bottom-10 left-10 z-[200] max-w-xs bg-white border-4 border-blue-500 rounded-3xl p-4 shadow-2xl cursor-pointer animate-in slide-in-from-left duration-300 hover:scale-105 transition-transform"
        >
          <div className="flex items-start gap-3">
             <div className="bg-blue-500 p-2 rounded-xl text-white">
                <Bell size={20} className="animate-ring" />
             </div>
             <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Pesan Baru!</p>
                <p className="text-sm font-bold text-blue-900 line-clamp-2 leading-tight mt-1">"{incomingToast}"</p>
                <p className="text-[9px] font-black text-emerald-600 mt-2 uppercase">Klik untuk balas</p>
             </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-emerald-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[50px] shadow-2xl overflow-hidden border-[12px] border-emerald-500 animate-in fade-in zoom-in duration-300">
            <div className="p-10 space-y-8 text-center">
              <h2 className="text-4xl font-black text-emerald-800 uppercase leading-tight">Halo Jagoan!</h2>
              <div className="space-y-5 text-left">
                <div className="flex gap-4 items-center bg-blue-50 p-5 rounded-3xl border-2 border-blue-100">
                   <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-md"><Users size={28}/></div>
                   <p className="text-sm font-bold text-blue-900 leading-tight">Main di 1 HP atau main online dengan temanmu di tempat berbeda!</p>
                </div>
                <div className="flex gap-4 items-center bg-orange-50 p-5 rounded-3xl border-2 border-orange-100">
                   <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-md"><Undo2 size={28}/></div>
                   <p className="text-sm font-bold text-orange-900 leading-tight">Jangan takut salah! Klik tombol Undo kalau mau coba langkah lain.</p>
                </div>
                <div className="flex gap-4 items-center bg-green-50 p-5 rounded-3xl border-2 border-green-100">
                   <div className="bg-green-500 p-3 rounded-2xl text-white shadow-md"><Star size={28}/></div>
                   <p className="text-sm font-bold text-green-900 leading-tight">Lihat titik hijau di papan untuk tahu ke mana bidak boleh pergi.</p>
                </div>
              </div>
              <button onClick={() => setShowTutorial(false)} className="w-full bg-emerald-500 text-white font-black py-5 rounded-3xl hover:bg-emerald-600 transition-all text-2xl shadow-xl active:scale-95 uppercase">Mengerti!</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 20px; }
        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .animate-ring {
          animation: ring 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
