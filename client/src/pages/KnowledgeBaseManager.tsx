import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Plus, Trash2, Eye, FileText, Calendar, Database, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/utils/apiClient';

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  totalChunks: number;
  updatedAt: string;
}

interface FileWithSize extends File {
  size: number;
}

const KnowledgeBaseManager = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const [newKBName, setNewKBName] = useState('');
  const [newKBDescription, setNewKBDescription] = useState('');
  const [selectedKBId, setSelectedKBId] = useState('');
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null);
  
  // Educational criteria fields
  const [educationalBoard, setEducationalBoard] = useState('IB');
  const [subject, setSubject] = useState('Mathematics');
  const [level, setLevel] = useState('HL');

  // Check admin access
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to administrators.",
        variant: "destructive",
      });
      // Redirect to home or tutor page
      window.location.href = '/tutor';
    }
  }, [isAuthenticated, user, toast]);

  // Fetch knowledge bases
  const fetchKnowledgeBases = async () => {
    try {
      const response = await apiClient.get('/knowledge-base');
      setKnowledgeBases(response.data.criteria || response.data.knowledgeBases || response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch knowledge bases",
        variant: "destructive",
      });
      console.error('Error fetching knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchKnowledgeBases();
    }
  }, [isAuthenticated, user]);

  // File drop handler
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const maxSize = 15 * 1024 * 1024; // 15MB limit (leaving 1MB buffer for MongoDB)
      
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 15MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setShowUploadModal(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) return;

    // Double-check file size before upload
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (selectedFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File size (${formatFileSize(selectedFile.size)}) exceeds the maximum allowed size of 15MB. Please choose a smaller file.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    if (uploadMode === 'new') {
      formData.append('criteriaName', newKBName);
      formData.append('description', newKBDescription);
      formData.append('educationalBoard', educationalBoard);
      formData.append('subject', subject);
      formData.append('level', level);
    } else {
      formData.append('criteriaId', selectedKBId);
    }

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
      setShowUploadModal(false);
      resetFormFields();
      setSelectedKBId('');
      fetchKnowledgeBases();
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMessage = 'Upload failed';
      
      if (errorData?.error === 'File too large for processing') {
        errorMessage = errorData.details || 'File is too large to process. Please split it into smaller parts.';
      } else if (errorData?.error) {
        errorMessage = errorData.details || errorData.error;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (kb: KnowledgeBase) => {
    setKbToDelete(kb);
    setShowDeleteDialog(true);
  };

  // Delete knowledge base
  const handleDeleteKB = async () => {
    if (!kbToDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/knowledge-base/${kbToDelete.id}`);
      
      toast({
        title: "Success",
        description: `Knowledge base "${kbToDelete.name}" deleted successfully`,
      });
      
      setShowDeleteDialog(false);
      setKbToDelete(null);
      fetchKnowledgeBases();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete knowledge base",
        variant: "destructive",
      });
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle upload mode change
  const handleUploadModeChange = (value: string) => {
    if (value === 'new' || value === 'existing') {
      setUploadMode(value);
    }
  };

  // Reset form fields
  const resetFormFields = () => {
    setSelectedFile(null);
    setNewKBName('');
    setNewKBDescription('');
    setSelectedKBId('');
    setEducationalBoard('IB');
    setSubject('Mathematics');
    setLevel('HL');
    setUploadMode('new');
  };

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only accessible to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading knowledge bases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            Knowledge Base Manager
          </h1>
          <p className="text-gray-600 mt-2">Upload and manage learning materials for the AI tutor</p>
        </div>
        {user?.role === 'admin' && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>

      {/* Upload Dropzone - Admin Only */}
      {user?.role === 'admin' && (
        <Card>
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
              </h3>
              <p className="text-gray-500 mb-4">
                or click to select a file (PDF, TXT, DOCX)
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                <Badge variant="outline">PDF</Badge>
                <Badge variant="outline">TXT</Badge>
                <Badge variant="outline">DOCX</Badge>
                <span>• Max 15MB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Bases List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Knowledge Bases
            <Badge variant="secondary" className="ml-2">
              {knowledgeBases?.length || 0}
            </Badge>
          </h2>
        </div>
        
        {(!knowledgeBases || knowledgeBases.length === 0) ? (
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge bases yet</h3>
              <p className="text-gray-500 mb-4">Upload your first document to get started</p>
              {user?.role === 'admin' && (
                <Button
                  onClick={() => setShowUploadModal(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeBases && knowledgeBases.map((kb) => (
              <Card key={kb.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{kb.name}</CardTitle>
                      {kb.description && (
                        <CardDescription className="text-sm">
                          {kb.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(kb)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <FileText className="h-4 w-4 mr-2" />
                        {kb.fileCount} file{kb.fileCount !== 1 ? 's' : ''}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {kb.totalChunks} chunks
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Updated {new Date(kb.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal - Admin Only */}
      {user?.role === 'admin' && (
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </DialogTitle>
            <DialogDescription>
              Upload a document to create a new knowledge base or add to an existing one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFile ? (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{selectedFile.name}</p>
                    <p className={`text-sm ${selectedFile.size > 15 * 1024 * 1024 ? 'text-red-500' : 'text-gray-600'}`}>
                      {formatFileSize(selectedFile.size)}
                      {selectedFile.size > 15 * 1024 * 1024 && (
                        <span className="ml-2 text-red-600 font-medium">(Too large - max 15MB)</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors"
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to select a file</p>
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700">Upload Mode</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  uploadMode === 'new' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="new"
                    checked={uploadMode === 'new'}
                    onChange={(e) => handleUploadModeChange(e.target.value)}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Create new Knowledge Base</span>
                    <p className="text-xs text-gray-500">Start fresh with new criteria</p>
                  </div>
                </label>
                <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  uploadMode === 'existing' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="existing"
                    checked={uploadMode === 'existing'}
                    onChange={(e) => handleUploadModeChange(e.target.value)}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Add to existing Knowledge Base</span>
                    <p className="text-xs text-gray-500">Extend current criteria</p>
                  </div>
                </label>
              </div>
            </div>

            {uploadMode === 'new' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kb-name">Knowledge Base Name *</Label>
                  <Input
                    id="kb-name"
                    value={newKBName}
                    onChange={(e) => setNewKBName(e.target.value)}
                    placeholder="e.g., Mathematics, Physics, History"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kb-description">Description</Label>
                  <Textarea
                    id="kb-description"
                    value={newKBDescription}
                    onChange={(e) => setNewKBDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional description of this knowledge base"
                  />
                </div>
                
                {/* Educational Criteria Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Educational Criteria
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="educational-board" className="text-sm font-medium text-gray-700">
                            Educational Board *
                          </Label>
                          <Select value={educationalBoard} onValueChange={setEducationalBoard}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select educational board" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IB">IB (International Baccalaureate)</SelectItem>
                              <SelectItem value="A-Levels">A-Levels</SelectItem>
                              <SelectItem value="AP">AP (Advanced Placement)</SelectItem>
                              <SelectItem value="SAT">SAT</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                              Subject *
                            </Label>
                            <Select value={subject} onValueChange={setSubject}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Mathematics">Mathematics</SelectItem>
                                <SelectItem value="Physics">Physics</SelectItem>
                                <SelectItem value="Chemistry">Chemistry</SelectItem>
                                <SelectItem value="Biology">Biology</SelectItem>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="History">History</SelectItem>
                                <SelectItem value="Geography">Geography</SelectItem>
                                <SelectItem value="Economics">Economics</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="level" className="text-sm font-medium text-gray-700">
                              Level *
                            </Label>
                            <Select value={level} onValueChange={setLevel}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HL">Higher Level (HL)</SelectItem>
                                <SelectItem value="SL">Standard Level (SL)</SelectItem>
                                <SelectItem value="A-Level">A-Level</SelectItem>
                                <SelectItem value="AP">AP</SelectItem>
                                <SelectItem value="Foundation">Foundation</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {uploadMode === 'existing' && (
              <div className="space-y-2">
                <Label htmlFor="kb-select">Select Knowledge Base *</Label>
                <Select value={selectedKBId} onValueChange={setSelectedKBId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeBases && knowledgeBases.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                resetFormFields();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || selectedFile.size > 15 * 1024 * 1024 || (uploadMode === 'new' && !newKBName) || (uploadMode === 'existing' && !selectedKBId)}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Knowledge Base
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{kbToDelete?.name}"? This action cannot be undone and will permanently remove all associated files and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKB}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;
