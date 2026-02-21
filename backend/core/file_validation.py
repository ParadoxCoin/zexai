"""
File Validation Utilities
Provides comprehensive file validation for security and quality
"""
import os
import magic
import hashlib
from typing import Dict, List, Optional, Tuple, Any
from PIL import Image, ImageFile
import cv2
import numpy as np
from fastapi import UploadFile, HTTPException, status
import mimetypes
import tempfile
from pathlib import Path
import subprocess
import json

from core.logger import app_logger as logger
from core.exceptions import FileProcessingError

# Enable loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

class FileValidator:
    """Comprehensive file validation service"""
    
    # Allowed file types and their configurations
    ALLOWED_TYPES = {
        "image": {
            "extensions": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".svg"],
            "mime_types": [
                "image/jpeg", "image/png", "image/gif", "image/bmp", 
                "image/webp", "image/tiff", "image/svg+xml"
            ],
            "max_size": 50 * 1024 * 1024,  # 50MB
            "max_dimensions": (8192, 8192),
            "min_dimensions": (32, 32)
        },
        "video": {
            "extensions": [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"],
            "mime_types": [
                "video/mp4", "video/avi", "video/quicktime", 
                "video/x-ms-wmv", "video/x-flv", "video/webm", "video/x-matroska"
            ],
            "max_size": 500 * 1024 * 1024,  # 500MB
            "max_duration": 600,  # 10 minutes
            "max_dimensions": (4096, 4096)
        },
        "audio": {
            "extensions": [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
            "mime_types": [
                "audio/mpeg", "audio/wav", "audio/flac", 
                "audio/aac", "audio/ogg", "audio/mp4"
            ],
            "max_size": 100 * 1024 * 1024,  # 100MB
            "max_duration": 1800  # 30 minutes
        },
        "document": {
            "extensions": [".pdf", ".txt", ".doc", ".docx", ".rtf"],
            "mime_types": [
                "application/pdf", "text/plain", 
                "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/rtf"
            ],
            "max_size": 25 * 1024 * 1024,  # 25MB
            "max_pages": 100
        }
    }
    
    # Dangerous file signatures to block
    DANGEROUS_SIGNATURES = {
        b'\x4D\x5A': 'PE executable',
        b'\x7F\x45\x4C\x46': 'ELF executable',
        b'\xCA\xFE\xBA\xBE': 'Java class file',
        b'\xFE\xED\xFA\xCE': 'Mach-O executable',
        b'\x50\x4B\x03\x04': 'ZIP archive (potential)',
        b'\x52\x61\x72\x21': 'RAR archive',
    }
    
    @classmethod
    async def validate_file(cls, 
                           file: UploadFile, 
                           expected_type: str,
                           additional_checks: bool = True) -> Dict[str, Any]:
        """
        Comprehensive file validation
        
        Args:
            file: Uploaded file
            expected_type: Expected file type (image, video, audio, document)
            additional_checks: Whether to perform deep content validation
        
        Returns:
            Validation result with metadata
        """
        try:
            # Basic validation
            basic_result = await cls._basic_validation(file, expected_type)
            if not basic_result["valid"]:
                return basic_result
            
            # Content validation
            if additional_checks:
                content_result = await cls._content_validation(file, expected_type)
                if not content_result["valid"]:
                    return content_result
                
                # Merge results
                basic_result["metadata"].update(content_result.get("metadata", {}))
            
            # Security validation
            security_result = await cls._security_validation(file)
            if not security_result["valid"]:
                return security_result
            
            return {
                "valid": True,
                "file_type": expected_type,
                "metadata": basic_result["metadata"],
                "security_checks": security_result.get("checks", {})
            }
            
        except Exception as e:
            logger.error(f"File validation failed: {e}")
            return {
                "valid": False,
                "error": f"Validation failed: {str(e)}",
                "error_code": "VALIDATION_ERROR"
            }
    
    @classmethod
    async def _basic_validation(cls, file: UploadFile, expected_type: str) -> Dict[str, Any]:
        """Basic file validation (extension, size, MIME type)"""
        if expected_type not in cls.ALLOWED_TYPES:
            return {
                "valid": False,
                "error": f"Unsupported file type: {expected_type}",
                "error_code": "UNSUPPORTED_TYPE"
            }
        
        config = cls.ALLOWED_TYPES[expected_type]
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in config["extensions"]:
            return {
                "valid": False,
                "error": f"Invalid file extension. Allowed: {', '.join(config['extensions'])}",
                "error_code": "INVALID_EXTENSION"
            }
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > config["max_size"]:
            return {
                "valid": False,
                "error": f"File too large. Maximum size: {config['max_size'] / 1024 / 1024:.1f}MB",
                "error_code": "FILE_TOO_LARGE"
            }
        
        if file_size == 0:
            return {
                "valid": False,
                "error": "Empty file",
                "error_code": "EMPTY_FILE"
            }
        
        # Check MIME type
        content = await file.read(8192)  # Read first 8KB for MIME detection
        file.file.seek(0)  # Reset
        
        detected_mime = magic.from_buffer(content, mime=True)
        if detected_mime not in config["mime_types"]:
            return {
                "valid": False,
                "error": f"Invalid file type. Detected: {detected_mime}",
                "error_code": "INVALID_MIME_TYPE"
            }
        
        return {
            "valid": True,
            "metadata": {
                "filename": file.filename,
                "size": file_size,
                "extension": file_ext,
                "mime_type": detected_mime,
                "size_mb": round(file_size / 1024 / 1024, 2)
            }
        }
    
    @classmethod
    async def _content_validation(cls, file: UploadFile, file_type: str) -> Dict[str, Any]:
        """Deep content validation based on file type"""
        try:
            # Save to temporary file for processing
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_path = temp_file.name
                file.file.seek(0)  # Reset file pointer
            
            try:
                if file_type == "image":
                    return await cls._validate_image_content(temp_path)
                elif file_type == "video":
                    return await cls._validate_video_content(temp_path)
                elif file_type == "audio":
                    return await cls._validate_audio_content(temp_path)
                elif file_type == "document":
                    return await cls._validate_document_content(temp_path)
                else:
                    return {"valid": True, "metadata": {}}
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Content validation failed: {e}")
            return {
                "valid": False,
                "error": f"Content validation failed: {str(e)}",
                "error_code": "CONTENT_VALIDATION_ERROR"
            }
    
    @classmethod
    async def _validate_image_content(cls, file_path: str) -> Dict[str, Any]:
        """Validate image content"""
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                config = cls.ALLOWED_TYPES["image"]
                
                # Check dimensions
                if width > config["max_dimensions"][0] or height > config["max_dimensions"][1]:
                    return {
                        "valid": False,
                        "error": f"Image too large. Maximum: {config['max_dimensions'][0]}x{config['max_dimensions'][1]}",
                        "error_code": "IMAGE_TOO_LARGE"
                    }
                
                if width < config["min_dimensions"][0] or height < config["min_dimensions"][1]:
                    return {
                        "valid": False,
                        "error": f"Image too small. Minimum: {config['min_dimensions'][0]}x{config['min_dimensions'][1]}",
                        "error_code": "IMAGE_TOO_SMALL"
                    }
                
                # Check for corrupted image
                try:
                    img.verify()
                except Exception:
                    return {
                        "valid": False,
                        "error": "Corrupted or invalid image file",
                        "error_code": "CORRUPTED_IMAGE"
                    }
                
                return {
                    "valid": True,
                    "metadata": {
                        "width": width,
                        "height": height,
                        "format": img.format,
                        "mode": img.mode,
                        "aspect_ratio": round(width / height, 2)
                    }
                }
                
        except Exception as e:
            return {
                "valid": False,
                "error": f"Invalid image file: {str(e)}",
                "error_code": "INVALID_IMAGE"
            }
    
    @classmethod
    async def _validate_video_content(cls, file_path: str) -> Dict[str, Any]:
        """Validate video content using OpenCV"""
        try:
            cap = cv2.VideoCapture(file_path)
            
            if not cap.isOpened():
                return {
                    "valid": False,
                    "error": "Cannot open video file",
                    "error_code": "INVALID_VIDEO"
                }
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            duration = frame_count / fps if fps > 0 else 0
            
            cap.release()
            
            config = cls.ALLOWED_TYPES["video"]
            
            # Check duration
            if duration > config["max_duration"]:
                return {
                    "valid": False,
                    "error": f"Video too long. Maximum: {config['max_duration']} seconds",
                    "error_code": "VIDEO_TOO_LONG"
                }
            
            # Check dimensions
            if width > config["max_dimensions"][0] or height > config["max_dimensions"][1]:
                return {
                    "valid": False,
                    "error": f"Video resolution too high. Maximum: {config['max_dimensions'][0]}x{config['max_dimensions'][1]}",
                    "error_code": "VIDEO_RESOLUTION_TOO_HIGH"
                }
            
            return {
                "valid": True,
                "metadata": {
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "duration": round(duration, 2),
                    "frame_count": frame_count,
                    "aspect_ratio": round(width / height, 2) if height > 0 else 0
                }
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Video validation failed: {str(e)}",
                "error_code": "VIDEO_VALIDATION_ERROR"
            }
    
    @classmethod
    async def _validate_audio_content(cls, file_path: str) -> Dict[str, Any]:
        """Validate audio content using ffprobe"""
        try:
            # Use ffprobe to get audio information
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                return {
                    "valid": False,
                    "error": "Invalid audio file",
                    "error_code": "INVALID_AUDIO"
                }
            
            data = json.loads(result.stdout)
            format_info = data.get('format', {})
            streams = data.get('streams', [])
            
            # Find audio stream
            audio_stream = None
            for stream in streams:
                if stream.get('codec_type') == 'audio':
                    audio_stream = stream
                    break
            
            if not audio_stream:
                return {
                    "valid": False,
                    "error": "No audio stream found",
                    "error_code": "NO_AUDIO_STREAM"
                }
            
            duration = float(format_info.get('duration', 0))
            config = cls.ALLOWED_TYPES["audio"]
            
            # Check duration
            if duration > config["max_duration"]:
                return {
                    "valid": False,
                    "error": f"Audio too long. Maximum: {config['max_duration']} seconds",
                    "error_code": "AUDIO_TOO_LONG"
                }
            
            return {
                "valid": True,
                "metadata": {
                    "duration": round(duration, 2),
                    "codec": audio_stream.get('codec_name'),
                    "sample_rate": audio_stream.get('sample_rate'),
                    "channels": audio_stream.get('channels'),
                    "bit_rate": format_info.get('bit_rate')
                }
            }
            
        except subprocess.TimeoutExpired:
            return {
                "valid": False,
                "error": "Audio validation timeout",
                "error_code": "VALIDATION_TIMEOUT"
            }
        except Exception as e:
            # Fallback validation - just check if file is readable
            try:
                with open(file_path, 'rb') as f:
                    # Read first few bytes to check if file is readable
                    f.read(1024)
                return {"valid": True, "metadata": {}}
            except:
                return {
                    "valid": False,
                    "error": f"Audio validation failed: {str(e)}",
                    "error_code": "AUDIO_VALIDATION_ERROR"
                }
    
    @classmethod
    async def _validate_document_content(cls, file_path: str) -> Dict[str, Any]:
        """Validate document content"""
        try:
            file_size = os.path.getsize(file_path)
            
            # Basic validation - check if file is readable
            with open(file_path, 'rb') as f:
                header = f.read(1024)
            
            # Check for PDF
            if header.startswith(b'%PDF'):
                # TODO: Add PDF-specific validation (page count, etc.)
                return {
                    "valid": True,
                    "metadata": {
                        "document_type": "pdf",
                        "size": file_size
                    }
                }
            
            # Check for text files
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read(1024)
                    return {
                        "valid": True,
                        "metadata": {
                            "document_type": "text",
                            "size": file_size,
                            "encoding": "utf-8"
                        }
                    }
            except UnicodeDecodeError:
                pass
            
            return {"valid": True, "metadata": {"document_type": "binary", "size": file_size}}
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Document validation failed: {str(e)}",
                "error_code": "DOCUMENT_VALIDATION_ERROR"
            }
    
    @classmethod
    async def _security_validation(cls, file: UploadFile) -> Dict[str, Any]:
        """Security validation to detect malicious files"""
        try:
            # Read file header for signature analysis
            header = await file.read(512)
            file.file.seek(0)  # Reset
            
            # Check for dangerous file signatures
            for signature, description in cls.DANGEROUS_SIGNATURES.items():
                if header.startswith(signature):
                    return {
                        "valid": False,
                        "error": f"Potentially dangerous file detected: {description}",
                        "error_code": "DANGEROUS_FILE_SIGNATURE"
                    }
            
            # Check for embedded executables in images (steganography)
            if b'MZ' in header or b'ELF' in header:
                return {
                    "valid": False,
                    "error": "Embedded executable detected",
                    "error_code": "EMBEDDED_EXECUTABLE"
                }
            
            # Calculate file hash for integrity
            file_content = await file.read()
            file.file.seek(0)  # Reset
            
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            return {
                "valid": True,
                "checks": {
                    "signature_check": "passed",
                    "executable_check": "passed",
                    "file_hash": file_hash
                }
            }
            
        except Exception as e:
            logger.error(f"Security validation failed: {e}")
            return {
                "valid": False,
                "error": f"Security validation failed: {str(e)}",
                "error_code": "SECURITY_VALIDATION_ERROR"
            }
    
    @classmethod
    def get_safe_filename(cls, filename: str) -> str:
        """Generate a safe filename"""
        # Remove path components
        filename = os.path.basename(filename)
        
        # Replace dangerous characters
        safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_"
        safe_filename = "".join(c if c in safe_chars else "_" for c in filename)
        
        # Ensure filename is not empty and not too long
        if not safe_filename or safe_filename.startswith('.'):
            safe_filename = "file" + safe_filename
        
        if len(safe_filename) > 255:
            name, ext = os.path.splitext(safe_filename)
            safe_filename = name[:255-len(ext)] + ext
        
        return safe_filename
    
    @classmethod
    async def validate_and_process_upload(cls, 
                                        file: UploadFile, 
                                        expected_type: str,
                                        user_id: str) -> Dict[str, Any]:
        """
        Complete file validation and processing pipeline
        
        Args:
            file: Uploaded file
            expected_type: Expected file type
            user_id: User ID for logging
        
        Returns:
            Processing result with file info
        """
        try:
            # Validate file
            validation_result = await cls.validate_file(file, expected_type)
            
            if not validation_result["valid"]:
                logger.warning(f"File validation failed for user {user_id}: {validation_result.get('error')}")
                raise FileProcessingError(
                    validation_result.get("error", "File validation failed"),
                    validation_result.get("error_code", "VALIDATION_FAILED")
                )
            
            # Generate safe filename
            safe_filename = cls.get_safe_filename(file.filename)
            
            # Add processing timestamp
            validation_result["metadata"]["processed_at"] = str(int(time.time()))
            validation_result["metadata"]["safe_filename"] = safe_filename
            validation_result["metadata"]["user_id"] = user_id
            
            logger.info(f"File validation successful for user {user_id}: {safe_filename}")
            
            return validation_result
            
        except FileProcessingError:
            raise
        except Exception as e:
            logger.error(f"File processing failed for user {user_id}: {e}")
            raise FileProcessingError(f"File processing failed: {str(e)}", "PROCESSING_ERROR")

# Global validator instance
file_validator = FileValidator()