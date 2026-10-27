import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, PhoneOff, Radio, Eye,
  ShieldAlert, RefreshCw, AlertCircle, HardHat, UserCheck,
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
  // Is this user a contractor (broadcaster)?
  const isContractor =
    currentUserRole === "contractor" ||
    (project.contractor_id && project.contractor_id === currentUserId);

  // Is this user an engineer or admin (viewer)?
  const isEngineer =
    currentUserRole === "engineer" ||
    currentUserRole === "admin" ||
    (project.engineer_id && project.engineer_id === currentUserId);

  // Broadcaster peer ID deterministic by project
  const broadcasterPeerId = `nirman-${project.id.replace(/-/g, "").slice(0, 18)}-site`;

  // State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerReady, setPeerReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [activeViewersCount, setActiveViewersCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("Idle");

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const outgoingCallsRef = useRef<MediaConnection[]>([]);
  const incomingCallRef = useRef<MediaConnection | null>(null);

  // 1. Initialize PeerJS connection based on role
  useEffect(() => {
    let p: Peer;
    setConnectionStatus("Connecting to signaling network...");

    if (isContractor) {
      // Broadcaster uses a fixed, well-known ID for this project
      p = new Peer(broadcasterPeerId, {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });
    } else {
      // Engineer / viewer uses random peer ID
      p = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });
    }

    p.on("open", () => {
      setPeerReady(true);
      setConnectionStatus("Signaling ready");
    });

    p.on("error", (err: unknown) => {
      const errorMsg = (err as { type?: string; message?: string })?.message || "Peer connection error";
      const errorType = (err as { type?: string })?.type;
      
      // If another contractor session is active on same ID:
      if (errorType === "unavailable-id") {
        setConnectionStatus("Site stream channel already reserved / active");
      } else {
        setConnectionStatus(`Network: ${errorMsg}`);
      }
    });

    // When an engineer calls the contractor to request the live feed
    if (isContractor) {
      p.on("call", (call) => {
        if (!localStreamRef.current) {
          call.close();
          return;
        }

        // Answer call with contractor's live camera stream
        call.answer(localStreamRef.current);
        outgoingCallsRef.current.push(call);
        setActiveViewersCount((c) => c + 1);

        call.on("close", () => {
          outgoingCallsRef.current = outgoingCallsRef.current.filter((c) => c !== call);
          setActiveViewersCount((c) => Math.max(0, c - 1));
        });

        toast.info("Engineer joined live site feed");
      });
    }

    setPeer(p);

    return () => {
      // Clean up peer & calls on unmount
      outgoingCallsRef.current.forEach((c) => c.close());
      incomingCallRef.current?.close();
      p.destroy();
      stopLocalStream();
    };
  }, [project.id, isContractor]);

  // Stop local camera stream
  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // Start contractor live camera broadcast
  const startBroadcasting = async () => {
    try {
      setConnectionStatus("Starting site camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsStreaming(true);
      setConnectionStatus("Live streaming from construction site");
      toast.success("Live broadcast started! Engineer can now watch.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Camera error: ${msg}`);
      setConnectionStatus("Camera access denied or failed");
    }
  };

  // Stop contractor broadcast
  const stopBroadcasting = () => {
    outgoingCallsRef.current.forEach((c) => c.close());
    outgoingCallsRef.current = [];
    stopLocalStream();
    setIsStreaming(false);
    setActiveViewersCount(0);
    setConnectionStatus("Broadcast ended");
    toast.info("Live stream ended");
  };

  // Toggle camera direction (front / back on mobile)
  const flipCamera = async () => {
    if (!isStreaming) return;
    const newFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(newFacing);

    try {
      stopLocalStream();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: !isMuted,
      });

      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Replace tracks in active viewer calls
      const newVideoTrack = newStream.getVideoTracks()[0];
      outgoingCallsRef.current.forEach((call) => {
        const senders = call.peerConnection?.getSenders();
        const videoSender = senders?.find((s) => s.track?.kind === "video");
        if (videoSender && newVideoTrack) {
          videoSender.replaceTrack(newVideoTrack);
        }
      });
      toast.success(`Switched to ${newFacing === "environment" ? "back" : "front"} camera`);
    } catch (e: unknown) {
      toast.error("Failed to switch camera");
    }
  };

  // Engineer connects to watch contractor's stream
  const connectToSiteFeed = () => {
    if (!peer) {
      toast.error("Signaling peer not ready");
      return;
    }

    setConnectionStatus("Connecting to contractor's site camera...");

    // Create a dummy stream (receive-only audio/video) to initiate WebRTC call
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const dummyStream = canvas.captureStream(1);

    const call = peer.call(broadcasterPeerId, dummyStream);
    incomingCallRef.current = call;

    call.on("stream", (remoteStream) => {
      setIsViewing(true);
      setConnectionStatus("Connected — Live from Site");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      toast.success("Connected to live construction site view!");
    });

    call.on("close", () => {
      setIsViewing(false);
      setConnectionStatus("Site stream ended or contractor disconnected");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      toast.info("Site camera session ended");
    });

    call.on("error", () => {
      setIsViewing(false);
      setConnectionStatus("Failed to reach contractor camera");
      toast.error("Contractor has not started the live camera yet.");
    });
  };

  const disconnectSiteFeed = () => {
    if (incomingCallRef.current) {
      incomingCallRef.current.close();
      incomingCallRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsViewing(false);
    setConnectionStatus("Disconnected");
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Header Banner */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className={`h-5 w-5 ${isStreaming ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <CardTitle className="text-lg">Live Site Video Call</CardTitle>
                <Badge variant={isStreaming ? "destructive" : isViewing ? "default" : "outline"} className="capitalize">
                  {isStreaming ? "LIVE ON SITE" : isViewing ? "WATCHING LIVE" : "OFFLINE"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Direct camera call from <strong>Contractor (Site)</strong> to <strong>Engineer</strong> for real-time site inspection.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
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
        {/* Video Screen (Main 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-slate-950 text-white relative rounded-2xl shadow-lg border-slate-800">
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-900">
              {/* Contractor's local camera preview */}
              {isContractor && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isStreaming ? "hidden" : ""}`}
                />
              )}

              {/* Engineer's remote video feed */}
              {isEngineer && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!isViewing ? "hidden" : ""}`}
                />
              )}

              {/* Placeholder when not streaming or viewing */}
              {((isContractor && !isStreaming) || (isEngineer && !isViewing)) && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Video className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-200">
                      {isContractor
                        ? "Ready to broadcast site camera"
                        : "Waiting for contractor's site feed"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      {isContractor
                        ? "Click 'Start Site Camera' to open your device camera and stream live video to the engineer."
                        : "Click 'Connect to Site Camera' to view what the contractor is streaming from the construction site."}
                    </p>
                  </div>
                  {isEngineer && (
                    <Button
                      onClick={connectToSiteFeed}
                      disabled={!peerReady}
                      className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Connect to Site Camera
                    </Button>
                  )}
                  {isContractor && (
                    <Button
                      onClick={startBroadcasting}
                      disabled={!peerReady}
                      className="mt-2 gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Video className="h-4 w-4" />
                      Start Site Camera
                    </Button>
                  )}
                </div>
              )}

              {/* Overlay Badges */}
              {(isStreaming || isViewing) && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </div>
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    {project.name}
                  </div>
                </div>
              )}

              {isContractor && isStreaming && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                  {activeViewersCount} Viewer{activeViewersCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{connectionStatus}</span>
              </div>

              {/* Contractor Controls */}
              {isContractor && isStreaming && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    onClick={flipCamera}
                    title="Switch camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-700 ${isVideoMuted ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-200"}`}
                    onClick={toggleVideo}
                    title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                  >
                    {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={stopBroadcasting}
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                </div>
              )}

              {/* Engineer Controls */}
              {isEngineer && isViewing && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={disconnectSiteFeed}
                  >
                    <PhoneOff className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info & Status (1 column) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="h-4 w-4 text-amber-500" />
                Live Inspection Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">Who broadcasts?</p>
                <p>The <strong>Contractor</strong> on the construction site uses their phone/tablet camera to show structural progress, concrete pouring, or issues.</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">Who views?</p>
                <p>The <strong>Engineer</strong> or <strong>Admin</strong> watches the real-time video feed remotely to verify quality, resolve issues, or approve site work without traveling.</p>
              </div>

              <div className="border-t pt-2 space-y-2">
                <p className="font-medium text-foreground">Channel ID:</p>
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
                Connection Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">1</span>
                <span>Contractor opens this tab on mobile at the site and clicks <strong>Start Site Camera</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">2</span>
                <span>Engineer opens this project on their computer or phone and clicks <strong>Connect to Site Camera</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">3</span>
                <span>Peer-to-peer WebRTC video stream establishes directly with zero server fees.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

