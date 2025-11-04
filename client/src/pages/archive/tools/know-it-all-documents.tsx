/**
 * Know-it-all 知識文件管理頁面
 * 上傳、管理知識庫文件
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Upload,
  FileText,
  Edit,
  Trash2,
  Plus,
  Link as LinkIcon,
  Search,
  BookOpen,
  Lock,
  File,
  Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReportsLayout from '../../reports-layout';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  sourceType: 'file' | 'url' | 'text';
  sourceFileName?: string;
  sourceUrl?: string;
  sourceFileSize?: number;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

type UploadMode = 'file' | 'url' | 'text';

export default function KnowItAllDocumentsPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 上傳表單狀態
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [category, setCategory] = useState('');

  // 查看/編輯狀態
  const [viewingDocument, setViewingDocument] = useState<KnowledgeDocument | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<KnowledgeDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (hasAccess) {
      loadDocuments();
    }
  }, [hasAccess]);

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/know-it-all/check-access');
      const result = await response.json();
      setHasAccess(result.hasAccess);
    } catch (error) {
      console.error('Check access error:', error);
      setHasAccess(false);
    }
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/know-it-all/documents');
      if (!response.ok) throw new Error('載入文件失敗');

      const result = await response.json();
      setDocuments(result.data.documents);
    } catch (error: any) {
      console.error('Load documents error:', error);
      toast({
        title: '❌ 載入文件失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: '❌ 請選擇檔案',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    const results = {
      success: 0,
      failed: 0,
      total: selectedFiles.length,
    };

    try {
      // 逐個上傳檔案
      for (const file of selectedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (category) formData.append('category', category);

          const response = await fetch('/api/know-it-all/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            results.success++;
          } else {
            results.failed++;
            console.error(`Failed to upload ${file.name}`);
          }
        } catch (error) {
          results.failed++;
          console.error(`Error uploading ${file.name}:`, error);
        }
      }

      // 顯示結果
      if (results.success > 0) {
        toast({
          title: `✅ 上傳完成`,
          description: `成功：${results.success} 個檔案${results.failed > 0 ? `，失敗：${results.failed} 個` : ''}`,
        });
      } else {
        toast({
          title: '❌ 上傳失敗',
          description: '所有檔案上傳失敗',
          variant: 'destructive',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      console.error('File upload error:', error);
      toast({
        title: '❌ 上傳失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      toast({
        title: '❌ 請輸入 URL',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/know-it-all/documents/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          category: category || undefined,
        }),
      });

      if (!response.ok) throw new Error('匯入失敗');

      const result = await response.json();

      toast({
        title: '✅ URL 匯入成功',
        description: `已新增文件：${result.data.title}`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      console.error('URL import error:', error);
      toast({
        title: '❌ 匯入失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextCreate = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      toast({
        title: '❌ 請填寫標題與內容',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/know-it-all/documents/from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle.trim(),
          content: textContent.trim(),
          category: category || undefined,
        }),
      });

      if (!response.ok) throw new Error('建立失敗');

      const result = await response.json();

      toast({
        title: '✅ 文件建立成功',
        description: `已新增文件：${result.data.title}`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      console.error('Text create error:', error);
      toast({
        title: '❌ 建立失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (documentId: string) => {
    try {
      const response = await fetch(`/api/know-it-all/documents/${documentId}`);
      if (!response.ok) throw new Error('載入文件失敗');

      const result = await response.json();
      setViewingDocument(result.data);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        title: '❌ 載入失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (documentId: string) => {
    try {
      const response = await fetch(`/api/know-it-all/documents/${documentId}`);
      if (!response.ok) throw new Error('載入文件失敗');

      const result = await response.json();
      const doc = result.data;

      setEditingDocument(doc);
      setEditTitle(doc.title);
      setEditContent(doc.content);
      setEditCategory(doc.category || '');
      setEditTags(doc.tags || []);
      setIsEditDialogOpen(true);
    } catch (error: any) {
      console.error('Load for edit error:', error);
      toast({
        title: '❌ 載入失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    try {
      const response = await fetch(`/api/know-it-all/documents/${editingDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          category: editCategory || undefined,
          tags: editTags,
        }),
      });

      if (!response.ok) throw new Error('更新失敗');

      const result = await response.json();

      toast({
        title: '✅ 文件已更新',
        description: `已更新：${result.data.title}`,
      });

      setIsEditDialogOpen(false);
      setEditingDocument(null);
      loadDocuments();
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: '❌ 更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`確定要刪除文件「${title}」嗎？`)) return;

    try {
      const response = await fetch(`/api/know-it-all/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('刪除失敗');

      toast({
        title: '✅ 文件已刪除',
      });

      loadDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: '❌ 刪除失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/know-it-all/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          limit: 50,
        }),
      });

      if (!response.ok) throw new Error('搜尋失敗');

      const result = await response.json();
      setDocuments(result.data.results);

      toast({
        title: `🔍 找到 ${result.data.results.length} 個相關文件`,
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: '❌ 搜尋失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setUrlInput('');
    setTextTitle('');
    setTextContent('');
    setCategory('');
  };

  const handleUpload = () => {
    if (uploadMode === 'file') {
      handleFileUpload();
    } else if (uploadMode === 'url') {
      handleUrlImport();
    } else {
      handleTextCreate();
    }
  };

  // 無存取權限
  if (hasAccess === false) {
    return (
      <ReportsLayout title="Know-it-all 知識文件">
        <div className="flex items-center justify-center h-[70vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Lock className="h-5 w-5" />
                無存取權限
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                抱歉，您目前沒有權限使用 Know-it-all AI 系統。
              </p>
            </CardContent>
          </Card>
        </div>
      </ReportsLayout>
    );
  }

  // 載入中
  if (hasAccess === null) {
    return (
      <ReportsLayout title="Know-it-all 知識文件">
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout title="Know-it-all 知識文件">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              知識文件管理
            </h1>
            <p className="text-muted-foreground mt-1">
              上傳文件、管理知識庫，讓 AI 學習您的專業知識
            </p>
          </div>

          {/* 新增文件按鈕 */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                新增文件
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增知識文件</DialogTitle>
                <DialogDescription>
                  支援上傳檔案、匯入 URL 或直接輸入文字
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* 上傳模式選擇 */}
                <div className="flex gap-2">
                  <Button
                    variant={uploadMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('file')}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    上傳檔案
                  </Button>
                  <Button
                    variant={uploadMode === 'url' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('url')}
                    className="flex-1"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    匯入 URL
                  </Button>
                  <Button
                    variant={uploadMode === 'text' ? 'default' : 'outline'}
                    onClick={() => setUploadMode('text')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    純文字
                  </Button>
                </div>

                {/* 檔案上傳 */}
                {uploadMode === 'file' && (
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('file-input')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-primary', 'bg-muted');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary', 'bg-muted');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary', 'bg-muted');
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          setSelectedFiles(files);
                        }
                      }}
                    >
                      <input
                        id="file-input"
                        type="file"
                        accept=".pdf,.docx,.md,.txt"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          setSelectedFiles(files);
                        }}
                        className="hidden"
                      />
                      {selectedFiles.length > 0 ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="bg-background border border-border p-3 rounded-lg flex items-center gap-3">
                                <File className="h-6 w-6 text-primary flex-shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                  <p className="font-medium truncate">{file.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('file-input')?.click();
                              }}
                            >
                              新增更多檔案
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFiles([]);
                              }}
                            >
                              清空全部
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">拖曳檔案到此處</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              或點擊選擇檔案（可選擇多個）
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            支援：PDF、Word (.docx)、Markdown (.md)、Text (.txt)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* URL 匯入 */}
                {uploadMode === 'url' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">URL 網址</label>
                      <Input
                        placeholder="https://example.com/article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        系統會自動爬取網頁內容並建立文件
                      </p>
                    </div>
                  </div>
                )}

                {/* 純文字輸入 */}
                {uploadMode === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">文件標題</label>
                      <Input
                        placeholder="例如：產品使用指南"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">文件內容</label>
                      <Textarea
                        placeholder="輸入文件內容..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        className="mt-1"
                        rows={10}
                      />
                    </div>
                  </div>
                )}

                {/* 提交按鈕 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isUploading}
                  >
                    取消
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        處理中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        上傳
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜尋列 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="語意搜尋文件內容... (Enter 搜尋)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                搜尋
              </Button>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    loadDocuments();
                  }}
                >
                  清除
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 文件列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>文件列表 ({documents.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">尚無文件</p>
                <p className="text-sm mt-2">點擊「新增文件」開始建立知識庫</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>標題</TableHead>
                    <TableHead>分類</TableHead>
                    <TableHead>建立時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium max-w-md">
                        <div className="flex items-start gap-2">
                          {doc.sourceType === 'file' && <File className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                          {doc.sourceType === 'url' && <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                          {doc.sourceType === 'text' && <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.content.slice(0, 100)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.category && (
                          <span className="bg-muted px-2 py-1 rounded text-xs">
                            {doc.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString('zh-TW')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc.id)}
                            title="查看詳情"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc.id)}
                            title="編輯"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id, doc.title)}
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 查看詳情對話框 */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>文件詳情</DialogTitle>
            </DialogHeader>
            {viewingDocument && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">標題</label>
                  <p className="text-lg font-semibold mt-1">{viewingDocument.title}</p>
                </div>

                {viewingDocument.category && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">分類</label>
                    <p className="mt-1">
                      <span className="bg-muted px-2 py-1 rounded text-sm">
                        {viewingDocument.category}
                      </span>
                    </p>
                  </div>
                )}

                {viewingDocument.tags && viewingDocument.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">標籤</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {viewingDocument.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">來源類型</label>
                  <p className="mt-1 text-sm">
                    {viewingDocument.sourceType === 'file' && '檔案上傳'}
                    {viewingDocument.sourceType === 'url' && 'URL 匯入'}
                    {viewingDocument.sourceType === 'text' && '純文字輸入'}
                  </p>
                </div>

                {viewingDocument.sourceFileName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">檔案名稱</label>
                    <p className="mt-1 text-sm">{viewingDocument.sourceFileName}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">建立時間</label>
                  <p className="mt-1 text-sm">
                    {new Date(viewingDocument.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">內容</label>
                  <div className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {viewingDocument.content}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 編輯對話框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>編輯文件</DialogTitle>
              <DialogDescription>修改文件標題、內容和分類</DialogDescription>
            </DialogHeader>
            {editingDocument && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">標題</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">內容</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mt-1 font-mono"
                    rows={15}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">分類（選填）</label>
                  <Input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="例如：產品文件、教學資料"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingDocument(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    儲存變更
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ReportsLayout>
  );
}
