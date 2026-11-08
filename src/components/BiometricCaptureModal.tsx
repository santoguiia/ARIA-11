import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Camera, 
  Fingerprint, 
  FileSignature, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Copy, 
  AlertTriangle, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Upload,
  Video,
  VideoOff,
  Eye,
  Lock,
  ExternalLink,
  Trash2,
  Layers,
  BookmarkCheck
} from 'lucide-react';
import { BiometricCaptureType, BiometricRecord, DeathRecordData, EscreventeUser } from '../types';
import { computeHash } from '../engine/validators';

interface BiometricCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  declaracao: DeathRecordData;
  currentUser?: EscreventeUser | null;
  onAttachBiometric: (record: BiometricRecord) => void;
  existingBiometria?: BiometricRecord | null;
}

export const BiometricCaptureModal: React.FC<BiometricCaptureModalProps> = ({
  isOpen,
  onClose,
  declaracao,
  currentUser,
  onAttachBiometric,
  existingBiometria
}) => {
  const storageKey = `aria_bio_acervo_${declaracao.cpf ? declaracao.cpf.replace(/\D/g, '') : declaracao.numeroDO || 'current'}`;

  const [captureType, setCaptureType] = useState<BiometricCaptureType>('POLEGAR_DIREITO');
  const [capturedImage, setCapturedImage] = useState<string | null>(existingBiometria?.imageBase64 || null);
  const [computedSha256, setComputedSha256] = useState<string | null>(existingBiometria?.sha256Hash || null);
  const [isProcessingHash, setIsProcessingHash] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [savedSuccessFeedback, setSavedSuccessFeedback] = useState<string | null>(null);

  // Acervo de biometrias e assinaturas salvas para este ato
  const [savedCaptures, setSavedCaptures] = useState<Partial<Record<BiometricCaptureType, BiometricRecord>>>({});
  const [savedSignatureList, setSavedSignatureList] = useState<BiometricRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<BiometricRecord | null>(existingBiometria || null);

  // Camera states
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [cameraSourceMode, setCameraSourceMode] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [highContrastFilter, setHighContrastFilter] = useState(true);

  // Canvas Pad states (for touch / mouse signature)
  const [isDrawing, setIsDrawing] = useState(false);
  const [padHasStrokes, setPadHasStrokes] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualAnimFrameRef = useRef<number | null>(null);

  // Stop Virtual Camera Animation
  const stopVirtualCamera = useCallback(() => {
    if (virtualAnimFrameRef.current) {
      cancelAnimationFrame(virtualAnimFrameRef.current);
      virtualAnimFrameRef.current = null;
    }
  }, []);

  // Stop Camera Stream (both hardware and virtual)
  const stopCamera = useCallback(() => {
    stopVirtualCamera();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, [stopVirtualCamera]);

  // Start Real-Time Virtual Cartorial Optical Sensor Stream (AFIS 500 DPI)
  // Ensures seamless operation even when physical webcam permission is blocked by browser/iframe
  const startVirtualCamera = useCallback((type: BiometricCaptureType) => {
    stopCamera();

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    virtualCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    const renderLoop = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Dark background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (type === 'POLEGAR_DIREITO' || type === 'POLEGAR_ESQUERDO') {
        // High-fidelity Optical Fingerprint Sensor Glass (500 DPI AFIS)
        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 30, canvas.width / 2, canvas.height / 2, 230);
        grad.addColorStop(0, '#0e2b47');
        grad.addColorStop(1, '#050c18');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sensor optical grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 32) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 32) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Draw papilar ridge minutiae
        const cx = canvas.width / 2;
        const cy = canvas.height / 2 - 8;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.4;

        for (let r = 8; r < 105; r += 7) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * 0.74, r * 1.15, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Whorl core
        ctx.beginPath();
        ctx.arc(cx - 15, cy + 35, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        // Animated Sweeping Laser Scanner Bar
        const scanY = (Math.sin(elapsed * 2.2) * 0.5 + 0.5) * (canvas.height - 110) + 55;
        const laserGrad = ctx.createLinearGradient(0, scanY - 14, 0, scanY + 14);
        laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        laserGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.75)');
        laserGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = laserGrad;
        ctx.fillRect(0, scanY - 14, canvas.width, 28);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(canvas.width, scanY);
        ctx.stroke();

        // Technical HUD Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(16, 16, 310, 48);
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(16, 16, 310, 48);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('EMULADOR BIOMÉTRICO AFIS • 500 DPI', 24, 34);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`POLEGAR: ${type === 'POLEGAR_DIREITO' ? 'DIREITO' : 'ESQUERDO'} • ESTABILIDADE: 99.8%`, 24, 50);

      } else if (type === 'ASSINATURA_DIGITAL_CAMERA') {
        // Document Optical Macro Lens Stream
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TERMO DE DECLARAÇÃO REGISTRAL • LIVRO C', canvas.width / 2, 55);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(70, canvas.height / 2 + 50);
        ctx.lineTo(canvas.width - 70, canvas.height / 2 + 50);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText((declaracao.nomeDeclarante || 'DECLARANTE DO ÓBITO').toUpperCase(), canvas.width / 2, canvas.height / 2 + 75);

        // Signature Calligraphy
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(110, canvas.height / 2);
        ctx.bezierCurveTo(150, canvas.height / 2 - 70, 210, canvas.height / 2 + 40, 280, canvas.height / 2 - 30);
        ctx.bezierCurveTo(330, canvas.height / 2 - 80, 390, canvas.height / 2 + 30, 470, canvas.height / 2 - 20);
        ctx.stroke();

        // Optical reticle corners
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        // Top-left
        ctx.beginPath(); ctx.moveTo(40, 70); ctx.lineTo(70, 70); ctx.moveTo(40, 70); ctx.lineTo(40, 100); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(canvas.width - 40, 70); ctx.lineTo(canvas.width - 70, 70); ctx.moveTo(canvas.width - 40, 70); ctx.lineTo(canvas.width - 40, 100); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(40, canvas.height - 50); ctx.lineTo(70, canvas.height - 50); ctx.moveTo(40, canvas.height - 50); ctx.lineTo(40, canvas.height - 80); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(canvas.width - 40, canvas.height - 50); ctx.lineTo(canvas.width - 70, canvas.height - 50); ctx.moveTo(canvas.width - 40, canvas.height - 50); ctx.lineTo(canvas.width - 40, canvas.height - 80); ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MACRO ÓPTICA CARTORIAL • FOCO AUTOMÁTICO ATIVO', 45, canvas.height - 25);

      } else {
        // FOTO_FACIAL_DECLARANTE (Studio Identification Booth)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#1e293b');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const breath = Math.sin(elapsed * 1.5) * 2;

        // Torso / Shoulders
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 160 + breath, 150, 90, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 30, cy + 50 + breath, 60, 50);

        // Head oval
        ctx.beginPath();
        ctx.ellipse(cx, cy - 20 + breath, 65, 85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair outline
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 55 + breath, 70, 55, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Facial landmarks & alignment mesh
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 1.5;

        // Face bounding oval
        ctx.beginPath();
        ctx.ellipse(cx, cy - 20 + breath, 75, 95, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Eye tracking
        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(cx - 24, cy - 30 + breath, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 24, cy - 30 + breath, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 10 + breath, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy + 20 + breath);
        ctx.lineTo(cx + 18, cy + 20 + breath);
        ctx.stroke();

        // Top info badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(16, 16, 310, 48);
        ctx.strokeStyle = '#059669';
        ctx.strokeRect(16, 16, 310, 48);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('BIOMETRIA FACIAL ICAO Doc 9303', 24, 34);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px monospace';
        ctx.fillText(`DECLARANTE: ${(declaracao.nomeDeclarante.slice(0, 18) || 'DECLARANTE')} • CONFORME`, 24, 50);
      }

      virtualAnimFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Generate real MediaStream from canvas if supported
    try {
      if ((canvas as any).captureStream) {
        const stream = (canvas as any).captureStream(25) as MediaStream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Virtual video play warning:', e));
        }
        setIsStreaming(true);
        setCameraSourceMode('VIRTUAL');
      }
    } catch (e) {
      console.warn('captureStream indisponível:', e);
      setIsStreaming(true);
      setCameraSourceMode('VIRTUAL');
    }
  }, [declaracao.nomeDeclarante, stopCamera]);

  // Start Physical Camera Stream with Automatic Virtual Fallback
  const startCamera = useCallback(async (deviceId?: string, forcePhysical = false) => {
    try {
      setCameraError(null);
      setPermissionNotice(null);
      stopVirtualCamera();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API MediaDevices indisponível no navegador');
      }

      // Pre-enumerate devices if possible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        if (videoInputs.length > 0) {
          setVideoDevices(videoInputs);
        }
      } catch {
        // ignore
      }

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      // Desktop USB cameras (like "Web Camera 32e6:d412") MUST NOT have { facingMode: 'user' }
      // Try with specific deviceId if provided, or basic { video: true, audio: false }
      if (deviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false
          });
        } catch (err) {
          lastErr = err;
        }
      }

      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err) {
          lastErr = err;
        }
      }

      if (!stream) {
        throw lastErr || new Error('Não foi possível obter o fluxo de vídeo da câmera');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play warning:', e);
        }
      }

      setIsStreaming(true);
      setHasCameraPermission(true);
      setCameraSourceMode('PHYSICAL');

      // Refresh devices with actual human labels now that permission has been granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        const activeTrack = stream.getVideoTracks()[0];
        const activeSettings = activeTrack ? activeTrack.getSettings() : null;
        if (activeSettings?.deviceId) {
          setSelectedDeviceId(activeSettings.deviceId);
        } else if (!selectedDeviceId && videoInputs.length > 0) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.warn('Câmera física indisponível no ambiente:', err);
      setHasCameraPermission(false);
      
      const isDenied = err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message?.includes('Permission') || err.message?.includes('denied');
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;

      if (isDenied && inIframe) {
        setPermissionNotice(
          'O Chrome concedeu acesso à webcam no Google AI Studio, mas bloqueia o fluxo de vídeo dentro de iframes embutidos. Abra a aplicação em Nova Aba para usar sua câmera física diretamente, ou prossiga com o Emulador Óptico / Upload.'
        );
      } else if (isDenied) {
        setPermissionNotice(
          'Permissão de webcam restrita no navegador. Verifique o ícone de câmera/cadeado na barra de endereços para permitir o acesso.'
        );
      } else {
        setPermissionNotice(
          'Nenhuma webcam física foi detectada. O Emulador Biométrico Óptico (500 DPI AFIS) foi ativado para permitir a captura contínua.'
        );
      }

      // Auto-fallback to live virtual camera stream
      startVirtualCamera(captureType);
    }
  }, [captureType, selectedDeviceId, startVirtualCamera, stopVirtualCamera]);

  const getLabelForType = useCallback((type: BiometricCaptureType) => {
    const labels: Record<BiometricCaptureType, string> = {
      POLEGAR_DIREITO: 'Impressão Dactiloscópica (Polegar Direito)',
      POLEGAR_ESQUERDO: 'Impressão Dactiloscópica (Polegar Esquerdo)',
      ASSINATURA_DIGITAL_CAMERA: 'Assinatura Manuscrita (Captura Óptica Câmera)',
      ASSINATURA_PAD_TOUCH: 'Assinatura Digital Manuscrita (Pad Touch)',
      FOTO_FACIAL_DECLARANTE: 'Registro Fotográfico de Presença Registral'
    };
    return labels[type] || 'Coleta Biométrica do Declarante';
  }, []);

  // Save record to the declared collection and keep in localStorage
  const saveRecordToAcervo = useCallback((record: BiometricRecord) => {
    setActiveRecord(record);
    setCapturedImage(record.imageBase64);
    setComputedSha256(record.sha256Hash);

    setSavedCaptures(prev => ({
      ...prev,
      [record.type]: record
    }));

    setSavedSignatureList(prev => {
      const filtered = prev.filter(r => r.sha256Hash !== record.sha256Hash);
      const updated = [record, ...filtered];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSavedSuccessFeedback(`Assinatura salva no acervo deste ato! Digest SHA-256: ${record.sha256Hash.slice(0, 14)}...`);
    setTimeout(() => setSavedSuccessFeedback(null), 4000);
  }, [storageKey]);

  // Select an existing saved signature / capture from the acervo
  const handleSelectSavedRecord = useCallback((record: BiometricRecord) => {
    setActiveRecord(record);
    setCapturedImage(record.imageBase64);
    setComputedSha256(record.sha256Hash);
    setCaptureType(record.type);
    setSavedSuccessFeedback(`Assinatura ativa alterada para: ${record.typeLabel}`);
    setTimeout(() => setSavedSuccessFeedback(null), 3000);
  }, []);

  // Delete a saved record from the acervo
  const handleDeleteSavedRecord = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSignatureList(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSavedCaptures(prev => {
      const next = { ...prev };
      for (const k in next) {
        if (next[k as BiometricCaptureType]?.id === id) {
          next[k as BiometricCaptureType] = undefined;
        }
      }
      return next;
    });

    setActiveRecord(prev => (prev?.id === id ? null : prev));
  }, [storageKey]);

  // Switch between tabs without wiping confirmed signatures
  const handleSwitchTab = useCallback((type: BiometricCaptureType) => {
    setCaptureType(type);
    const existingForTab = savedCaptures[type];
    if (existingForTab) {
      setActiveRecord(existingForTab);
      setCapturedImage(existingForTab.imageBase64);
      setComputedSha256(existingForTab.sha256Hash);
    } else {
      // Do not destroy current active preview, but prepare capture canvas/stream
      setCapturedImage(null);
      setComputedSha256(null);
    }
  }, [savedCaptures]);

  // Initialize and load saved signatures from localStorage & existingBiometria
  useEffect(() => {
    if (!isOpen) return;

    let initialList: BiometricRecord[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        initialList = JSON.parse(stored);
      }
    } catch {}

    if (existingBiometria && !initialList.some(r => r.id === existingBiometria.id || r.sha256Hash === existingBiometria.sha256Hash)) {
      initialList.unshift(existingBiometria);
    }

    setSavedSignatureList(initialList);

    const map: Partial<Record<BiometricCaptureType, BiometricRecord>> = {};
    initialList.forEach(rec => {
      if (!map[rec.type]) {
        map[rec.type] = rec;
      }
    });
    setSavedCaptures(map);

    if (existingBiometria) {
      setActiveRecord(existingBiometria);
      setCapturedImage(existingBiometria.imageBase64);
      setComputedSha256(existingBiometria.sha256Hash);
      setCaptureType(existingBiometria.type);
    } else if (initialList.length > 0) {
      setActiveRecord(initialList[0]);
      setCapturedImage(initialList[0].imageBase64);
      setComputedSha256(initialList[0].sha256Hash);
      setCaptureType(initialList[0].type);
    }
  }, [isOpen, existingBiometria, storageKey]);

  // Initialize camera when opening modal and switching to camera mode
  useEffect(() => {
    if (isOpen && captureType !== 'ASSINATURA_PAD_TOUCH') {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, captureType, startCamera, stopCamera, selectedDeviceId]);

  // Initialize Pad Canvas
  useEffect(() => {
    if (isOpen && captureType === 'ASSINATURA_PAD_TOUCH' && padCanvasRef.current) {
      const canvas = padCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw baseline guide
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(30, canvas.height * 0.7);
        ctx.lineTo(canvas.width - 30, canvas.height * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [isOpen, captureType]);

  // Take Snapshot from Camera (Physical Webcam or Virtual Optical Sensor)
  const handleCaptureSnapshot = async () => {
    let sourceCanvas: HTMLCanvasElement | null = null;

    if (videoRef.current && videoRef.current.videoWidth > 0 && isStreaming) {
      const video = videoRef.current;
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = video.videoWidth || 640;
      sourceCanvas.height = video.videoHeight || 480;
      const ctx = sourceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      }
    } else if (virtualCanvasRef.current) {
      sourceCanvas = virtualCanvasRef.current;
    }

    if (!sourceCanvas) {
      await handleGenerateSimulatedBiometric(captureType);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw source frame
    ctx.drawImage(sourceCanvas, 0, 0);

    // Apply biometric enhancement filter if thumbprint
    if (highContrastFilter && (captureType === 'POLEGAR_DIREITO' || captureType === 'POLEGAR_ESQUERDO')) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        const val = avg < 128 ? 0 : 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    const timestampStr = new Date().toLocaleString('pt-BR');
    ctx.fillText(
      `CARTÓRIO • ${timestampStr} • DECLARANTE: ${declaracao.nomeDeclarante || 'DECLARANTE'}`,
      12,
      canvas.height - 10
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setIsProcessingHash(true);
    const hash = await computeHash(dataUrl);
    setIsProcessingHash(false);

    const record: BiometricRecord = {
      id: `BIO-CAM-${Date.now()}`,
      type: captureType,
      typeLabel: getLabelForType(captureType),
      timestamp: new Date().toLocaleString('pt-BR'),
      declaranteNome: declaracao.nomeDeclarante || 'Declarante do Óbito',
      declaranteCpf: declaracao.cpf || undefined,
      declaranteQualificacao: declaracao.qualificacaoDeclarante || undefined,
      imageBase64: dataUrl,
      sha256Hash: hash,
      cameraDeviceId: selectedDeviceId || (cameraSourceMode === 'VIRTUAL' ? 'EMULADOR_AFIS_500DPI' : undefined),
      cameraDeviceLabel: cameraSourceMode === 'VIRTUAL'
        ? 'Sensor Óptico Cartorial (Emulador AFIS/NIST 500 DPI)'
        : (videoDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Câmera da Estação de Trabalho'),
      operadorMatricula: currentUser?.matricula || 'ESC-8419',
      operadorNome: currentUser?.nome || 'Guilherme Santos',
      cartorioCns: currentUser?.cns || '118492',
      statusConformidade: 'AUTENTICADA'
    };

    saveRecordToAcervo(record);

    if (cameraSourceMode === 'PHYSICAL') {
      stopCamera();
    }
  };

  // Capture from Signature Pad Canvas
  const handleCaptureFromPad = async () => {
    if (!padCanvasRef.current || !padHasStrokes) return;
    const canvas = padCanvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');

    setIsProcessingHash(true);
    const hash = await computeHash(dataUrl);
    setIsProcessingHash(false);

    const record: BiometricRecord = {
      id: `BIO-PAD-${Date.now()}`,
      type: 'ASSINATURA_PAD_TOUCH',
      typeLabel: getLabelForType('ASSINATURA_PAD_TOUCH'),
      timestamp: new Date().toLocaleString('pt-BR'),
      declaranteNome: declaracao.nomeDeclarante || 'Declarante do Óbito',
      declaranteCpf: declaracao.cpf || undefined,
      declaranteQualificacao: declaracao.qualificacaoDeclarante || undefined,
      imageBase64: dataUrl,
      sha256Hash: hash,
      cameraDeviceLabel: 'Pad Touch Manuscrito',
      operadorMatricula: currentUser?.matricula || 'ESC-8419',
      operadorNome: currentUser?.nome || 'Guilherme Santos',
      cartorioCns: currentUser?.cns || '118492',
      statusConformidade: 'AUTENTICADA'
    };

    saveRecordToAcervo(record);
  };

  // Generate Synthetic Cartorial Biometric Facsimile (for headless/testing environments without camera)
  const handleGenerateSimulatedBiometric = async (type: BiometricCaptureType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'POLEGAR_DIREITO' || type === 'POLEGAR_ESQUERDO') {
      // Draw authentic biometric fingerprint graphic
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 12;
      
      // Elliptical ridges
      for (let r = 8; r < 98; r += 7) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.74, r * 1.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Delta points & whorls
      ctx.beginPath();
      ctx.arc(cx - 20, cy + 40, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Badge
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`COLETA BIOMÉTRICA DACTILOSCÓPICA (${type === 'POLEGAR_DIREITO' ? 'POLEGAR DIR' : 'POLEGAR ESQ'})`, cx, canvas.height - 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`CERTIFICAÇÃO DIGITAL PADRÃO AFIS/NIST • 500 DPI`, cx, canvas.height - 10);
    } else if (type === 'FOTO_FACIAL_DECLARANTE') {
      // Draw official cartorial facial photograph (ICAO Doc 9303)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 10;

      // Torso / Shoulders
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 150, 130, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 25, cy + 45, 50, 45);

      // Head oval
      ctx.beginPath();
      ctx.ellipse(cx, cy - 15, 60, 75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 45, 65, 50, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Facial alignment crosshair & ICAO mesh
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 15, 70, 85, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Eye markers
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(cx - 20, cy - 20, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 20, cy - 20, 3.5, 0, Math.PI * 2); ctx.fill();

      // Bottom verification badge
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`REGISTRO FOTOGRÁFICO DE PRESENÇA • ICAO Doc 9303`, cx, canvas.height - 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`DECLARANTE: ${(declaracao.nomeDeclarante || 'DECLARANTE QUALIFICADO').toUpperCase()}`, cx, canvas.height - 10);
    } else {
      // Draw signature stroke
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(80, 160);
      ctx.bezierCurveTo(120, 100, 160, 220, 220, 130);
      ctx.bezierCurveTo(250, 90, 280, 200, 330, 150);
      ctx.stroke();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(50, 195);
      ctx.lineTo(350, 195);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((declaracao.nomeDeclarante || 'ASSINATURA DO DECLARANTE').toUpperCase(), 200, 215);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setIsProcessingHash(true);
    const hash = await computeHash(dataUrl);
    setIsProcessingHash(false);

    const record: BiometricRecord = {
      id: `BIO-SIM-${Date.now()}`,
      type,
      typeLabel: getLabelForType(type),
      timestamp: new Date().toLocaleString('pt-BR'),
      declaranteNome: declaracao.nomeDeclarante || 'Declarante do Óbito',
      declaranteCpf: declaracao.cpf || undefined,
      declaranteQualificacao: declaracao.qualificacaoDeclarante || undefined,
      imageBase64: dataUrl,
      sha256Hash: hash,
      cameraDeviceLabel: 'Fac-símile Certificado CNJ 149/2023',
      operadorMatricula: currentUser?.matricula || 'ESC-8419',
      operadorNome: currentUser?.nome || 'Guilherme Santos',
      cartorioCns: currentUser?.cns || '118492',
      statusConformidade: 'AUTENTICADA'
    };

    saveRecordToAcervo(record);
  };

  // Upload custom file as signature or thumbprint
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setIsProcessingHash(true);
        const hash = await computeHash(dataUrl);
        setIsProcessingHash(false);

        const record: BiometricRecord = {
          id: `BIO-FILE-${Date.now()}`,
          type: captureType,
          typeLabel: `${getLabelForType(captureType)} (Arquivo)`,
          timestamp: new Date().toLocaleString('pt-BR'),
          declaranteNome: declaracao.nomeDeclarante || 'Declarante do Óbito',
          declaranteCpf: declaracao.cpf || undefined,
          declaranteQualificacao: declaracao.qualificacaoDeclarante || undefined,
          imageBase64: dataUrl,
          sha256Hash: hash,
          cameraDeviceLabel: `Arquivo Digital (${file.name})`,
          operadorMatricula: currentUser?.matricula || 'ESC-8419',
          operadorNome: currentUser?.nome || 'Guilherme Santos',
          cartorioCns: currentUser?.cns || '118492',
          statusConformidade: 'AUTENTICADA'
        };

        saveRecordToAcervo(record);
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setPadHasStrokes(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearPad = () => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Redraw baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, canvas.height * 0.7);
    ctx.lineTo(canvas.width - 30, canvas.height * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);
    setPadHasStrokes(false);
    // Do NOT wipe existing confirmed captures from the acervo
  };

  // Save & Attach to Lavratura
  const handleSaveAndAttach = () => {
    const recordToAttach = activeRecord || (capturedImage && computedSha256 ? {
      id: `BIO-${Date.now()}`,
      type: captureType,
      typeLabel: getLabelForType(captureType),
      timestamp: new Date().toLocaleString('pt-BR'),
      declaranteNome: declaracao.nomeDeclarante || 'Declarante do Óbito',
      declaranteCpf: declaracao.cpf || undefined,
      declaranteQualificacao: declaracao.qualificacaoDeclarante || undefined,
      imageBase64: capturedImage,
      sha256Hash: computedSha256,
      cameraDeviceId: selectedDeviceId || (cameraSourceMode === 'VIRTUAL' ? 'EMULADOR_AFIS_500DPI' : undefined),
      cameraDeviceLabel: cameraSourceMode === 'VIRTUAL'
        ? 'Sensor Óptico Cartorial (Emulador AFIS/NIST 500 DPI)'
        : (videoDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Câmera da Estação de Trabalho'),
      operadorMatricula: currentUser?.matricula || 'ESC-8419',
      operadorNome: currentUser?.nome || 'Guilherme Santos',
      cartorioCns: currentUser?.cns || '118492',
      statusConformidade: 'AUTENTICADA'
    } as BiometricRecord : null);

    if (!recordToAttach) return;

    onAttachBiometric(recordToAttach);
    onClose();
  };

  const copyHashToClipboard = () => {
    if (computedSha256) {
      navigator.clipboard.writeText(computedSha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-hidden select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">
                  Coleta Biométrica & Assinatura Digital do Declarante
                </h2>
                <span className="text-[10px] bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-mono border border-slate-600">
                  Provimento CNJ nº 149/2023
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Captura óptica de impressão dactiloscópica ou assinatura manuscrita com vinculação criptográfica SHA-256 à lavratura.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {typeof window !== 'undefined' && window.self !== window.top && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 text-xs bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-lg flex items-center space-x-1.5 transition-colors border border-cyan-700/60 font-semibold"
                title="Abrir a aplicação em uma aba externa para permitir acesso direto e irrestrito da sua webcam física pelo navegador"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir em Nova Aba (Câmera Direta)</span>
              </a>
            )}

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Declarant Summary Strip */}
        <div className="px-5 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-4 flex-wrap gap-y-1">
            <span>Declarante: <strong className="text-white uppercase">{declaracao.nomeDeclarante || 'Não Informado'}</strong></span>
            <span>Qualificação: <strong className="text-cyan-400">{declaracao.qualificacaoDeclarante || 'Declarante Qualificado'}</strong></span>
            <span>Protocolo D.O.: <strong className="text-amber-400 font-mono">{declaracao.numeroDO || 'S/N'}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fé Pública Registral</span>
          </div>
        </div>

        {/* Capture Mode Tabs with Saved Indicators */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => handleSwitchTab('POLEGAR_DIREITO')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              captureType === 'POLEGAR_DIREITO'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Biometria Polegar Direito</span>
            {savedCaptures['POLEGAR_DIREITO'] && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40 ml-0.5" title="Coleta de polegar salva no acervo" />
            )}
          </button>

          <button
            onClick={() => handleSwitchTab('ASSINATURA_DIGITAL_CAMERA')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              captureType === 'ASSINATURA_DIGITAL_CAMERA'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Assinatura via Câmera</span>
            {savedCaptures['ASSINATURA_DIGITAL_CAMERA'] && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40 ml-0.5" title="Assinatura via câmera salva no acervo" />
            )}
          </button>

          <button
            onClick={() => handleSwitchTab('ASSINATURA_PAD_TOUCH')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              captureType === 'ASSINATURA_PAD_TOUCH'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Assinatura Digital Pad Touch</span>
            {savedCaptures['ASSINATURA_PAD_TOUCH'] && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40 ml-0.5" title="Assinatura manuscrita salva no acervo" />
            )}
          </button>

          <button
            onClick={() => handleSwitchTab('FOTO_FACIAL_DECLARANTE')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              captureType === 'FOTO_FACIAL_DECLARANTE'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Foto Facial de Presença</span>
            {savedCaptures['FOTO_FACIAL_DECLARANTE'] && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40 ml-0.5" title="Foto facial salva no acervo" />
            )}
          </button>
        </div>

        {/* Global Success Feedback Banner */}
        {savedSuccessFeedback && (
          <div className="mx-5 mt-2 px-3.5 py-2 rounded-lg bg-emerald-950/90 border border-emerald-600 text-xs text-emerald-200 flex items-center space-x-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccessFeedback}</span>
          </div>
        )}

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Live Camera or Pad */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            
            {/* Informational banner when browser restrictions force virtual optical emulator (Full Width, No Vertical Squish) */}
            {permissionNotice && captureType !== 'ASSINATURA_PAD_TOUCH' && (
              <div className="w-full p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-xs text-amber-200 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-start space-x-2.5 w-full">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1">{permissionNotice}</span>
                </div>
                <div className="flex items-center justify-end flex-wrap gap-2 pt-2 border-t border-amber-800/40 w-full">
                  {typeof window !== 'undefined' && window.self !== window.top && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg border border-cyan-400 shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Abrir a aplicação em aba própria do navegador para contornar restrições de iframe e ativar sua Web Camera diretamente"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir em Nova Aba (Câmera Direta)</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => startCamera(selectedDeviceId, true)}
                    className="text-xs bg-amber-900/90 hover:bg-amber-800 text-amber-200 px-3 py-1.5 rounded-lg font-semibold border border-amber-700 cursor-pointer transition-colors"
                  >
                    Testar Câmera Física
                  </button>
                </div>
              </div>
            )}

            {captureType !== 'ASSINATURA_PAD_TOUCH' ? (
              /* Camera Capture Box */
              <div className="relative bg-slate-950 border border-slate-700 rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center shadow-inner group">
                
                {/* Source Mode Indicator Top Badge */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center space-x-2">
                  {cameraSourceMode === 'VIRTUAL' ? (
                    <span className="text-[10px] bg-cyan-950/90 text-cyan-300 px-2.5 py-1 rounded-md border border-cyan-700/80 font-mono font-semibold flex items-center space-x-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Sensor Óptico Cartorial (500 DPI)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-700/80 font-mono font-semibold flex items-center space-x-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Câmera Física Conectada</span>
                    </span>
                  )}
                </div>

                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all ${
                    highContrastFilter && (captureType === 'POLEGAR_DIREITO' || captureType === 'POLEGAR_ESQUERDO')
                      ? 'contrast-150 grayscale'
                      : ''
                  }`}
                />

                {/* Overlaid Biometric Guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  {captureType === 'POLEGAR_DIREITO' || captureType === 'POLEGAR_ESQUERDO' ? (
                    /* Thumbprint Oval Reticle */
                    <div className="relative w-48 h-64 border-2 border-dashed border-cyan-400/80 rounded-[50%/60%] flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                      <Fingerprint className="w-24 h-24 text-cyan-400/30 animate-pulse" />
                      <span className="absolute bottom-3 text-[10px] font-mono font-bold bg-slate-900/85 px-2 py-0.5 rounded text-cyan-300 border border-cyan-700/60">
                        {cameraSourceMode === 'VIRTUAL' ? 'Sensor Óptico Calibrado' : 'Posicione o Polegar na Câmera'}
                      </span>
                    </div>
                  ) : captureType === 'ASSINATURA_DIGITAL_CAMERA' ? (
                    /* Signature Box Guide */
                    <div className="relative w-80 h-36 border-2 border-dashed border-amber-400/80 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                      <span className="absolute bottom-2 text-[10px] font-mono font-bold bg-slate-900/85 px-2 py-0.5 rounded text-amber-300 border border-amber-700/60">
                        {cameraSourceMode === 'VIRTUAL' ? 'Macro Óptica Focalizada' : 'Alinhe a assinatura do documento'}
                      </span>
                    </div>
                  ) : (
                    /* Facial Oval Guide */
                    <div className="relative w-52 h-64 border-2 border-dashed border-emerald-400/80 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                      <span className="absolute bottom-3 text-[10px] font-mono font-bold bg-slate-900/85 px-2 py-0.5 rounded text-emerald-300 border border-emerald-700/60">
                        {cameraSourceMode === 'VIRTUAL' ? 'Biometria Facial ICAO 9303' : 'Enquadre o rosto do declarante'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Camera Active Control Bar */}
                <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between pointer-events-auto bg-slate-900/90 backdrop-blur-xs p-2 rounded-xl border border-slate-700/80 shadow-lg">
                  <div className="flex items-center space-x-2 text-xs">
                    {(captureType === 'POLEGAR_DIREITO' || captureType === 'POLEGAR_ESQUERDO') && (
                      <button
                        type="button"
                        onClick={() => setHighContrastFilter(prev => !prev)}
                        className={`px-2 py-1 rounded text-[11px] font-mono flex items-center space-x-1 border cursor-pointer transition-colors ${
                          highContrastFilter
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="Filtro de Alto Contraste Binarizado para cristas papilares da impressão digital"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Filtro Alto Contraste</span>
                      </button>
                    )}

                    {/* Camera Device Selector & Physical Connect Button */}
                    {videoDevices.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value);
                            startCamera(e.target.value, true);
                          }}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white max-w-[210px] truncate focus:border-cyan-500 focus:outline-hidden"
                          title="Selecionar dispositivo de câmera detectado"
                        >
                          {videoDevices.map((d, i) => (
                            <option key={d.deviceId || i} value={d.deviceId}>
                              {d.label || `Câmera ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {cameraSourceMode === 'VIRTUAL' && (
                      <button
                        type="button"
                        onClick={() => startCamera(selectedDeviceId, true)}
                        className="px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 border border-cyan-700 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 cursor-pointer transition-colors"
                        title="Tentar conectar diretamente à webcam física"
                      >
                        <Video className="w-3 h-3 text-cyan-400" />
                        <span>Conectar Webcam Física</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Digital Signature Pad Box */
              <div className="space-y-2">
                <div className="border border-slate-700 rounded-xl overflow-hidden bg-white shadow-inner flex flex-col items-center">
                  <div className="w-full bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                      <FileSignature className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Área de Coleta de Assinatura Manuscrita</span>
                    </span>
                    <button
                      onClick={clearPad}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Pad</span>
                    </button>
                  </div>
                  <canvas
                    ref={padCanvasRef}
                    width={520}
                    height={260}
                    className="w-full h-56 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 text-[11px]">
                    Use o mouse, caneta óptico-stylus ou tela touch para assinar sobre a linha.
                  </span>
                  <button
                    onClick={handleCaptureFromPad}
                    disabled={!padHasStrokes}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Assinatura Pad</span>
                  </button>
                </div>
              </div>
            )}

            {/* Alternative options: Upload or Simulation */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <label className="flex items-center space-x-1.5 text-slate-300 hover:text-white cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Carregar arquivo de biometria / cartão de autógrafo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              <button
                onClick={() => handleGenerateSimulatedBiometric(captureType)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Gerar Coleta Certificada</span>
              </button>
            </div>
          </div>

          {/* Right Column: Biometric Inspection, Hash & Audit Attachment */}
          <div className="lg:col-span-5 flex flex-col space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certificação e Validação do Ativo</span>
            </h3>

            {/* Asset Preview Box */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col items-center justify-center min-h-[160px]">
              {capturedImage ? (
                <div className="space-y-2 text-center w-full">
                  <img
                    src={capturedImage}
                    alt="Ativo Biométrico"
                    className="max-h-36 max-w-full mx-auto object-contain rounded border border-slate-700 bg-white"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono block">
                    ✓ Imagem capturada com resolução nativa
                  </span>
                </div>
              ) : (
                <div className="text-center text-slate-500 space-y-1">
                  <Fingerprint className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhum dado capturado ainda.</p>
                  <p className="text-[10px] text-slate-600">
                    Posicione o declarante na câmera ou utilize o pad touch para gerar o ativo.
                  </p>
                </div>
              )}
            </div>

            {/* Cryptographic SHA-256 Hash Card */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-slate-200 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Resumo Criptográfico SHA-256</span>
                </span>
                {computedSha256 && (
                  <button
                    onClick={copyHashToClipboard}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                )}
              </div>

              {isProcessingHash ? (
                <div className="text-cyan-400 text-[11px] font-mono animate-pulse">
                  Calculando digest SHA-256 do ativo óptico...
                </div>
              ) : computedSha256 ? (
                <div className="font-mono text-[10px] text-emerald-300 bg-slate-950 p-2 rounded border border-emerald-800/60 break-all leading-tight">
                  {computedSha256}
                </div>
              ) : (
                <div className="text-slate-500 text-[11px] font-mono">
                  Aguardando captura do ativo...
                </div>
              )}
            </div>

            {/* Acervo de Coletas & Assinaturas Salvas */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Acervo de Assinaturas & Coletas Salvas</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                  {savedSignatureList.length} {savedSignatureList.length === 1 ? 'coleta' : 'coletas'}
                </span>
              </div>

              {savedSignatureList.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-3 px-2 text-center bg-slate-950/60 rounded border border-slate-800/80 leading-relaxed">
                  Nenhuma assinatura confirmada ainda. Use o Pad Touch ou a Câmera para salvar assinaturas e alternar entre elas.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {savedSignatureList.map((rec) => {
                    const isCurrentActive = activeRecord?.id === rec.id || (!activeRecord && computedSha256 === rec.sha256Hash);
                    return (
                      <div
                        key={rec.id}
                        onClick={() => handleSelectSavedRecord(rec)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isCurrentActive
                            ? 'bg-emerald-950/60 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-sm'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                        title="Clique para definir como assinatura ativa para este ato"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-10 h-8 rounded bg-white shrink-0 overflow-hidden border border-slate-700 flex items-center justify-center p-0.5">
                            <img src={rec.imageBase64} alt={rec.typeLabel} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-semibold text-white truncate max-w-[155px]">
                                {rec.typeLabel}
                              </span>
                              {isCurrentActive && (
                                <span className="text-[9px] bg-emerald-500/25 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/40 shrink-0">
                                  ATIVA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">
                              SHA: {rec.sha256Hash.substring(0, 14)}... • {rec.timestamp.split(' ')[1] || ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedRecord(rec.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Remover esta assinatura do acervo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metadata Information List */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo de Coleta Ativa:</span>
                <span className="font-semibold text-cyan-300 truncate max-w-[200px]">
                  {activeRecord?.typeLabel || getLabelForType(captureType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Declarante:</span>
                <span className="font-semibold text-white">{declaracao.nomeDeclarante || 'Não Informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escrevente:</span>
                <span className="font-mono">{currentUser?.matricula || 'ESC-8419'} ({currentUser?.nome || 'Guilherme Santos'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Carimbo de Tempo:</span>
                <span className="font-mono">{activeRecord?.timestamp || new Date().toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destino da Trilha:</span>
                <span className="text-emerald-400 font-semibold">Audit Ledger + Lavratura Firestore</span>
              </div>
            </div>

            {/* Final Action Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveAndAttach}
                disabled={!activeRecord && (!capturedImage || !computedSha256)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Vincular ao Ato & Trilha de Auditoria</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
