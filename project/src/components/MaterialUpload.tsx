import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';

interface MaterialUploadProps {
    courseId: string;
    onUploadSuccess?: (material: any) => void;
}

const MaterialUpload: React.FC<MaterialUploadProps> = ({ courseId, onUploadSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Only PDF files are supported for course materials.');
                return;
            }
            setFile(selectedFile);
            setError(null);
            setSuccess(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setProcessingStatus('Uploading to server...');

        const formData = new FormData();
        formData.append('material', file);
        formData.append('courseId', courseId);

        try {
            const response = await axios.post(
                'http://localhost:5001/api/uploads/material',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('authToken')}`
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                        if (percentCompleted < 100) {
                            setProcessingStatus(`Uploading: ${percentCompleted}%`);
                        } else {
                            setProcessingStatus('AI is analyzing and chunking PDF content...');
                        }
                    }
                }
            );

            if (response.data.success) {
                setSuccess(true);
                setFile(null);
                if (onUploadSuccess) onUploadSuccess(response.data.material);
            }
        } catch (err: any) {
            console.error('Material upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload and process material.');
        } finally {
            setUploading(false);
            setProcessingStatus('');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Course Materials (RAG)</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Upload PDF textbooks, lecture notes, or research papers. Our AI will index them so students can ask specific questions about the content.
            </p>

            {!success ? (
                <div className="space-y-4">
                    <div
                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${file ? 'border-blue-400 bg-blue-50/30' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {file ? (
                            <div className="flex flex-col items-center">
                                <FileText className="w-12 h-12 text-blue-500 mb-2" />
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="mt-3 text-xs text-red-500 font-bold hover:underline"
                                >
                                    Remove File
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag & drop</p>
                                <p className="text-xs text-gray-500 mt-1">PDF only, max 20MB</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm italic">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${!file || uploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                            }`}
                    >
                        {uploading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>{processingStatus}</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                <span>Start AI Ingestion</span>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Material Ingested!</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        The content is now indexed and available for the Learning Copilot.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="text-blue-600 font-bold text-sm hover:underline"
                    >
                        Upload another document
                    </button>
                </div>
            )}
        </div>
    );
};

export default MaterialUpload;
