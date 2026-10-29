import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, PhoneOff, Radio, Eye,
  RefreshCw, HardHat, UserCheck, Volume2, VolumeX, Cctv, Zap,
  Wifi, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Project } from "@/lib/types";

interface LiveStreamTabProps {
  project: Project;
  currentUserId: string;
  currentUserRole: string; // "contractor", "engineer", "admin", "owner", etc.
  currentUserName: string;
}

export function LiveStreamTab({
  project,
  currentUserId,
  currentUserRole,
  currentUserName,
}: LiveStreamTabProps) {
  // Normalize roles:
  const isContractor =
    currentUserRole === "contractor" ||
    (project.contractor_id && project.contractor_id === currentUserId);

  const isEngineer =
    currentUserRole === "engineer" ||
    currentUserRole === "admin" ||
    (project.engineer_id && project.engineer_id === currentUserId);

  // Broadcaster peer ID deterministic by project
  const broadcasterPeerId = `nirman-${project.id.replace(/-/g, "").slice(0, 18)}-site`;

  // Persistent storage keys
  const cctvStorageKey = `nirman_cctv_mode_${project.id}`;
  const autoConnectStorageKey = `nirman_auto_connect_${project.id}`;

  // ── State ────────────────────────────────────────────────────────────────────
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerReady, setPeerReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");

  // Always-On / CCTV mode state
  const [isCctvMode, setIsCctvMode] = useState<boolean>(() => {
    return localStorage.getItem(cctvStorageKey) === "true";
  });
  const [autoConnect, setAutoConnect] = useState<boolean>(() => {
    return localStorage.getItem(autoConnectStorageKey) !== "false";
  });
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Contractor controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isContractorSpeakerMuted, setIsContractorSpeakerMuted] = useState(false);
  const [needsContractorAudioUnlock, setNeedsContractorAudioUnlock] = useState(false);

  // Engineer controls
  const [isEngineerAudioMuted, setIsEngineerAudioMuted] = useState(false);
  const [isEngineerMicMuted, setIsEngineerMicMuted] = useState(false);
  const [isEngineerMicActive, setIsEngineerMicActive] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const [activeViewersCount, setActiveViewersCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("Connecting to signaling...");

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const contractorAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const engineerMicStreamRef = useRef<MediaStream | null>(null);
  const outgoingCallsRef = useRef<MediaConnection[]>([]);
  const incomingCallRef = useRef<MediaConnection | null>(null);
  const peerInstanceRef = useRef<Peer | null>(null);
  const wakeLockRef = useRef<unknown>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoConnectRef = useRef(autoConnect);
  autoConnectRef.current = autoConnect;
  const isCctvModeRef = useRef(isCctvMode);
  isCctvModeRef.current = isCctvMode;

  // ── Screen Wake Lock (Keep phone screen awake in 24/7 CCTV mode) ─────────────
  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (type: string) => Promise<unknown> } };
      if (nav.wakeLock && !wakeLockRef.current) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
        console.log("Screen Wake Lock acquired: phone screen will stay awake.");
      }
    } catch (err) {
      console.warn("Wake lock request failed:", err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      const lock = wakeLockRef.current as { release?: () => Promise<void> } | null;
      if (lock && typeof lock.release === "function") {
        lock.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Stop local stream ────────────────────────────────────────────────────────
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // ── Contractor: start broadcasting ──────────────────────────────────────────
  const startBroadcasting = useCallback(async (isAuto = false) => {
    try {
      setConnectionStatus("Starting site camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsStreaming(true);
      acquireWakeLock();
      setConnectionStatus(
        isCctvModeRef.current
          ? "24/7 CCTV Live Standby — Ready for Engineers"
          : "Live streaming from construction site"
      );
      if (!isAuto) {
        toast.success("Site camera is now live! Engineers can connect automatically anytime.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Camera/Mic error: ${msg}`);
      setConnectionStatus("Camera access denied or device busy");
    }
  }, [cameraFacing, acquireWakeLock]);

  // ── Contractor: stop broadcasting ───────────────────────────────────────────
  const stopBroadcasting = useCallback(() => {
    outgoingCallsRef.current.forEach((c) => c.close());
    outgoingCallsRef.current = [];
    stopLocalStream();
    releaseWakeLock();
    setIsStreaming(false);
    setActiveViewersCount(0);
    setNeedsContractorAudioUnlock(false);
    setConnectionStatus("Site camera stopped");
    toast.info("Live broadcast stopped");
  }, [stopLocalStream, releaseWakeLock]);

  // ── Engineer: connect to site feed with microphone ───────────────────────────
  const connectToSiteFeed = useCallback(async (isAutomatic = false) => {
    const currentPeer = peerInstanceRef.current;
    if (!currentPeer || currentPeer.disconnected || currentPeer.destroyed) {
      if (!isAutomatic) toast.error("Signaling network not ready yet");
      return;
    }

    // Clear any existing retry timers
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setRetryCountdown(null);

    setIsAutoConnecting(true);
    setConnectionStatus("Connecting to site camera feed...");

    // Engineer sends: dummy video + real mic audio (or dummy audio fallback)
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const dummyVideoTrack = canvas.captureStream(1).getVideoTracks()[0];
    const tracks: MediaStreamTrack[] = [dummyVideoTrack];

    // Request engineer mic so contractor can hear engineer
    try {
      if (!engineerMicStreamRef.current) {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        engineerMicStreamRef.current = micStream;
      }
      const engineerAudioTrack = engineerMicStreamRef.current?.getAudioTracks()[0];
      if (engineerAudioTrack) {
        tracks.push(engineerAudioTrack);
        setIsEngineerMicActive(true);
      }
    } catch {
      // Fallback: silent audio track so WebRTC still negotiates audio channel
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const dummyAudio = dst.stream.getAudioTracks()[0];
          if (dummyAudio) {
            dummyAudio.enabled = false;
            tracks.push(dummyAudio);
          }
        }
      } catch {
        // ignore
      }
    }

    const engineerStream = new MediaStream(tracks);
    const call = currentPeer.call(broadcasterPeerId, engineerStream);
    incomingCallRef.current = call;

    // Schedule retry if contractor doesn't answer within 6 seconds
    const scheduleRetry = (msg: string) => {
      setIsViewing(false);
      setIsAutoConnecting(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      if (autoConnectRef.current) {
        let count = 5;
        setRetryCountdown(count);
        setConnectionStatus(`${msg} — Retrying in ${count}s...`);

        countdownIntervalRef.current = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setRetryCountdown(count);
            setConnectionStatus(`${msg} — Retrying in ${count}s...`);
          } else {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            setRetryCountdown(null);
          }
        }, 1000);

        retryTimerRef.current = setTimeout(() => {
          connectToSiteFeed(true);
        }, 5000);
      } else {
        setConnectionStatus(msg);
      }
    };

    call.on("stream", (remoteStream) => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setRetryCountdown(null);
      setIsAutoConnecting(false);
      setIsViewing(true);
      setConnectionStatus("Connected — 24/7 Live Feed (2-Way Audio Active)");

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;

        remoteVideoRef.current.play().catch(() => {
          setNeedsAudioUnlock(true);
        });
      }
      if (!isAutomatic) {
        toast.success("Connected to live site camera!");
      }
    });

    call.on("close", () => {
      scheduleRetry("Site camera feed disconnected");
    });

    call.on("error", () => {
      scheduleRetry("Site camera is offline or waiting for phone");
    });
  }, [broadcasterPeerId]);

  // ── Engineer: disconnect ─────────────────────────────────────────────────────
  const disconnectSiteFeed = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setRetryCountdown(null);
    setIsAutoConnecting(false);

    incomingCallRef.current?.close();
    incomingCallRef.current = null;
    engineerMicStreamRef.current?.getTracks().forEach((t) => t.stop());
    engineerMicStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsViewing(false);
    setIsEngineerMicActive(false);
    setIsEngineerMicMuted(false);
    setNeedsAudioUnlock(false);
    setConnectionStatus("Disconnected");
  }, []);

  // ── PeerJS initialization ────────────────────────────────────────────────────
  useEffect(() => {
    let p: Peer;
    setConnectionStatus("Connecting to signaling network...");

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];

    if (isContractor) {
      p = new Peer(broadcasterPeerId, { config: { iceServers } });
    } else {
      p = new Peer({ config: { iceServers } });
    }

    peerInstanceRef.current = p;

    p.on("open", () => {
      setPeerReady(true);
      setPeer(p);
      setConnectionStatus("Signaling ready");

      // Auto-start for contractor if CCTV mode was enabled
      if (isContractor && isCctvModeRef.current) {
        startBroadcasting(true);
      }

      // Auto-connect for engineer if autoConnect is enabled
      if (isEngineer && autoConnectRef.current) {
        setTimeout(() => {
          connectToSiteFeed(true);
        }, 800);
      }
    });

    p.on("error", (err: unknown) => {
      const errorMsg = (err as { message?: string })?.message || "Peer connection error";
      const errorType = (err as { type?: string })?.type;
      if (errorType === "unavailable-id") {
        setConnectionStatus("Site stream channel already active on another phone");
      } else {
        setConnectionStatus(`Network: ${errorMsg}`);
      }
    });

    // Contractor auto-answers incoming calls continuously
    if (isContractor) {
      p.on("call", (call) => {
        if (!localStreamRef.current) {
          call.close();
          return;
        }

        call.answer(localStreamRef.current);
        outgoingCallsRef.current.push(call);
        setActiveViewersCount((c) => c + 1);

        call.on("stream", (remoteEngineerStream) => {
          if (contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = remoteEngineerStream;
            contractorAudioRef.current.muted = false;
            contractorAudioRef.current.volume = 1.0;
            contractorAudioRef.current.play().catch(() => {
              setNeedsContractorAudioUnlock(true);
            });
          }
        });

        call.on("close", () => {
          outgoingCallsRef.current = outgoingCallsRef.current.filter((c) => c !== call);
          setActiveViewersCount((c) => Math.max(0, c - 1));
          if (outgoingCallsRef.current.length === 0 && contractorAudioRef.current) {
            contractorAudioRef.current.srcObject = null;
          }
          setNeedsContractorAudioUnlock(false);
        });

        toast.info("An Engineer connected to your site camera!");
      });
    }

    // Re-acquire wake lock if tab is focused back
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && (isStreaming || isCctvModeRef.current)) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      outgoingCallsRef.current.forEach((c) => c.close());
      incomingCallRef.current?.close();
      if (engineerMicStreamRef.current) {
        engineerMicStreamRef.current.getTracks().forEach((t) => t.stop());
        engineerMicStreamRef.current = null;
      }
      if (contractorAudioRef.current) {
        contractorAudioRef.current.srcObject = null;
      }
      p.destroy();
      peerInstanceRef.current = null;
      stopLocalStream();
      releaseWakeLock();
    };
  }, [
    project.id,
    isContractor,
    isEngineer,
    broadcasterPeerId,
    acquireWakeLock,
    releaseWakeLock,
    startBroadcasting,
    connectToSiteFeed,
    stopLocalStream,
  ]);

  // ── Toggle CCTV Mode (Contractor) ───────────────────────────────────────────
  const toggleCctvMode = () => {
    const nextVal = !isCctvMode;
    setIsCctvMode(nextVal);
    localStorage.setItem(cctvStorageKey, String(nextVal));

    if (nextVal) {
      toast.success("24/7 CCTV Mode Enabled: Camera stays live & auto-answers incoming engineers!");
      if (!isStreaming) {
        startBroadcasting(false);
      } else {
        acquireWakeLock();
      }
    } else {
      toast.info("24/7 CCTV Mode Disabled");
      releaseWakeLock();
    }
  };

  // ── Toggle Auto-Connect (Engineer) ──────────────────────────────────────────
  const toggleAutoConnect = () => {
    const nextVal = !autoConnect;
    setAutoConnect(nextVal);
    localStorage.setItem(autoConnectStorageKey, String(nextVal));

    if (nextVal) {
      toast.success("Auto-Connect Enabled: Feed will automatically connect whenever site phone is online.");
      if (!isViewing) {
        connectToSiteFeed(false);
      }
    } else {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setRetryCountdown(null);
      toast.info("Auto-Connect Disabled");
    }
  };

  // ── Toggle camera direction ──────────────────────────────────────────────────
  const flipCamera = async () => {
    if (!isStreaming) return;
    const newFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(newFacing);

    try {
      stopLocalStream();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      if (isMuted) {
        newStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }

      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      outgoingCallsRef.current.forEach((call) => {
        const senders = call.peerConnection?.getSenders();
        const videoSender = senders?.find((s) => s.track?.kind === "video");
        if (videoSender && newVideoTrack) videoSender.replaceTrack(newVideoTrack);
        const audioSender = senders?.find((s) => s.track?.kind === "audio");
        if (audioSender && newAudioTrack) audioSender.replaceTrack(newAudioTrack);
      });
      toast.success(`Switched to ${newFacing === "environment" ? "rear" : "front"} camera`);
    } catch {
      toast.error("Failed to switch camera");
    }
  };

  // ── Toggle handlers ──────────────────────────────────────────────────────────
  const toggleEngineerAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsEngineerAudioMuted(remoteVideoRef.current.muted);
    }
  };

  const toggleEngineerMic = () => {
    const audioTrack = engineerMicStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsEngineerMicMuted(!audioTrack.enabled);
      toast.info(audioTrack.enabled ? "Your mic is live — contractor can hear you 🎙️" : "Your mic is muted");
    }
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      toast.info(audioTrack.enabled ? "Site mic is live 🎙️" : "Site mic muted");
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoMuted(!videoTrack.enabled);
    }
  };

  const toggleContractorSpeaker = () => {
    if (contractorAudioRef.current) {
      contractorAudioRef.current.muted = !contractorAudioRef.current.muted;
      setIsContractorSpeakerMuted(contractorAudioRef.current.muted);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Role Header Banner */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Radio className={`h-5 w-5 ${isStreaming || isViewing ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <CardTitle className="text-lg">Live Site Camera (Always-On CCTV)</CardTitle>
                <Badge variant={isStreaming ? "destructive" : isViewing ? "default" : "outline"} className="capitalize">
                  {isStreaming ? (isCctvMode ? "24/7 CCTV ACTIVE" : "LIVE ON SITE") : isViewing ? "WATCHING LIVE" : "STANDBY"}
                </Badge>
                {isCctvMode && isContractor && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-xs">
                    <Zap className="h-3 w-3" /> Auto-Answer Enabled
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Continuous real-time site camera streaming directly from <strong>Site Phone</strong> to <strong>Engineer</strong> with zero lag.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Logged in as:</span>
              <Badge variant="secondary" className="capitalize flex items-center gap-1">
                {isContractor ? <HardHat className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                {currentUserName} ({currentUserRole})
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Screen */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-slate-950 text-white relative rounded-2xl shadow-lg border-slate-800">
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-900">

              {/* ── Contractor side: local camera preview + audio element to hear engineer ── */}
              {isContractor && (
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isStreaming ? "hidden" : ""}`}
                  />
                  <audio ref={contractorAudioRef} autoPlay playsInline className="hidden" />
                </>
              )}

              {/* ── Engineer side: remote video + audio from contractor ── */}
              {isEngineer && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!isViewing ? "hidden" : ""}`}
                />
              )}

              {/* Placeholder when idle */}
              {((isContractor && !isStreaming) || (isEngineer && !isViewing)) && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    {isCctvMode ? <Cctv className="h-8 w-8 text-emerald-400" /> : <Video className="h-8 w-8" />}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-200">
                      {isContractor
                        ? isCctvMode ? "24/7 CCTV Camera Ready" : "Start Live Site Camera"
                        : retryCountdown !== null
                        ? `Site camera offline — Reconnecting in ${retryCountdown}s`
                        : "Waiting for site camera feed"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      {isContractor
                        ? "Mount this phone on site. Turn on '24/7 CCTV Mode' to keep it broadcasting and automatically answering engineers anytime."
                        : autoConnect
                        ? "Auto-connect is active. Your dashboard will automatically connect as soon as the site phone camera is online."
                        : "Click 'Connect to Site Camera' to view what the site camera is broadcasting."}
                    </p>
                  </div>

                  {isEngineer && (
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        onClick={() => connectToSiteFeed(false)}
                        disabled={!peerReady || isAutoConnecting}
                        className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Eye className="h-4 w-4" />
                        {isAutoConnecting ? "Connecting..." : "Connect to Site Camera"}
                      </Button>
                      {retryCountdown !== null && (
                        <span className="text-[11px] text-amber-400 animate-pulse">
                          Auto-retrying in {retryCountdown} seconds...
                        </span>
                      )}
                    </div>
                  )}

                  {isContractor && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                      <Button
                        onClick={() => startBroadcasting(false)}
                        disabled={!peerReady}
                        className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Video className="h-4 w-4" />
                        Start Site Camera
                      </Button>
                      <Button
                        onClick={toggleCctvMode}
                        variant="outline"
                        className="gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Cctv className="h-4 w-4" />
                        {isCctvMode ? "Disable 24/7 Mode" : "Enable 24/7 CCTV Mode"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Overlay Badges */}
              {(isStreaming || isViewing) && (
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </div>
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    {project.name}
                  </div>

                  {isCctvMode && isContractor && (
                    <div className="px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-semibold flex items-center gap-1">
                      <Cctv className="h-3 w-3" /> 24/7 CCTV Active
                    </div>
                  )}

                  {/* Engineer: show contractor voice status */}
                  {isEngineer && isViewing && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isEngineerAudioMuted ? "bg-red-600/80 text-white" : "bg-emerald-600/90 text-white"}`}>
                      {isEngineerAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{isEngineerAudioMuted ? "Site Voice: Muted" : "Site Voice: Active 🔊"}</span>
                    </div>
                  )}

                  {/* Engineer: show own mic status */}
                  {isEngineer && isViewing && isEngineerMicActive && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isEngineerMicMuted ? "bg-red-600/80 text-white" : "bg-blue-600/90 text-white"}`}>
                      {isEngineerMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      <span>{isEngineerMicMuted ? "Your Mic: Off" : "Your Mic: Live 🎙️"}</span>
                    </div>
                  )}

                  {/* Contractor: show own mic status */}
                  {isContractor && isStreaming && (
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium flex items-center gap-1.5">
                      {isMuted
                        ? <span className="text-red-400 flex items-center gap-1"><MicOff className="h-3.5 w-3.5" /> Mic Muted</span>
                        : <span className="text-emerald-400 flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Site Mic: Live 🎙️</span>
                      }
                    </div>
                  )}

                  {/* Contractor: show engineer voice status */}
                  {isContractor && isStreaming && activeViewersCount > 0 && (
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${isContractorSpeakerMuted ? "bg-red-600/80 text-white" : "bg-emerald-600/90 text-white"}`}>
                      {isContractorSpeakerMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{isContractorSpeakerMuted ? "Engineer Voice: Muted" : "Engineer Voice: Active 🔊"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Engineer: click-to-unlock audio (browser autoplay policy) */}
              {needsAudioUnlock && isEngineer && (
                <button
                  onClick={() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      remoteVideoRef.current.play();
                      setNeedsAudioUnlock(false);
                    }
                  }}
                  className="absolute bottom-6 left-4 z-20 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" /> Tap to hear Site Audio
                </button>
              )}

              {/* Contractor: click-to-unlock engineer audio (browser autoplay policy) */}
              {needsContractorAudioUnlock && isContractor && (
                <button
                  onClick={() => {
                    if (contractorAudioRef.current) {
                      contractorAudioRef.current.muted = false;
                      contractorAudioRef.current.play();
                      setNeedsContractorAudioUnlock(false);
                    }
                  }}
                  className="absolute bottom-6 left-4 z-20 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" /> Tap to hear Engineer Voice
                </button>
              )}

              {/* Contractor: active viewer count */}
              {isContractor && isStreaming && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs flex items-center gap-1.5 z-10">
                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                  {activeViewersCount} Active Viewer{activeViewersCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                <span className={`h-2 w-2 rounded-full ${isStreaming || isViewing ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{connectionStatus}</span>
              </div>

              {/* ── Contractor Controls ── */}
              {isContractor && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* CCTV Mode Toggle */}
                  <Button
                    size="sm"
                    variant={isCctvMode ? "default" : "outline"}
                    className={`gap-1.5 ${isCctvMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-slate-700 text-slate-300"}`}
                    onClick={toggleCctvMode}
                    title="Keep camera permanently live & auto-answer engineers"
                  >
                    <Cctv className="h-3.5 w-3.5" />
                    <span className="text-xs">{isCctvMode ? "24/7 CCTV: ON" : "24/7 CCTV: OFF"}</span>
                  </Button>

                  {isStreaming && (
                    <>
                      {/* Flip camera */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                        onClick={flipCamera}
                        title="Switch front/rear camera"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>

                      {/* Toggle site mic */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-slate-700 ${isMuted ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-300"}`}
                        onClick={toggleMute}
                        title={isMuted ? "Unmute site mic" : "Mute site mic"}
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        <span className="text-xs ml-1.5">{isMuted ? "Mic Off" : "Mic (Live)"}</span>
                      </Button>

                      {/* Toggle video */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-slate-700 ${isVideoMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                        onClick={toggleVideo}
                        title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                      >
                        {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      </Button>

                      {/* Hear engineer */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-slate-700 ${isContractorSpeakerMuted ? "bg-red-950 text-red-400" : "bg-blue-950 text-blue-300"}`}
                        onClick={toggleContractorSpeaker}
                        title={isContractorSpeakerMuted ? "Unmute engineer voice" : "Mute engineer voice"}
                      >
                        {isContractorSpeakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        <span className="text-xs ml-1.5">{isContractorSpeakerMuted ? "Eng. Voice Off" : "Eng. Voice (On)"}</span>
                      </Button>

                      {/* End call */}
                      <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopBroadcasting}>
                        <PhoneOff className="h-4 w-4" />
                        Stop Camera
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* ── Engineer Controls ── */}
              {isEngineer && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Auto-Connect Toggle */}
                  <Button
                    size="sm"
                    variant={autoConnect ? "default" : "outline"}
                    className={`gap-1.5 ${autoConnect ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-700 text-slate-300"}`}
                    onClick={toggleAutoConnect}
                    title="Automatically connect as soon as the site phone is live"
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    <span className="text-xs">{autoConnect ? "Auto-Connect: ON" : "Auto-Connect: OFF"}</span>
                  </Button>

                  {isViewing && (
                    <>
                      {/* Hear contractor */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-slate-700 ${isEngineerAudioMuted ? "bg-red-950 text-red-400" : "bg-emerald-950 text-emerald-300"}`}
                        onClick={toggleEngineerAudio}
                        title={isEngineerAudioMuted ? "Unmute site audio" : "Mute site audio"}
                      >
                        {isEngineerAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        <span className="text-xs ml-1.5">
                          {isEngineerAudioMuted ? "Site Muted" : "Site Audio (On)"}
                        </span>
                      </Button>

                      {/* Engineer mic toggle */}
                      {isEngineerMicActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`border-slate-700 ${isEngineerMicMuted ? "bg-red-950 text-red-400" : "bg-blue-950 text-blue-300"}`}
                          onClick={toggleEngineerMic}
                          title={isEngineerMicMuted ? "Unmute your mic" : "Mute your mic"}
                        >
                          {isEngineerMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          <span className="text-xs ml-1.5">
                            {isEngineerMicMuted ? "Your Mic Off" : "Your Mic (Live)"}
                          </span>
                        </Button>
                      )}

                      {/* Disconnect */}
                      <Button size="sm" variant="destructive" className="gap-1.5" onClick={disconnectSiteFeed}>
                        <PhoneOff className="h-4 w-4" />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info & Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cctv className="h-4 w-4 text-emerald-500" />
                24/7 Always-Live Site Camera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  Always-Live CCTV Mode
                </p>
                <p>Mount a dedicated phone on site on a charger. Turn on <strong>24/7 CCTV Mode</strong>. The camera stays awake and automatically answers engineers whenever they open the dashboard.</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  Screen Wake Lock
                </p>
                <p>The app automatically prevents the site phone from locking or going to sleep while streaming.</p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">🎙️ 2-Way Audio</p>
                <p>Engineers can speak directly through the site phone speaker while watching the live video feed.</p>
              </div>

              <div className="border-t pt-2 space-y-2">
                <p className="font-medium text-foreground">Site Channel ID:</p>
                <code className="text-[11px] bg-muted px-2 py-1 rounded block truncate">
                  {broadcasterPeerId}
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" />
                How to Setup Always-Live Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">1</span>
                <span>Place site phone on a stand with charger and open this project.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">2</span>
                <span>Click <strong>Enable 24/7 CCTV Mode</strong> — phone keeps camera ready &amp; prevents sleep.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">3</span>
                <span>Engineers can open their dashboard anytime — it automatically connects without anyone touching the site phone.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
