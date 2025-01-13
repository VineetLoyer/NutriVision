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
    setCrop({
      unit: 'px',
      width: image.naturalWidth * 0.8, // Default to 80% of width
      height: image.naturalHeight * 0.8, // Default to 80% of height
      x: image.naturalWidth * 0.1, // Center the crop
      y: image.naturalHeight * 0.1,
    });
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
        setLoading(true);
        const formData = new FormData();
        const response = await fetch(croppedImage);
        const blob = await response.blob();
  
        formData.append('image', blob);
  
        const result = await fetch('http://localhost:3001/analyze-label', {
          method: 'POST',
          body: formData,
        });
        console.log('Response:', result);
        const json = await result.json();
        console.log('Parsed Response:', json);
        if (result.ok && json.success) {
          setAnalysisResult(json.analysis);
        } else {
          throw new Error(json.message || 'Failed to analyze the label.');
        }
      } catch (error) {
        console.error('Error during analysis:', error);
        alert('An error occurred while analyzing the label.');
      } finally {
        setLoading(false);
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
  
  function AnalysisDisplay({ analysisResult }: { analysisResult: string | null }) {
    if (!analysisResult) return null;

    // Split the response into lines and clean up
    const lines = analysisResult.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Extract health score
    const healthScoreLine = lines.find(line => /^\d+\.\s*Health Score:/.test(line));
    const healthScore = healthScoreLine 
      ? healthScoreLine.split(':')[1].trim().replace('/100', '')
      : 'N/A';

    // Helper function to extract section content
    const extractSection = (startMarker, endMarkers) => {
      // Find the start of the section
      const startIdx = lines.findIndex(line => 
        line.match(new RegExp(`^\\d+\\.\\s*${startMarker}:`))
      );
    
    if (startIdx === -1) return [];
    
    // Find the end of the section (start of next section)
    const endIdx = endMarkers.reduce((closest, marker) => {
      const idx = lines.findIndex((line, i) => 
        i > startIdx && line.match(new RegExp(`^\\d+\\.\\s*${marker}:`))
      );
      return idx !== -1 && (closest === -1 || idx < closest) ? idx : closest;
    }, -1);

    // Filter lines that are actual content (starting with dash)
    const sectionContent = lines
      .slice(startIdx + 1, endIdx === -1 ? undefined : endIdx)
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.substring(line.indexOf('-') + 1).trim());

    return sectionContent;
  };

  // Extract each section with appropriate markers
  const positiveAspects = extractSection('Positive Aspects', ['Negative Aspects', 'Healthier Alternatives']);
  const negativeAspects = extractSection('Negative Aspects', ['Healthier Alternatives']);
  const healthierAlternatives = extractSection('Healthier Alternatives', []);

  // Filter helper alternatives from negative aspects if they got mixed
  const cleanNegativeAspects = negativeAspects.filter(aspect => 
    !aspect.toLowerCase().includes('look for') && 
    !aspect.toLowerCase().includes('consider') &&
    !aspect.toLowerCase().includes('choose') &&
    !aspect.toLowerCase().includes('opt for')
  );
  
      return (
        <div className="bg-white shadow-lg rounded-lg p-6 mt-6 border border-gray-300">
          {/* Health Score */}
          <div className="text-center mb-6">
            <div className="text-xl font-bold text-gray-700">Health Score</div>
            <div
              className={`text-6xl font-extrabold ${
                Number(healthScore) <= 40
                  ? 'text-red-600' // Red for scores <=40
                  : Number(healthScore) <= 70
                  ? 'text-yellow-500' // Yellow for scores between 41-70
                  : 'text-green-600' // Green for scores >70
              }`}
            >
              {Number(healthScore) || 'N/A'}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              A higher score indicates better nutritional quality.
            </div>
          </div>
      
          {/* Content Sections */}
          <div className="space-y-6">
            {/* Positive Aspects */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">What's Good?</h3>
              {positiveAspects.length > 0 ? (
                <ul className="list-disc ml-6 text-green-600">
                  {positiveAspects.map((aspect, index) => (
                    <li key={index} className="flex items-center">
                      <span className="mr-2">✔</span>
                      {aspect}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No positive aspects identified.</p>
              )}
            </div>
      
            {/* Negative Aspects */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">What's Bad?</h3>
              {negativeAspects.length > 0 ? (
                <ul className="list-disc ml-6 text-red-600">
                  {negativeAspects.map((aspect, index) => (
                    <li key={index} className="flex items-center">
                      <span className="mr-2">⚠</span>
                      {aspect}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No negative aspects identified.</p>
              )}
            </div>
      
            {/* Healthier Alternatives */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Healthier Alternatives</h3>
              {healthierAlternatives.length > 0 ? (
                <ul className="list-disc ml-6 text-blue-600">
                  {healthierAlternatives.map((alternative, index) => (
                    <li key={index} className="flex items-center">
                      <span className="mr-2">💡</span>
                      {alternative}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No healthier alternatives.</p>
              )}
            </div>
          </div>
        </div>
      );
  }
  
  

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
                minWidth={10} 
                minHeight={10} 
                keepSelection={false} 
                style={{ maxWidth: '100%' }} 
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

      {analysisResult && <AnalysisDisplay analysisResult={analysisResult} />}


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



