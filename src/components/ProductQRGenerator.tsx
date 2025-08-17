import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Package, Download, RefreshCw, Copy, Check } from 'lucide-react';

interface ProductData {
  product_id: string;
  product_name: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  manufacturer: string;
  category: string;
  description: string;
}

export const ProductQRGenerator: React.FC = () => {
  const [productData, setProductData] = useState<ProductData>({
    product_id: '',
    product_name: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    manufacturer: '',
    category: '',
    description: ''
  });

  const [qrSize, setQrSize] = useState(256);
  const [copied, setCopied] = useState(false);

  const generateQRData = (): string => {
    const qrData = {
      type: 'supply_chain_product',
      timestamp: new Date().toISOString(),
      data: {
        ...productData,
        tracking_id: `${productData.product_id}-${Date.now()}`
      }
    };
    return JSON.stringify(qrData);
  };

  const handleInputChange = (field: keyof ProductData, value: string) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('product-qr-code');
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
        link.download = `${productData.product_id || 'product'}-qr-code.png`;
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

  const generateRandomProduct = () => {
    const categories = ['Electronics', 'Food', 'Pharmaceutical', 'Automotive', 'Textile'];
    const manufacturers = ['TechCorp', 'FoodCo', 'PharmaInc', 'AutoParts Ltd', 'TextilePro'];
    
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomManufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const productId = `PRD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const batchNumber = `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const today = new Date();
    const manufacturingDate = today.toISOString().split('T')[0];
    const expiryDate = new Date(today.getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    setProductData({
      product_id: productId,
      product_name: `Sample ${randomCategory} Product`,
      batch_number: batchNumber,
      manufacturing_date: manufacturingDate,
      expiry_date: expiryDate,
      manufacturer: randomManufacturer,
      category: randomCategory,
      description: `High-quality ${randomCategory.toLowerCase()} product for supply chain tracking demo`
    });
  };

  const isFormValid = productData.product_id && productData.product_name && productData.batch_number;

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Product QR Code Generator</h2>
              <p className="text-sm text-gray-600">Generate QR codes for supply chain tracking</p>
            </div>
          </div>
          <button
            onClick={generateRandomProduct}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Generate Sample</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Information Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product ID *
                </label>
                <input
                  type="text"
                  value={productData.product_id}
                  onChange={(e) => handleInputChange('product_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., PRD-ABC123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productData.product_name}
                  onChange={(e) => handleInputChange('product_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Wireless Headphones"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={productData.batch_number}
                  onChange={(e) => handleInputChange('batch_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BATCH-2024001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={productData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Food">Food</option>
                  <option value="Pharmaceutical">Pharmaceutical</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Textile">Textile</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={productData.manufacturing_date}
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
                  value={productData.expiry_date}
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
                value={productData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., TechCorp Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={productData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Product description and additional details..."
              />
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code Preview</h3>
            
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              {isFormValid ? (
                <div className="text-center">
                  <QRCodeSVG
                    id="product-qr-code"
                    value={generateQRData()}
                    size={qrSize}
                    level="M"
                    includeMargin={true}
                    className="mx-auto mb-4"
                  />
                  <p className="text-sm text-gray-600">
                    QR Code for {productData.product_name}
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Fill in required fields to generate QR code</p>
                  <p className="text-sm mt-1">Product ID, Name, and Batch Number are required</p>
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

                <div className="flex space-x-3">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR Code</span>
                  </button>
                  
                  <button
                    onClick={copyQRData}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Data'}</span>
                  </button>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Next Steps:</strong><br/>
                    1. Download and print the QR code<br/>
                    2. Attach it to your product<br/>
                    3. Use the scanner to track the product<br/>
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