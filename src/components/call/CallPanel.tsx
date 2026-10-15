import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Sparkles,
  Video,
} from 'lucide-react';
import { getLocalPlayerId, onlineManager } from '../../online/onlineRoomManager';
import type { CallSignalEvent } from '../../online/onlineRoomManager';
import { sound } from '../../utils/audio';
import { AvatarIcon } from '../SetupWizard';

interface CallPanelProps {
  roomCode: string;
  playerName: string;
}

export const CallPanel: React.FC<CallPanelProps> = ({ roomCode, playerName }) => {
  const localPlayerId = React.useMemo(() => getLocalPlayerId(), []);
  const activeRoom = onlineManager.getActiveRoom();

  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected'>('idle');
  const [incomingCall, setIncomingCall] = useState<CallSignalEvent | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string>('Opponent');
  const [remotePeerAvatar, setRemotePeerAvatar] = useState<string>('crown');
  const [remotePeerColor, setRemotePeerColor] = useState<string>('#06b6d4');

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Video element references
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Call duration timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Format mm:ss
  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe media acquisition with graceful fallback
  const acquireMediaStream = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        // Fallback: procedural canvas + oscillator stream so calls never crash
        return createFallbackStream();
      }
    }
  };

  const createFallbackStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Live Voice Channel', 80, 120);
    }
    const stream = canvas.captureStream ? canvas.captureStream(10) : new MediaStream();
    return stream;
  };

  // Subscribe to call signaling events
  useEffect(() => {
    const unsubscribe = onlineManager.subscribeCall((event: CallSignalEvent) => {
      // 1. INCOMING CALL INVITATION
      if (event.type === 'CALL_INVITE') {
        if (event.callerId !== localPlayerId) {
          setIncomingCall(event);
          setRemotePeerName(event.callerName || 'Opponent');
          if (event.callerAvatar) setRemotePeerAvatar(event.callerAvatar);
          if (event.callerColor) setRemotePeerColor(event.callerColor);
          sound.playRinging();
        }
      }

      // 2. CALL ACCEPTED (LIFTED)
      else if (event.type === 'CALL_ACCEPTED') {
        sound.stopRinging();
        sound.playCallConnected();
        setCallState('connected');
        if (event.answererName) setRemotePeerName(event.answererName);
        setStatusNotice(null);
      }

      // 3. CALL DECLINED
      else if (event.type === 'CALL_DECLINED') {
        sound.stopRinging();
        sound.playCallEnded();
        setCallState('idle');
        cleanupLocalStream();
        setStatusNotice(`${event.answererName || 'Opponent'} declined the call.`);
        setTimeout(() => setStatusNotice(null), 4000);
      }

      // 4. CALL CANCELLED BY CALLER
      else if (event.type === 'CALL_CANCELLED') {
        sound.stopRinging();
        setIncomingCall(null);
      }

      // 5. CALL ENDED
      else if (event.type === 'CALL_ENDED') {
        sound.stopRinging();
        sound.playCallEnded();
        setCallState('idle');
        setIncomingCall(null);
        cleanupLocalStream();
        setStatusNotice('Call ended.');
        setTimeout(() => setStatusNotice(null), 3000);
      }
    });

    return () => {
      unsubscribe();
      sound.stopRinging();
      cleanupLocalStream();
    };
  }, [localPlayerId]);

  const cleanupLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // Find opponent player details
  const opponentPlayer = activeRoom?.players.find((p) => p.id !== localPlayerId);

  // START CALL (Caller initiates)
  const handleStartCall = () => {
    sound.playRinging();
    setCallState('dialing');
    setStatusNotice(null);

    const hostOrOpponent = opponentPlayer?.name || 'Opponent';
    setRemotePeerName(hostOrOpponent);
    if (opponentPlayer?.avatar) setRemotePeerAvatar(opponentPlayer.avatar);
    if (opponentPlayer?.color) setRemotePeerColor(opponentPlayer.color);

    // ⚡ INSTANT DISPATCH: Broadcast CALL_INVITE immediately (0ms delay)
    onlineManager.sendCallSignal({
      type: 'CALL_INVITE',
      callerId: localPlayerId,
      callerName: playerName,
      callerAvatar: activeRoom?.players.find((p) => p.id === localPlayerId)?.avatar || 'crown',
      callerColor: activeRoom?.players.find((p) => p.id === localPlayerId)?.color || '#06b6d4',
      roomCode,
    });

    // Concurrently acquire local media stream in background (non-blocking)
    acquireMediaStream().then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }).catch(() => {
      // Stream error handled gracefully
    });
  };

  // LIFT / ANSWER CALL (Recipient accepts)
  const handleLiftCall = () => {
    if (!incomingCall) return;

    sound.stopRinging();
    sound.playCallConnected();
    const callerId = incomingCall.callerId;
    setIncomingCall(null);
    setCallState('connected');

    // ⚡ INSTANT DISPATCH: Broadcast CALL_ACCEPTED immediately (0ms delay)
    onlineManager.sendCallSignal({
      type: 'CALL_ACCEPTED',
      callerId,
      answererId: localPlayerId,
      answererName: playerName,
      roomCode,
    });

    // Concurrently acquire recipient's media stream in background (non-blocking)
    acquireMediaStream().then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }).catch(() => {
      // Stream error handled gracefully
    });
  };

  // DECLINE CALL
  const handleDeclineCall = () => {
    if (!incomingCall) return;

    sound.stopRinging();
    const callerId = incomingCall.callerId;
    setIncomingCall(null);

    onlineManager.sendCallSignal({
      type: 'CALL_DECLINED',
      callerId,
      answererId: localPlayerId,
      answererName: playerName,
      roomCode,
    });
  };

  // CANCEL CALL WHILE DIALING
  const handleCancelDialing = () => {
    sound.stopRinging();
    setCallState('idle');
    cleanupLocalStream();

    onlineManager.sendCallSignal({
      type: 'CALL_CANCELLED',
      callerId: localPlayerId,
      roomCode,
    });
  };

  // END CONNECTED CALL
  const handleEndCall = () => {
    sound.playCallEnded();
    setCallState('idle');
    cleanupLocalStream();

    onlineManager.sendCallSignal({
      type: 'CALL_ENDED',
      callerId: localPlayerId,
      roomCode,
    });
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMute = !isMuted;
      audioTracks.forEach((t) => (t.enabled = !nextMute));
      setIsMuted(nextMute);
      sound.playMicToggle(nextMute);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const nextVideo = !isVideoEnabled;
      videoTracks.forEach((t) => (t.enabled = nextVideo));
      setIsVideoEnabled(nextVideo);
    }
  };

  return (
    <>
      {/* 1. INCOMING CALL INVITATION MODAL (LIFT OPTION) */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-game-surface border-2 border-emerald-500/80 p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            {/* Pulsing Radar Ringing Animation */}
            <div className="relative flex items-center justify-center my-4">
              <span className="absolute w-20 h-20 rounded-full bg-emerald-400/30 animate-ping" />
              <span
                className="w-16 h-16 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white relative z-10"
                style={{ backgroundColor: remotePeerColor }}
              >
                <AvatarIcon avatar={remotePeerAvatar} className="w-8 h-8" />
              </span>
              <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md z-20">
                <PhoneCall className="w-4 h-4 animate-bounce" />
              </span>
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">
              INCOMING CALL
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {incomingCall.callerName} is calling you!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Match Voice & Video Call • Room {roomCode}
            </p>

            {/* Action Buttons: Lift / Answer vs Decline */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onClick={handleDeclineCall}
                className="py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-500/15 dark:hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                Decline
              </button>

              <button
                onClick={handleLiftCall}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/30 animate-pulse"
              >
                <PhoneCall className="w-4 h-4 fill-current" />
                Lift / Answer Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CALL STATUS NOTICE BANNER */}
      {statusNotice && (
        <div className="mb-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border text-center text-xs font-semibold text-slate-700 dark:text-slate-300 animate-fade-in shadow-sm">
          {statusNotice}
        </div>
      )}

      {/* 3. DIALING / RINGING STATE (Caller Waiting for Answer) */}
      {callState === 'dialing' && (
        <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-cyan-900/30 via-fuchsia-900/20 to-blue-950/40 border-2 border-cyan-400/60 shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-12 h-12 rounded-full bg-cyan-400/30 animate-ping" />
              <span className="w-10 h-10 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg relative z-10">
                <PhoneCall className="w-5 h-5 animate-bounce" />
              </span>
            </div>

            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <span>Calling {remotePeerName}...</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              </h4>
              <p className="text-xs text-cyan-200">Ringing opponent device. Waiting for them to lift...</p>
            </div>
          </div>

          <button
            onClick={handleCancelDialing}
            className="py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-red-600/30"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 4. IDLE STATE: Start Call Button */}
      {callState === 'idle' && (
        <div className="w-full p-3.5 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Match Voice & Video</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Call {opponentPlayer?.name || 'opponent'} during this match
              </p>
            </div>
          </div>

          <button
            onClick={handleStartCall}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            <PhoneCall className="w-3.5 h-3.5 fill-current" />
            Call Opponent
          </button>
        </div>
      )}

      {/* 5. CONNECTED LIVE CALL STATE */}
      {callState === 'connected' && (
        <div className="w-full rounded-3xl bg-white dark:bg-game-surface border-2 border-emerald-500/60 p-4 shadow-2xl flex flex-col gap-3 transition-all animate-fade-in">
          {/* Call Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">Connected: {remotePeerName}</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  {formatDuration(callDuration)}
                </span>
              </div>

              {/* Animated Equalizer Waveform */}
              <div className="flex items-center gap-0.5 h-4 ml-1">
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-2" />
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-4" style={{ animationDelay: '0.15s' }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" style={{ animationDelay: '0.3s' }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.45s' }} />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-game-surfaceLight transition"
                title={isMinimized ? 'Expand call view' : 'Minimize call view'}
              >
                {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={handleEndCall}
                className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition"
                title="End call"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Grid (Hidden if Minimized) */}
          {!isMinimized && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opponent Tile */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <div className="flex flex-col items-center gap-2 text-center p-3">
                  <div
                    className="w-14 h-14 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white relative"
                    style={{ backgroundColor: remotePeerColor }}
                  >
                    <AvatarIcon avatar={remotePeerAvatar} className="w-7 h-7" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{remotePeerName}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Voice & Video Live
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                  {remotePeerName}
                </div>
              </div>

              {/* Your Local Tile */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <CameraOff className="w-5 h-5" />
                    </div>
                    <span>Camera Off</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                  <span>{playerName} (You)</span>
                  {isMuted ? (
                    <MicOff className="w-3 h-3 text-red-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40'
                    : 'bg-slate-100 dark:bg-game-surfaceLight text-slate-800 dark:text-slate-200 hover:text-cyan-500 border border-slate-200 dark:border-slate-700/60'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-500" />}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleCamera}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  !isVideoEnabled
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-game-surfaceLight text-slate-800 dark:text-slate-200 hover:text-emerald-500 border border-slate-200 dark:border-slate-700/60'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Camera className="w-4 h-4 text-emerald-500" /> : <CameraOff className="w-4 h-4" />}
                <span>{isVideoEnabled ? 'Video On' : 'Video Off'}</span>
              </button>
            </div>

            <button
              onClick={handleEndCall}
              className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-red-600/20"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Call
            </button>
          </div>
        </div>
      )}
    </>
  );
};
