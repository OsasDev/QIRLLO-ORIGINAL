import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';

export const BulkUploadModal = ({ type = 'students', onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const configs = {
    students: {
      title: 'Upload Students',
      description: 'Import students, parent accounts, and fee structures from an Excel workbook',
      endpoint: '/students/upload-xlsx',
      templateEndpoint: '/students/xlsx-template',
      templateName: 'students_fees_template.xlsx',
      accept: '.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
      accept: '.csv',
      mimeType: 'text/csv',
    },
    classes_fees: {
      title: 'Upload Classes & Fees',
      description: 'Import classes and fee structures from an Excel workbook',
      endpoint: '/classes/upload-xlsx',
      templateEndpoint: '/classes/xlsx-template',
      templateName: 'classes_fees_template.xlsx',
      accept: '.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  };

  const config = configs[type];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedExt = config.accept || '.csv';
      if (!selectedFile.name.endsWith(allowedExt)) {
        toast.error(`Please select a ${allowedExt} file`);
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

      const createdCount = (res.data.created || 0) + (res.data.classes_created || 0) + (res.data.fees_created || 0) + (res.data.students_created || 0) + (res.data.parents_created || 0) + (res.data.fees_processed || 0);

      if (createdCount > 0 || res.data.message) {
        toast.success(res.data.message || 'Successfully processed upload');
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
      const res = await api.get(config.templateEndpoint, { responseType: 'blob' }); // Important for binary files
      const mimeType = config.mimeType || 'text/csv';
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config.templateName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-4" data-testid={`bulk-upload-${type}`}>
      <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" data-testid="download-template-btn">
        <Download className="w-4 h-4 mr-2" />
        {config.accept === '.xlsx' ? 'Download Excel Template' : 'Download CSV Template'}
      </Button>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={config.accept || '.csv'}
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
            <p className="font-medium text-foreground">Click to select {config.accept === '.xlsx' ? 'Excel' : 'CSV'} file</p>
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
      {result && (() => {
        const totalCreated = (result.created || 0) + (result.students_created || 0) + (result.classes_created || 0) + (result.fees_created || 0) + (result.parents_created || 0) + (result.fees_processed || 0);
        return (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {totalCreated > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">Upload Results</span>
            </div>
            {result.message && (
              <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              {result.students_created > 0 && <span className="text-green-600">{result.students_created} students</span>}
              {result.parents_created > 0 && <span className="text-blue-600">{result.parents_created} parents</span>}
              {result.fees_processed > 0 && <span className="text-purple-600">{result.fees_processed} fee structures</span>}
              {result.classes_created > 0 && <span className="text-green-600">{result.classes_created} classes</span>}
              {result.fees_created > 0 && <span className="text-green-600">{result.fees_created} fees</span>}
              {result.created > 0 && <span className="text-green-600">{result.created} created</span>}
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
        );
      })()}
    </div>
  );
};
