import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from './ui';
import { X, Crop as CropIcon } from 'lucide-react';

// Standard 1024px maximum edge
const MAX_EDGE = 1024;
// 2MB size threshold before we enforce compression
const MAX_BYTE_SIZE = 2 * 1024 * 1024; 

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If file is already below max byte size, and dimensions are small, return directly.
        if (file.size <= MAX_BYTE_SIZE && width <= MAX_EDGE && height <= MAX_EDGE) {
            resolve(event.target.result);
            return;
        }

        // Calculate aspect ratio
        if (width > height) {
          if (width > MAX_EDGE) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          }
        } else {
          if (height > MAX_EDGE) {
            width = Math.round((width * MAX_EDGE) / height);
            height = MAX_EDGE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress heavily (quality 0.7) to save backend storage space in GAS
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

export function ProfileCropper({ imageSrc, onComplete, onCancel, aspectRatio = 1, circularCrop = true }) {
  const [crop, setCrop] = useState();
  const imgRef = useRef(null);
  
  const onImageLoad = (e) => {
      const { width, height } = e.currentTarget;
      const c = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspectRatio, width, height),
        width,
        height
      );
      setCrop(c);
  };

  const handleCropComplete = async () => {
      if (!crop || !imgRef.current) return;
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = crop.width * scaleX;
      canvas.height = crop.height * scaleY;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
          imgRef.current,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          crop.width * scaleX,
          crop.height * scaleY
      );

      const finalCanvas = document.createElement('canvas');
      const MAX_WIDTH = aspectRatio === 1 ? 400 : 1200;
      let finalW = canvas.width;
      let finalH = canvas.height;
      if (finalW > MAX_WIDTH) {
          finalH = Math.round((finalH * MAX_WIDTH) / finalW);
          finalW = MAX_WIDTH;
      }
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const fCtx = finalCanvas.getContext('2d');
      fCtx.drawImage(canvas, 0, 0, finalW, finalH);
      
      onComplete(finalCanvas.toDataURL('image/jpeg', 0.8));
  };

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-default p-4 rounded-social max-w-lg w-full flex flex-col gap-4">
         <div className="flex justify-between items-center pb-2 border-b border-border-light">
             <h3 className="font-bold text-ink-title flex items-center gap-2"><CropIcon size={20}/> Crop Profile Picture</h3>
             <button onClick={onCancel} className="p-1 rounded-full hover:bg-surface-muted text-ink-muted">
                 <X size={20} />
             </button>
         </div>
         <div className="max-h-[60vh] overflow-hidden flex justify-center bg-surface-muted rounded-md relative group">
           <ReactCrop 
              crop={crop} 
              onChange={c => setCrop(c)} 
              aspect={aspectRatio}
              circularCrop={circularCrop}
           >
              <img 
                 ref={imgRef}
                 src={imageSrc} 
                 onLoad={onImageLoad} 
                 alt="Crop target" 
                 className="max-h-[60vh] object-contain"
              />
           </ReactCrop>
         </div>
         <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleCropComplete}>Save Picture</Button>
         </div>
      </div>
    </div>
  );
}
