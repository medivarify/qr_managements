import React, { useRef, useEffect, useState } from 'react';
import { Camera, Square, Zap, AlertCircle, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    checkCameraPermission();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraPermission = async () => {
    const permission = await QRScanner.checkCameraPermissions();
    setHasPermission(permission);
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QRScanner();
      setScanStatus('scanning');
      setIsScanning(true);

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
    try {
      const parsedQR = QRCodeParser.parseQRCode(rawData);
      const qrData: QRCodeData = {
        id: crypto.randomUUID(),
        arduino_sync_status: 'not_synced' as const,
        ...parsedQR
      } as QRCodeData;

      setScanStatus('success');
      onScan(qrData);
      
      // Auto-stop scanning after success
      setTimeout(() => {
        stopScanning();
      }, 2000);

    } catch (error) {
      handleScanError('Failed to process QR code data');
    }
  };

  const handleScanError = (error: string) => {
    setScanStatus('error');
    onError(error);
    setTimeout(() => {
      setScanStatus('scanning');
    }, 3000);
  };

  const takeSnapshot = () => {
    if (scannerRef.current) {
      const snapshot = scannerRef.current.takeSnapshot();
      if (snapshot) {
        // Handle snapshot - could save or process further
        console.log('Snapshot taken:', snapshot.substring(0, 50) + '...');
      }
    }
  };

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Camera Access Required</h3>
        <p className="text-red-700 text-center mb-4">
          Please allow camera access to scan QR codes. Check your browser settings and reload the page.
        </p>
        <button
          onClick={checkCameraPermission}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
          className="w-full h-64 md:h-96 object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <Square 
              className={`w-48 h-48 text-white transition-all duration-300 ${
                scanStatus === 'scanning' ? 'animate-pulse' : ''
              }`} 
              strokeWidth={2}
            />
            
            {/* Status indicator */}
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {scanStatus === 'scanning' && (
                <div className="flex items-center space-x-2 text-white">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Scanning...</span>
                </div>
              )}
              {scanStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>QR Code Detected!</span>
                </div>
              )}
              {scanStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Scan Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 mt-4">
        <button
          onClick={isScanning ? stopScanning : startScanning}
          disabled={hasPermission === null}
          className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors ${
            isScanning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Camera className="w-4 h-4" />
          <span>{isScanning ? 'Stop Scanning' : 'Start Scanning'}</span>
        </button>

        {isScanning && (
          <button
            onClick={takeSnapshot}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Snapshot</span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 text-center">
          Position the QR code within the square frame. The scanner will automatically detect and process the code.
        </p>
      </div>
    </div>
  );
};