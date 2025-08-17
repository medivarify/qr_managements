import jsQR from 'jsqr';

/**
 * QR Code Scanner utility with camera integration and real QR detection
 */
export class QRScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private scanning: boolean = false;
  private onScanCallback: ((data: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private animationFrame: number | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  /**
   * Initialize camera and start scanning
   */
  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (data: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    this.video = videoElement;
    this.onScanCallback = onScan;
    this.onErrorCallback = onError;

    try {
      // Request camera access with better constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('muted', 'true');
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        this.video!.onloadedmetadata = () => {
          this.video!.play()
            .then(() => resolve())
            .catch(reject);
        };
        this.video!.onerror = () => reject(new Error('Video loading failed'));
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000);
      });

      this.scanning = true;
      this.scanLoop();

    } catch (error) {
      let errorMessage = 'Camera access failed';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not meet the required specifications.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.onErrorCallback?.(errorMessage);
    }
  }

  /**
   * Stop scanning and release camera
   */
  stopScanning(): void {
    this.scanning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video.pause();
    }
  }

  /**
   * Continuous scanning loop with real QR detection
   */
  private scanLoop(): void {
    if (!this.scanning || !this.video || !this.canvas || !this.context) {
      return;
    }

    // Only scan if video is playing and has dimensions
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA && 
        this.video.videoWidth > 0 && this.video.videoHeight > 0) {
      
      // Set canvas size to match video
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;

      // Draw current video frame to canvas
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      // Get image data for QR code detection
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      try {
        // Use jsQR library for actual QR code detection
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (qrResult && qrResult.data) {
          console.log('QR Code detected:', qrResult.data);
          this.onScanCallback?.(qrResult.data);
          return; // Stop scanning after successful detection
        }
      } catch (error) {
        console.warn('QR detection error:', error);
        // Continue scanning on detection errors
      }
    }

    // Continue scanning
    this.animationFrame = requestAnimationFrame(() => this.scanLoop());
  }

  /**
   * Take a snapshot of the current video frame
   */
  takeSnapshot(): string | null {
    if (!this.video || !this.canvas || !this.context) {
      return null;
    }

    if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
      return null;
    }

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.context.drawImage(this.video, 0, 0);
    
    return this.canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Check camera permissions
   */
  static async checkCameraPermissions(): Promise<boolean> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Try to check permissions API
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permission.state === 'granted') {
            return true;
          } else if (permission.state === 'denied') {
            return false;
          }
          // If 'prompt', we'll try to access camera below
        } catch (e) {
          // Permissions API might not support camera, continue with fallback
        }
      }

      // Fallback: try to access camera briefly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1, height: 1 } 
        });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Get available cameras
   */
  static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting available cameras:', error);
      return [];
    }
  }
}