import { useState, useEffect } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

interface GoogleDriveGalleryProps {
  folderId: string;
}

export default function GoogleDriveGallery({ folderId }: GoogleDriveGalleryProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
        
        if (!apiKey) {
          throw new Error("Chave de API não configurada. Defina a variável VITE_GOOGLE_DRIVE_API_KEY no arquivo .env");
        }

        const query = `'${folderId}' in parents and mimeType contains 'image/'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)`;

        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Erro na API: ${errorData.error?.message || res.statusText}`);
        }

        const data = await res.json();
        setFiles(data.files || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [folderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-2 bg-destructive/10 rounded-xl p-6 border border-destructive/20 mx-auto max-w-md">
        <p className="text-destructive font-bold text-lg">Erro ao carregar</p>
        <p className="text-sm text-foreground/80">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <ImageIcon size={32} className="text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Nenhuma imagem encontrada na pasta.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in">
      {files.map((file) => (
        <a 
          key={file.id} 
          href={file.webViewLink || file.webContentLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="group relative aspect-square rounded-xl overflow-hidden shadow-card border border-border bg-muted block"
        >
          {file.id ? (
            <img 
              src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w800`} 
              alt={file.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="text-muted-foreground" size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            <span className="text-white text-xs font-semibold truncate leading-tight drop-shadow-md">{file.name}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
