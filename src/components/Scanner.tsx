import React, { useRef, useEffect, useState } from 'react';
import { Camera, Square, Zap, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { QRScanner } from '../utils/qrScanner';
import { QRCodeParser } from '../utils/qrParser';
import { QRCodeData } from '../types';

interface ScannerProps {
  onScan: (data: QRCodeData) => void;
  onError: (error: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QRScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [lastScannedData, setLastScannedData] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    checkCameraPermission();
    getAvailableCameras();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraPermission = async () => {
    const permission = await QRScanner.checkCameraPermissions();
    setHasPermission(permission);
  };

  const getAvailableCameras = async () => {
    const cameras = await QRScanner.getAvailableCameras();
    setAvailableCameras(cameras);
    if (cameras.length > 0 && !selectedCamera) {
      // Prefer back camera if available
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      setSelectedCamera(backCamera?.deviceId || cameras[0].deviceId);
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QRScanner();
      setScanStatus('scanning');
      setIsScanning(true);
      setLastScannedData('');

      await scannerRef.current.startScanning(
        videoRef.current,
        handleScanSuccess,
        handleScanError
      );
    } catch (error) {
      handleScanError(error instanceof Error ? error.message : 'Failed to start scanner');
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanStatus('idle');
  };

  const handleScanSuccess = (rawData: string) => {
    // Prevent duplicate scans of the same data
    if (rawData === lastScannedData) {
      return;
    }
    
    setLastScannedData(rawData);
    console.log('Raw QR data scanned:', rawData);
    
    try {
      const parsedQR = QRCodeParser.parseQRCode(rawData);
      console.log('Parsed QR data:', parsedQR);
      
      const qrData: QRCodeData = {
        id: crypto.randomUUID(),
        arduino_sync_status: 'not_synced' as const,
        ...parsedQR
      } as QRCodeData;
      
      console.log('Final QR data object:', qrData);

      setScanStatus('success');
      onScan(qrData);
      
      // Auto-stop scanning after success
      setTimeout(() => {
        stopScanning();
      }, 2000);

    } catch (error) {
      console.error('Error processing QR code:', error);
      handleScanError('Failed to process QR code data');
    }
  };

  const handleScanError = (error: string) => {
    setScanStatus('error');
    onError(error);
    setTimeout(() => {
      if (isScanning) {
        setScanStatus('scanning');
      }
    }, 3000);
  };

  const takeSnapshot = () => {
    if (scannerRef.current) {
      const snapshot = scannerRef.current.takeSnapshot();
      if (snapshot) {
        // Create download link for snapshot
        const link = document.createElement('a');
        link.href = snapshot;
        link.download = `qr-scan-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    const currentIndex = availableCameras.findIndex(camera => camera.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCamera(availableCameras[nextIndex].deviceId);
    
    if (isScanning) {
      stopScanning();
      setTimeout(() => {
        startScanning();
      }, 500);
    }
  };

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mb-4" />
        <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2 text-center">Camera Access Required</h3>
        <p className="text-sm sm:text-base text-red-700 text-center mb-4">
          Please allow camera access to scan QR codes. Check your browser settings and reload the page.
        </p>
        <button
          onClick={checkCameraPermission}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
        >
          Check Permission
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg"
          autoPlay
          playsInline
          muted
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <Square 
              className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 text-white transition-all duration-300 ${
                scanStatus === 'scanning' ? 'animate-pulse opacity-80' : 'opacity-60'
              }`} 
              strokeWidth={2}
            />
            
            {/* Corner indicators */}
            <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 border-l-2 border-t-2 sm:border-l-4 sm:border-t-4 border-white"></div>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 border-r-2 border-t-2 sm:border-r-4 sm:border-t-4 border-white"></div>
            <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 border-l-2 border-b-2 sm:border-l-4 sm:border-b-4 border-white"></div>
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 border-r-2 border-b-2 sm:border-r-4 sm:border-b-4 border-white"></div>
            
            {/* Status indicator */}
            <div className="absolute -bottom-8 sm:-bottom-12 left-1/2 transform -translate-x-1/2">
              {scanStatus === 'scanning' && (
                <div className="flex items-center space-x-2 text-white text-sm sm:text-base">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Scanning...</span>
                </div>
              )}
              {scanStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-400 text-sm sm:text-base">
                  <CheckCircle className="w-4 h-4" />
                  <span>QR Code Detected!</span>
                </div>
              )}
              {scanStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-400 text-sm sm:text-base">
                  <AlertCircle className="w-4 h-4" />
                  <span>Scan Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4">
        <button
          onClick={isScanning ? stopScanning : startScanning}
          disabled={hasPermission === null}
          className={`flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium transition-colors text-sm sm:text-base ${
            isScanning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Camera className="w-4 h-4" />
          <span>{isScanning ? 'Stop Scanning' : 'Start Scanning'}</span>
        </button>

        {isScanning && (
          <>
            <button
              onClick={takeSnapshot}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors text-sm sm:text-base"
            >
              <Zap className="w-4 h-4" />
              <span>Snapshot</span>
            </button>
            
            {availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Switch Camera</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-xs sm:text-sm text-blue-800">
          <p className="text-center font-medium mb-2">How to scan QR codes:</p>
          <ul className="space-y-1 text-left">
            <li>• Position the QR code within the square frame</li>
            <li>• Hold your device steady and ensure good lighting</li>
            <li>• The scanner will automatically detect and process the code</li>
            <li>• Make sure the QR code is clearly visible and not blurry</li>
          </ul>
        </div>
      </div>
      
      {/* Camera info */}
      {availableCameras.length > 0 && (
        <div className="mt-2 text-xs sm:text-sm text-gray-500 text-center">
          Using: {availableCameras.find(c => c.deviceId === selectedCamera)?.label || 'Default camera'}
          {availableCameras.length > 1 && ` (${availableCameras.length} cameras available)`}
        </div>
      )}
    </div>
  );
};