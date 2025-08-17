import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Package, Download, RefreshCw, Copy, Check } from 'lucide-react';

interface MedicineData {
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  manufacturer: string;
  dosage_form: string;
  strength: string;
  active_ingredient: string;
  ndc_number: string;
  lot_number: string;
  storage_conditions: string;
  prescription_required: boolean;
}

export const ProductQRGenerator: React.FC = () => {
  const [medicineData, setMedicineData] = useState<MedicineData>({
    medicine_id: '',
    medicine_name: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    manufacturer: '',
    dosage_form: '',
    strength: '',
    active_ingredient: '',
    ndc_number: '',
    lot_number: '',
    storage_conditions: '',
    prescription_required: false
  });

  const [qrSize, setQrSize] = useState(256);
  const [copied, setCopied] = useState(false);

  const generateQRData = (): string => {
    const qrData = {
      type: 'medicine_tracking',
      timestamp: new Date().toISOString(),
      data: {
        ...medicineData,
        tracking_id: `${medicineData.medicine_id}-${Date.now()}`,
        verification_code: Math.random().toString(36).substr(2, 8).toUpperCase()
      }
    };
    return JSON.stringify(qrData);
  };

  const handleInputChange = (field: keyof MedicineData, value: string | boolean) => {
    setMedicineData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('medicine-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = qrSize;
    canvas.height = qrSize;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, qrSize, qrSize);
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `${medicineData.medicine_id || 'medicine'}-qr-code.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(generateQRData());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  const generateRandomMedicine = () => {
    const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
    const manufacturers = ['Pfizer Inc', 'Johnson & Johnson', 'Novartis AG', 'Roche Holding', 'Merck & Co'];
    const medicines = ['Amoxicillin', 'Ibuprofen', 'Metformin', 'Lisinopril', 'Atorvastatin'];
    const strengths = ['250mg', '500mg', '10mg', '20mg', '100mg'];
    
    const randomDosageForm = dosageForms[Math.floor(Math.random() * dosageForms.length)];
    const randomManufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const randomMedicine = medicines[Math.floor(Math.random() * medicines.length)];
    const randomStrength = strengths[Math.floor(Math.random() * strengths.length)];
    const medicineId = `MED-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const batchNumber = `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const lotNumber = `LOT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const ndcNumber = `${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
    
    const today = new Date();
    const manufacturingDate = today.toISOString().split('T')[0];
    const expiryDate = new Date(today.getTime() + (730 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 2 years

    setMedicineData({
      medicine_id: medicineId,
      medicine_name: randomMedicine,
      batch_number: batchNumber,
      manufacturing_date: manufacturingDate,
      expiry_date: expiryDate,
      manufacturer: randomManufacturer,
      dosage_form: randomDosageForm,
      strength: randomStrength,
      active_ingredient: randomMedicine,
      ndc_number: ndcNumber,
      lot_number: lotNumber,
      storage_conditions: 'Store at room temperature (20-25°C)',
      prescription_required: Math.random() > 0.5
    });
  };

  const isFormValid = medicineData.medicine_id && medicineData.medicine_name && medicineData.batch_number;

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Medicine QR Code Generator</h2>
              <p className="text-xs sm:text-sm text-gray-600">Generate QR codes for medicine tracking and verification</p>
            </div>
          </div>
          <button
            onClick={generateRandomMedicine}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors text-sm sm:text-base"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Generate Sample</span>
            <span className="sm:hidden">Sample</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Medicine Information Form */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Medicine Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medicine ID *
                </label>
                <input
                  type="text"
                  value={medicineData.medicine_id}
                  onChange={(e) => handleInputChange('medicine_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., MED-ABC123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={medicineData.medicine_name}
                  onChange={(e) => handleInputChange('medicine_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Amoxicillin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={medicineData.batch_number}
                  onChange={(e) => handleInputChange('batch_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BATCH-2024001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage Form
                </label>
                <select
                  value={medicineData.dosage_form}
                  onChange={(e) => handleInputChange('dosage_form', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Dosage Form</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Cream">Cream</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Patch">Patch</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strength
                </label>
                <input
                  type="text"
                  value={medicineData.strength}
                  onChange={(e) => handleInputChange('strength', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500mg, 10ml"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Ingredient
                </label>
                <input
                  type="text"
                  value={medicineData.active_ingredient}
                  onChange={(e) => handleInputChange('active_ingredient', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Amoxicillin trihydrate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NDC Number
                </label>
                <input
                  type="text"
                  value={medicineData.ndc_number}
                  onChange={(e) => handleInputChange('ndc_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 12345-678-90"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  value={medicineData.lot_number}
                  onChange={(e) => handleInputChange('lot_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., LOT-ABC123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={medicineData.manufacturing_date}
                  onChange={(e) => handleInputChange('manufacturing_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={medicineData.expiry_date}
                  onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={medicineData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Pfizer Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Conditions
              </label>
              <input
                type="text"
                value={medicineData.storage_conditions}
                onChange={(e) => handleInputChange('storage_conditions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Store at room temperature (20-25°C)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="prescription_required"
                checked={medicineData.prescription_required}
                onChange={(e) => handleInputChange('prescription_required', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="prescription_required" className="ml-2 block text-sm text-gray-700">
                Prescription Required
              </label>
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">QR Code Preview</h3>
            
            <div className="flex items-center justify-center p-4 sm:p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              {isFormValid ? (
                <div className="text-center">
                  <QRCodeSVG
                    id="medicine-qr-code"
                    value={generateQRData()}
                    size={qrSize}
                    level="M"
                    includeMargin={true}
                    className="mx-auto mb-4"
                  />
                  <p className="text-xs sm:text-sm text-gray-600">
                    QR Code for {medicineData.medicine_name}
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500 px-4">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Fill in required fields to generate QR code</p>
                  <p className="text-xs sm:text-sm mt-1">Medicine ID, Name, and Batch Number are required</p>
                </div>
              )}
            </div>

            {isFormValid && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Code Size: {qrSize}px
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="512"
                    step="32"
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR Code</span>
                  </button>
                  
                  <button
                    onClick={copyQRData}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Data'}</span>
                  </button>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>Next Steps:</strong><br/>
                    1. Download and print the QR code<br/>
                    2. Attach it to your medicine package<br/>
                    3. Use the scanner to track and verify the medicine<br/>
                    4. Data will sync to Arduino Cloud automatically
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};