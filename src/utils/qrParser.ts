import { QRCodeData, QRDataType, ValidationStatus, MultidimensionalData } from '../types';

export class QRCodeParser {
  /**
   * Parse raw QR code data and extract structured information
   */
  static parseQRCode(rawData: string): Partial<QRCodeData> {
    try {
      const dataType = this.detectDataType(rawData);
      const parsedData = this.extractStructuredData(rawData, dataType);
      const dimensions = this.calculateDimensions(parsedData);
      
      return {
        raw_data: rawData,
        parsed_data: parsedData,
        data_type: dataType,
        dimensions,
        validation_status: this.validateData(parsedData, dataType),
        scan_timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        raw_data: rawData,
        parsed_data: { error: 'Failed to parse QR code' },
        data_type: QRDataType.CUSTOM,
        dimensions: 1,
        validation_status: ValidationStatus.CORRUPTED,
        scan_timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detect the type of data contained in the QR code
   */
  private static detectDataType(data: string): QRDataType {
    // Try to parse as JSON first to check for supply chain products
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        // Check for medicine tracking structure
        if (parsed.type === 'medicine_tracking' && parsed.data) {
          return QRDataType.MEDICINE_TRACKING;
        }
        
        // Check for multidimensional structure
        if (parsed.layers && Array.isArray(parsed.layers)) {
          return QRDataType.MULTIDIMENSIONAL;
        }
        return QRDataType.JSON;
      }
    } catch (e) {
      // Not JSON, continue with other checks
    }

    // URL detection
    if (/^https?:\/\//i.test(data)) {
      return QRDataType.URL;
    }

    // Email detection
    if (/^mailto:/i.test(data) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      return QRDataType.EMAIL;
    }

    // Phone detection
    if (/^tel:/i.test(data) || /^\+?[\d\s\-\(\)]+$/.test(data)) {
      return QRDataType.PHONE;
    }

    // SMS detection
    if (/^sms:/i.test(data)) {
      return QRDataType.SMS;
    }

    // WiFi detection
    if (/^WIFI:/i.test(data)) {
      return QRDataType.WIFI;
    }

    // vCard detection
    if (/^BEGIN:VCARD/i.test(data)) {
      return QRDataType.VCARD;
    }

    // Event detection
    if (/^BEGIN:VEVENT/i.test(data)) {
      return QRDataType.EVENT;
    }

    // Geo location detection
    if (/^geo:/i.test(data)) {
      return QRDataType.GEO;
    }

    // XML detection
    if (/<\?xml|<\w+.*?>/.test(data)) {
      return QRDataType.XML;
    }

    // Default to text
    return QRDataType.TEXT;
  }

  /**
   * Extract structured data based on detected type
   */
  private static extractStructuredData(data: string, type: QRDataType): Record<string, any> {
    switch (type) {
      case QRDataType.URL:
        return this.parseURL(data);
      case QRDataType.EMAIL:
        return this.parseEmail(data);
      case QRDataType.PHONE:
        return this.parsePhone(data);
      case QRDataType.WIFI:
        return this.parseWiFi(data);
      case QRDataType.VCARD:
        return this.parseVCard(data);
      case QRDataType.GEO:
        return this.parseGeo(data);
      case QRDataType.JSON:
        return JSON.parse(data);
      case QRDataType.MULTIDIMENSIONAL:
        return this.parseMultidimensional(data);
      case QRDataType.MEDICINE_TRACKING:
        return this.parseMedicineTracking(data);
      case QRDataType.CUSTOM:
        try {
          return JSON.parse(data);
        } catch (e) {
          return { text: data };
        }
      default:
        return { text: data };
    }
  }

  private static parseURL(data: string): Record<string, any> {
    try {
      const url = new URL(data);
      return {
        url: data,
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        params: Object.fromEntries(url.searchParams)
      };
    } catch (e) {
      return { url: data, error: 'Invalid URL format' };
    }
  }

  private static parseEmail(data: string): Record<string, any> {
    if (data.startsWith('mailto:')) {
      const mailto = data.substring(7);
      const [email, params] = mailto.split('?');
      const paramObj: Record<string, string> = {};
      
      if (params) {
        params.split('&').forEach(param => {
          const [key, value] = param.split('=');
          paramObj[key] = decodeURIComponent(value || '');
        });
      }

      return {
        email,
        subject: paramObj.subject || '',
        body: paramObj.body || '',
        cc: paramObj.cc || '',
        bcc: paramObj.bcc || ''
      };
    }
    return { email: data };
  }

  private static parsePhone(data: string): Record<string, any> {
    const phone = data.replace(/^tel:/, '').replace(/[^\d\+]/g, '');
    return {
      phone,
      formatted: data,
      country_code: phone.startsWith('+') ? phone.substring(1, 3) : null
    };
  }

  private static parseWiFi(data: string): Record<string, any> {
    const wifiRegex = /WIFI:T:(.*?);S:(.*?);P:(.*?);H:(.*?);/i;
    const match = data.match(wifiRegex);
    
    if (match) {
      return {
        security: match[1],
        ssid: match[2],
        password: match[3],
        hidden: match[4] === 'true'
      };
    }
    return { raw: data, error: 'Invalid WiFi format' };
  }

  private static parseVCard(data: string): Record<string, any> {
    const lines = data.split('\n');
    const vcard: Record<string, any> = {};

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).toLowerCase();
        const value = line.substring(colonIndex + 1);
        vcard[key] = value;
      }
    });

    return vcard;
  }

  private static parseGeo(data: string): Record<string, any> {
    const geoRegex = /geo:([-\d.]+),([-\d.]+)(?:,([-\d.]+))?(?:\?(.*))?/i;
    const match = data.match(geoRegex);
    
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
        altitude: match[3] ? parseFloat(match[3]) : null,
        query: match[4] || null
      };
    }
    return { raw: data, error: 'Invalid geo format' };
  }

  private static parseMultidimensional(data: string): Record<string, any> {
    try {
      const parsed = JSON.parse(data);
      const result: Record<string, any> = {
        total_layers: 0,
        layers: [] as MultidimensionalData[],
        metadata: parsed.metadata || {}
      };

      if (parsed.layers && Array.isArray(parsed.layers)) {
        result.total_layers = parsed.layers.length;
        result.layers = parsed.layers.map((layer: any, index: number) => ({
          layer: index,
          data: layer.data || layer,
          checksum: layer.checksum,
          dependencies: layer.dependencies || []
        }));
      }

      return result;
    } catch (e) {
      return { error: 'Failed to parse multidimensional data' };
    }
  }

  /**
   * Parse medicine tracking QR codes
   */
  private static parseMedicineTracking(data: string): Record<string, any> {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'medicine_tracking' && parsed.data) {
        return {
          medicine_type: 'medicine_tracking',
          scan_timestamp: new Date().toISOString(),
          generated_timestamp: parsed.timestamp,
          medicine_id: parsed.data.medicine_id,
          medicine_name: parsed.data.medicine_name,
          batch_number: parsed.data.batch_number,
          manufacturing_date: parsed.data.manufacturing_date,
          expiry_date: parsed.data.expiry_date,
          manufacturer: parsed.data.manufacturer,
          dosage_form: parsed.data.dosage_form,
          strength: parsed.data.strength,
          active_ingredient: parsed.data.active_ingredient,
          ndc_number: parsed.data.ndc_number,
          lot_number: parsed.data.lot_number,
          storage_conditions: parsed.data.storage_conditions,
          prescription_required: parsed.data.prescription_required,
          tracking_id: parsed.data.tracking_id,
          verification_code: parsed.data.verification_code,
          medicine_data: parsed.data,
          raw_medicine_data: parsed,
          // Calculate expiry status
          is_expired: new Date(parsed.data.expiry_date) < new Date(),
          days_until_expiry: Math.ceil((new Date(parsed.data.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        };
      }
      
      // Fallback to generic JSON parsing
      return parsed;
    } catch (e) {
      return { error: 'Failed to parse medicine tracking data', raw: data };
    }
  }

  /**
   * Calculate the dimensionality of the parsed data
   */
  private static calculateDimensions(data: Record<string, any>): number {
    if (data.layers && Array.isArray(data.layers)) {
      return data.layers.length;
    }
    
    let maxDepth = 1;
    const calculateDepth = (obj: any, depth: number = 1): number => {
      if (typeof obj !== 'object' || obj === null) return depth;
      
      let max = depth;
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          max = Math.max(max, calculateDepth(value, depth + 1));
        }
      }
      return max;
    };

    return calculateDepth(data);
  }

  /**
   * Validate the parsed data integrity
   */
  private static validateData(data: Record<string, any>, type: QRDataType): ValidationStatus {
    if (data.error) {
      return ValidationStatus.CORRUPTED;
    }

    switch (type) {
      case QRDataType.URL:
        return data.url && !data.error ? ValidationStatus.VALID : ValidationStatus.INVALID;
      case QRDataType.EMAIL:
        return data.email ? ValidationStatus.VALID : ValidationStatus.INVALID;
      case QRDataType.MULTIDIMENSIONAL:
        return data.layers && data.layers.length > 0 ? ValidationStatus.VALID : ValidationStatus.INCOMPLETE;
      case QRDataType.MEDICINE_TRACKING:
        // For medicine tracking, validate essential fields
        return (data.medicine_id && data.medicine_name && data.batch_number) 
          ? ValidationStatus.VALID 
          : ValidationStatus.INCOMPLETE;
      case QRDataType.CUSTOM:
        return ValidationStatus.VALID;
      default:
        return ValidationStatus.VALID;
    }
  }
}