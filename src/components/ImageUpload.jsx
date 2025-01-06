import React, { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const ImageUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCameraClick = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current.click();
    } else {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-800">
              NutriVision
            </CardTitle>
            <p className="text-center text-gray-600">
              Upload or capture a food label to analyze its nutritional content
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setPreview(null);
                    }}
                    className="mt-4 w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-600" />
                    <span className="mt-2 text-sm text-gray-600">Upload Image</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  <div 
                    onClick={handleCameraClick}
                    className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-gray-600" />
                    <span className="mt-2 text-sm text-gray-600">Take Photo</span>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImageUpload;