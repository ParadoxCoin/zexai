import React, { useCallback, useState } from 'react';
import { Upload, X, File, Image as ImageIcon, Video, Music } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10,
  multiple = false,
  onUpload,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error('Dosya çok büyük', `Maksimum ${maxSize}MB yüklenebilir`);
      return false;
    }
    return true;
  };

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const validFiles: File[] = [];
    Array.from(fileList).forEach(file => {
      if (validateFile(file)) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
    }
  }, [multiple, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      setProgress(0);

      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onUpload(files);

      clearInterval(interval);
      setProgress(100);
      
      toast.success('Başarılı', 'Dosyalar yüklendi');
      setFiles([]);
      setProgress(0);
    } catch (error: any) {
      toast.error('Hata', error.message || 'Dosya yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (file.type.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (file.type.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Dosyaları sürükleyip bırakın veya{' '}
            <span className="text-primary-600 font-medium">seçin</span>
          </p>
          <p className="text-xs text-gray-500">
            Maksimum {maxSize}MB
          </p>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-500">{getFileIcon(file)}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                disabled={uploading}
                className="text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-600">{progress}%</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      )}
    </div>
  );
};
