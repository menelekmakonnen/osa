import React, { useEffect, useState, useRef } from 'react';
import { api, authState } from '../api/client';
import { Card, Button, Input, Textarea } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Camera, Loader2, UploadCloud, Folder, Plus, ArrowLeft, X } from 'lucide-react';
import { compressImage } from '../components/ImageUpload';
import { useTenant } from '../context/TenantContext';

export function Gallery() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  const isExec = user && user.role && user.role.toLowerCase() !== "member";
  const [albums, setAlbums] = useState([]);
  const [activeAlbum, setActiveAlbum] = useState(null);
  const [images, setImages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);

  const fetchAlbums = () => {
    setLoading(true);
    setError(null);
    api.getAlbums(activeScope)
       .then(res => setAlbums(res || []))
       .catch(err => {
         console.error("Albums Error", err);
         setError(err.message || "Failed to load albums");
       })
       .finally(() => setLoading(false));
  };

  const fetchGalleryItems = (albumId) => {
    setLoading(true);
    // Passing albumId to only get images for this album
    api.getGalleryItems(activeScope, albumId)
       .then(res => setImages(res || []))
       .catch(err => console.error("Gallery Error", err))
       .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeAlbum) {
        fetchGalleryItems(activeAlbum.id);
    } else {
        fetchAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAlbum]);

  const handleCreateAlbum = async (e) => {
      e.preventDefault();
      if (!newAlbumName.trim()) return;
      setCreatingAlbum(true);
      
      // Don't add a tempAlbum anymore, just let the button state say "Creating..."

      try {
          const newAlbumObj = await api.createAlbum({
              scope_type: activeScope.type,
              scope_id: activeScope.id,
              name: newAlbumName.trim(),
              description: newAlbumDesc.trim()
          });
          
          if (newAlbumObj) {
             setAlbums(prev => [newAlbumObj, ...prev]);
          } else {
             fetchAlbums();
          }
          
          setNewAlbumName("");
          setNewAlbumDesc("");
          setIsCreatingModalOpen(false);
      } catch(err) {
          console.error("Failed to create album", err);
          toast.error("Failed to create album");
      } finally {
          setCreatingAlbum(false);
      }
  };

  const handleFileChange = async (e) => {
     const file = e.target.files[0];
     if (!file) return;

     setUploading(true);
     try {
         const compressedBase64 = await compressImage(file);
         const uploadedImage = await api.uploadImage({
             scope_type: activeScope.type,
             scope_id: activeScope.id,
             album_id: activeAlbum ? activeAlbum.id : null,
             album_name: activeAlbum ? activeAlbum.name : null,
             image_base64: compressedBase64,
             file_name: file.name
         });
         
         if (uploadedImage && uploadedImage.url) {
             if (activeAlbum) {
                 setImages(prev => [uploadedImage, ...prev]);
             } else {
                 // Should not happen since they upload INTO an album view
                 fetchAlbums(); 
             }
         } else {
             if (activeAlbum) fetchGalleryItems(activeAlbum.id);
             else fetchAlbums();
         }
     } catch(err) {
         console.error("Upload failed", err);
         toast.error("Upload failed. Please try again.");
     } finally {
         setUploading(false);
         if (fileInputRef.current) fileInputRef.current.value = "";
         e.target.value = '';
     }
  };

  // View: Album List
  if (!activeAlbum) {
      return (
        <div className="flex flex-col gap-6 pb-12">
           {error && <ErrorCard message={error} onRetry={fetchAlbums} context="Gallery" />}
           <div className="flex justify-between items-center bg-surface-default p-4 rounded-social shadow-sm border border-border-light">
               <div>
                  <h1 className="text-xl font-bold text-ink-title">Galleries</h1>
                  <p className="text-[14px] text-ink-muted">View and share memories with {user.year_group_nickname !== 'PENDING' ? user.year_group_nickname : 'your year group'}</p>
               </div>
               {isExec && (
                 <Button onClick={() => setIsCreatingModalOpen(!isCreatingModalOpen)} variant="primary" className="flex gap-2">
                     <Plus size={18} strokeWidth={2.5}/> New Album
                 </Button>
               )}
           </div>
           
           {isCreatingModalOpen && (
               <Card className="p-4 border border-brand-200 bg-brand-50/30">
                  <h3 className="font-bold text-ink-title mb-3">Create New Album</h3>
                  <form onSubmit={handleCreateAlbum} className="flex flex-col gap-3">
                     <Input 
                        placeholder="Album Name (e.g. 10th Anniversary Dinner)" 
                        value={newAlbumName} 
                        onChange={e => setNewAlbumName(e.target.value)} 
                        required 
                     />
                     <Textarea 
                        placeholder="Short description (optional)" 
                        value={newAlbumDesc} 
                        onChange={e => setNewAlbumDesc(e.target.value)} 
                        rows={2} 
                     />
                     <div className="flex justify-end gap-2">
                         <Button type="button" variant="ghost" onClick={() => setIsCreatingModalOpen(false)}>Cancel</Button>
                         <Button type="submit" disabled={creatingAlbum}>{creatingAlbum ? "Creating..." : "Create Album"}</Button>
                     </div>
                  </form>
               </Card>
           )}

           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {loading && albums.length === 0 && (
                 [1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-surface-muted rounded-social animate-pulse border border-border-light" />
                 ))
              )}
              {!loading && albums.length === 0 && (
                 <div className="col-span-full py-16 text-center text-ink-muted flex flex-col items-center bg-surface-muted/30 rounded-social border border-border-light">
                     <Folder size={48} strokeWidth={1} className="mb-2 opacity-50 text-brand-500" />
                     <p className="font-semibold text-lg text-ink-title">No Albums Yet</p>
                     <p className="text-sm">Create an album to start organizing your gallery.</p>
                 </div>
              )}
              {albums.map(album => (
                  <Card 
                     key={album.id} 
                     className="!p-5 cursor-pointer hover:shadow-social-card transition-all border border-border-light group flex flex-col justify-between"
                     onClick={() => setActiveAlbum(album)}
                  >
                     <div>
                         <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Folder size={24} strokeWidth={2}/>
                         </div>
                         <h3 className="font-bold text-[16px] text-ink-title mb-1 truncate">{album.name}</h3>
                         <p className="text-[13px] text-ink-muted line-clamp-2">{album.description || "No description provided."}</p>
                     </div>
                     <div className="mt-4 pt-3 border-t border-border-light flex justify-between items-center">
                         <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                            By {album.created_by_name}
                         </span>
                         <span className="text-[11px] font-semibold text-ink-muted">
                            {new Date(album.timestamp).toLocaleDateString()}
                         </span>
                     </div>
                  </Card>
              ))}
           </div>
        </div>
      );
  }

  // View: Inside an Album
  return (
    <div className="flex flex-col gap-5 pb-10">
       <div className="flex items-center gap-3">
           <button onClick={() => setActiveAlbum(null)} className="p-2 bg-surface-muted hover:bg-surface-hover rounded-full transition-colors text-ink-title">
               <ArrowLeft size={20} strokeWidth={2.5}/>
           </button>
           <h2 className="text-xl font-bold text-ink-title truncate">{activeAlbum.name}</h2>
       </div>
       
       <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2 bg-brand-50/50">
          <UploadCloud size={48} className="text-brand-500 mb-3" />
          <h2 className="text-lg font-bold text-ink-title">Add to {activeAlbum.name}</h2>
          <p className="text-ink-body mb-4 mt-1 text-center text-sm max-w-sm">
             Upload pictures to this album for all class members to see.
          </p>
          <input 
             type="file" 
             accept="image/*" 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleFileChange}
          />
          <Button 
            className="flex items-center gap-2" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
             {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
             {uploading ? "Uploading..." : "Upload Picture"}
          </Button>
       </Card>

       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && images.length === 0 && (
             [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-surface-muted rounded-social animate-pulse" />
             ))
          )}
          {!loading && images.length === 0 && (
             <div className="col-span-full py-16 text-center text-ink-muted flex flex-col items-center">
                 <ImageIcon size={48} strokeWidth={1} className="mb-2 opacity-50" />
                 <p className="font-semibold text-lg">No Images Yet</p>
                 <p className="text-sm mt-1">Be the first to share a moment here.</p>
             </div>
          )}
           {images.map(img => (
             <div key={img.id} onClick={() => setLightboxImage(img)} className="aspect-square bg-surface-muted rounded-social overflow-hidden relative group cursor-pointer shadow-sm border border-border-light flex items-center justify-center">
                 <img 
                    src={img.url} 
                    referrerPolicy="no-referrer" 
                    alt="Gallery" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    onError={(e) => { 
                       e.target.onerror = null; 
                       e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; 
                       e.target.className = 'w-16 h-16 opacity-30'; 
                    }}
                 />
                 {/* Metadata tooltip/overlay */}
                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                     <div>
                        <span className="text-white text-xs font-semibold block">{img.uploaded_by_name}</span>
                        <span className="text-white/70 text-[10px]">{new Date(img.timestamp).toLocaleDateString()}</span>
                     </div>
                 </div>
             </div>
          ))}
       </div>

       {lightboxImage && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setLightboxImage(null)}>
             <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 transition-colors rounded-full bg-black/20 hover:bg-black/50">
                <X size={32} />
             </button>
             <img src={lightboxImage.url} referrerPolicy="no-referrer" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl cursor-default" onClick={e => e.stopPropagation()} />
             <div className="absolute bottom-10 left-0 right-0 text-center text-white cursor-default" onClick={e => e.stopPropagation()}>
                 <p className="font-bold text-lg">{lightboxImage.uploaded_by_name}</p>
                 <p className="text-sm opacity-70 mb-2">{new Date(lightboxImage.timestamp).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
             </div>
          </div>
       )}

    </div>
  );
}
