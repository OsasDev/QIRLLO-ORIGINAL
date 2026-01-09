import { useState, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { uploadApi } from '../../lib/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

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
      const res = await uploadApi.uploadStudents(file);
      setResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Successfully imported ${res.data.created} students`);
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
      const res = await uploadApi.getTemplate();
      const blob = new Blob([res.data.template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="bulk-upload-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Bulk Student Upload</h1>
          <p className="text-muted-foreground">Import multiple students from a CSV file</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file containing student records. Download the template for the correct format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" data-testid="download-template-btn">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                  data-testid="file-input"
                />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
                    Upload Students
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CSV Format Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code className="bg-muted px-1 rounded">full_name</code> - Student's full name</li>
                    <li>• <code className="bg-muted px-1 rounded">admission_number</code> - Unique admission number</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Optional Fields:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code className="bg-muted px-1 rounded">class</code> - Class name (e.g., JSS1 A)</li>
                    <li>• <code className="bg-muted px-1 rounded">gender</code> - male or female</li>
                    <li>• <code className="bg-muted px-1 rounded">date_of_birth</code> - YYYY-MM-DD format</li>
                    <li>• <code className="bg-muted px-1 rounded">parent_email</code> - Link to existing parent</li>
                    <li>• <code className="bg-muted px-1 rounded">address</code> - Student's address</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Example:</h4>
                  <code className="text-xs block overflow-x-auto">
                    full_name,admission_number,class,gender<br/>
                    John Doe,QRL/2025/0001,JSS1 A,male<br/>
                    Jane Smith,QRL/2025/0002,JSS1 A,female
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {result.created > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8 mb-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  <p className="text-sm text-muted-foreground">Students Created</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                  <div className="max-h-48 overflow-y-auto bg-red-50 rounded-lg p-4">
                    {result.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-red-800 mb-1">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
