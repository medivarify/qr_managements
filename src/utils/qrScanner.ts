/**
 * QR Code Scanner utility with camera integration and error handling
 */
export class QRScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private scanning: boolean = false;
  private onScanCallback: ((data: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

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
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', 'true');
      
      await new Promise<void>((resolve) => {
        this.video!.onloadedmetadata = () => {
          this.video!.play();
          resolve();
        };
      });

      this.scanning = true;
      this.scanLoop();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera access failed';
      this.onErrorCallback?.(errorMessage);
    }
  }

  /**
   * Stop scanning and release camera
   */
  stopScanning(): void {
    this.scanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /**
   * Continuous scanning loop
   */
  private scanLoop(): void {
    if (!this.scanning || !this.video || !this.canvas || !this.context) {
      return;
    }

    // Set canvas size to match video
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    // Draw current video frame to canvas
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Get image data for QR code detection
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    try {
      const qrResult = this.detectQRCode(imageData);
      if (qrResult) {
        this.onScanCallback?.(qrResult);
        return; // Stop scanning after successful detection
      }
    } catch (error) {
      // Continue scanning on detection errors
    }

    // Continue scanning
    requestAnimationFrame(() => this.scanLoop());
  }

  /**
   * Detect QR code in image data
   * This is a simplified implementation - in production, use a library like jsQR
   */
  private detectQRCode(imageData: ImageData): string | null {
    // In a real implementation, you would use a QR code detection library
    // For this demo, we'll use a mock implementation
    
    // Mock QR code detection - replace with actual QR detection library
    if (Math.random() > 0.95) { // Simulate occasional detection
      return JSON.stringify({
        type: 'demo',
        timestamp: new Date().toISOString(),
        data: 'Sample QR code data'
      });
    }
    
    return null;
  }

  /**
   * Take a snapshot of the current video frame
   */
  takeSnapshot(): string | null {
    if (!this.video || !this.canvas || !this.context) {
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
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return permissions.state === 'granted';
    } catch (error) {
      // Fallback: try to access camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    }
  }
}