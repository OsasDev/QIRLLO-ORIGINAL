import { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { uploadApi } from '../../lib/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';

export const BulkUploadModal = ({ type = 'students', onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const configs = {
    students: {
      title: 'Upload Students',
      description: 'Import multiple students from a CSV file',
      endpoint: '/students/upload-csv',
      templateEndpoint: '/students/csv-template',
      templateName: 'student_upload_template.csv',
    },
    parents: {
      title: 'Upload Parents',
      description: 'Import parent accounts from a CSV file',
      endpoint: '/users/upload-parents-csv',
      templateEndpoint: '/users/parents-csv-template',
      templateName: 'parent_upload_template.csv',
    },
    payments: {
      title: 'Upload Payments',
      description: 'Import fee payments from a CSV file',
      endpoint: '/fees/upload-payments-csv',
      templateEndpoint: '/fees/payments-csv-template',
      templateName: 'payments_upload_template.csv',
    },
  };

  const config = configs[type];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Successfully imported ${res.data.created} records`);
        if (onSuccess) onSuccess();
      }
      if (res.data.errors?.length > 0) {
        toast.warning(`${res.data.errors.length} rows had errors`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(config.templateEndpoint);
      const blob = new Blob([res.data.template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config.templateName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-4" data-testid={`bulk-upload-${type}`}>
      <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" data-testid="download-template-btn">
        <Download className="w-4 h-4 mr-2" />
        Download CSV Template
      </Button>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
          data-testid="file-input"
        />
        <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        {file ? (
          <div>
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-foreground">Click to select CSV file</p>
            <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full"
        data-testid="upload-btn"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </>
        )}
      </Button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {result.created > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">Upload Results</span>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="text-green-600">{result.created} created</span>
            <span className="text-red-600">{result.errors?.length || 0} errors</span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 p-2 rounded">
              {result.errors.map((error, idx) => (
                <p key={idx}>{error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
