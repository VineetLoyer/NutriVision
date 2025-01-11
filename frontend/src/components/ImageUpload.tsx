'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import CameraCapture from './CameraCapture';

export default function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setCroppedImage(null);
        setIsUploaded(false);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    setShowCamera(true);
  };

  const handleCameraCaptureComplete = (imageData: string) => {
    setSelectedImage(imageData);
    setCroppedImage(null);
    setIsUploaded(false);
    setAnalysisResult(null);
    setShowCamera(false);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const image = e.currentTarget as HTMLImageElement;
    const aspectRatio = image.naturalWidth / image.naturalHeight;
  
    // Set crop dimensions dynamically based on the image's aspect ratio
    if (aspectRatio > 1) {
      // For wide images, keep height smaller and adjust width
      setCrop({
        unit: 'px',
        width: image.naturalWidth * 0.8,
        height: image.naturalHeight * 0.5,
        x: (image.naturalWidth * 0.2) / 2,
        y: (image.naturalHeight * 0.5) / 2,
      });
    } else {
      // For tall images, keep width smaller and adjust height
      setCrop({
        unit: 'px',
        width: image.naturalWidth * 0.5,
        height: image.naturalHeight * 0.8,
        x: (image.naturalWidth * 0.5) / 2,
        y: (image.naturalHeight * 0.2) / 2,
      });
    }
  }, []);

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );
    }

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        }
      }, 'image/jpeg');
    });
  }, []);

  const handleCropComplete = useCallback(async (crop: PixelCrop) => {
    setCompletedCrop(crop);
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = await getCroppedImg(imageRef.current, crop);
      setCroppedImage(croppedImageUrl);
    }
  }, [getCroppedImg]);


  const handleSubmit = async () => {
    if (croppedImage) {
      try {
        setLoading(true); // Start loading
        const formData = new FormData();
        const response = await fetch(croppedImage);
        const blob = await response.blob();

        formData.append('image', blob);

        const result = await fetch('http://localhost:3001/analyze-label', {
          method: 'POST',
          body: formData,
        });

        const json = await result.json();
        console.log('Response from backend:', json);

        if (json.success && json.data.Blocks.length > 0) {
          const extractedText = json.data.Blocks
            .filter((block: { BlockType: string; Text?: string }) => block.BlockType === 'LINE')
            .map((block: { Text?: string }) => block.Text)
            .join('\n');
          console.log('Extracted Text:', extractedText);
          setAnalysisResult(extractedText);
        } else if (json.success) {
          alert('No text could be extracted from the image.');
        } else {
          alert('Failed to analyze the label.');
        }
      } catch (error) {
        console.error('Error during analysis:', error);
        alert('An error occurred while analyzing the label.');
      } finally {
        setLoading(false); // Stop loading
      }
    }
  };
  
  const reset = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setAnalysisResult(null);
    setIsUploaded(false);
    setShowCamera(false);
  };
  

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
          Upload Food Label Image
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label
            htmlFor="image-upload"
            className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Upload className="h-5 w-5 mr-2 text-gray-400" />
            <span>Upload Image</span>
            <input
              id="image-upload"
              name="image-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
          <button
            onClick={handleCameraCapture}
            className="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Camera className="h-5 w-5 mr-2 text-gray-400" />
            <span>Capture Image</span>
          </button>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCaptureComplete}
          onClose={() => setShowCamera(false)}
        />
      )}

      {isUploaded ? (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="text-center">Image uploaded successfully and is being processed.</p>
        </div>
      ) : (
        <>
          {selectedImage && (
            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={handleCropComplete}
                aspect={1}
              >
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Food Label"
                  className="max-w-full h-auto"
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          )}
          {croppedImage && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cropped Image Preview</h3>
              <img src={croppedImage} alt="Cropped Food Label" className="max-w-full h-auto" />
            </div>
          )}
        </>
      )}

      {analysisResult && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Extracted Analysis:</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{analysisResult}</pre>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-600">
          <p>Analyzing the label...</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        disabled={!croppedImage || loading}
      >
        {loading ? 'Analyzing...' : 'Analyze Label'}
      </button>

      <button
        onClick={reset}
        className="mt-4 w-full bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Reset
      </button>
    </div>
  );
}



