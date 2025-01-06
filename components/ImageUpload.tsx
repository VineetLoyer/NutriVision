'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Camera, Upload } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import CameraCapture from './CameraCapture'

export default function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setCroppedImage(null)
        setIsUploaded(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = () => {
    setShowCamera(true)
  }

  const handleCameraCaptureComplete = (imageData: string) => {
    setSelectedImage(imageData)
    setCroppedImage(null)
    setIsUploaded(false)
    setShowCamera(false)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 })
  }, [])

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop) => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')

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
      )
    }

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob))
        }
      }, 'image/jpeg')
    })
  }, [])

  const handleCropComplete = useCallback(async (crop: PixelCrop) => {
    setCompletedCrop(crop)
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = await getCroppedImg(imageRef.current, crop)
      setCroppedImage(croppedImageUrl)
    }
  }, [getCroppedImg])

  const handleSubmit = () => {
    if (croppedImage) {
      console.log('Processing cropped image:', croppedImage)
      setIsUploaded(true)
      setSelectedImage(null)
      setCroppedImage(null)
    } else {
      console.log('No cropped image available')
    }
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

      <button
        onClick={() => {
          if (isUploaded) {
            setIsUploaded(false)
          } else {
            handleSubmit()
          }
        }}
        className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        disabled={!croppedImage && !isUploaded}
      >
        {isUploaded ? 'Upload Another Image' : 'Analyze Label'}
      </button>
    </div>
  )
}

