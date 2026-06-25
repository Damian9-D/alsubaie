import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './components/Button';
import {
  mergePdfs,
  imagesToPdfAdvanced,
  getPdfPageCount,
  splitPdf,
  extractPages,
  deletePages,
  compressPdf,
  pdfToImages
} from './services/pdfService';
import {
  OperationStatus,
  LogMessage,
  FileWithMeta,
  AppMode,
  AppSettings
} from './types';
import {
  FilePlus,
  Image as ImageIcon,
  XCircle,
  Loader2,
  Trash2,
  UploadCloud,
  FileText,
  GripVertical,
  CheckCircle2,
  Settings,
  Moon,
  Sun,
  LayoutGrid,
  Scissors,
  FileMinus,
  Maximize2,
  Image as ImageFile,
  Info,
  ChevronRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOGO_URL = 'https://files.catbox.moe/x5xxpr.png';

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  addPageNumbers: false,
  watermarkText: '',
  imageOrientation: 'p',
  pageSize: 'a4',
  imageQuality: 0.8,
  outputFilename: ''
};

const PDF_MODES: AppMode[] = [
  'MERGE',
  'SPLIT',
  'EXTRACT',
  'DELETE_PAGES',
  'COMPRESS',
  'PDF_TO_IMAGE'
];

const SINGLE_FILE_MODES: AppMode[] = [
  'SPLIT',
  'EXTRACT',
  'DELETE_PAGES',
  'COMPRESS',
  'PDF_TO_IMAGE'
];

const isPdfFile = (file: File) => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

const isImageFile = (file: File) => {
  return file.type.startsWith('image/');
};

const cleanFilename = (name: string) => {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  return cleaned || `ESE_RESULT_${Date.now()}`;
};

const SortableFileItem: React.FC<{
  fileMeta: FileWithMeta;
  onRemove: () => void;
  mode: AppMode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}> = ({
  fileMeta,
  onRemove,
  mode,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isSelected,
  onToggleSelect
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: fileMeta.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const isImageMode = mode === 'IMAGE_TO_PDF';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'p-2.5 px-3.5 rounded-xl border flex items-center justify-between group shadow-sm transition-all',
        isSelected
          ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden cursor-default flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 text-[#cc0000] focus:ring-[#cc0000] cursor-pointer shrink-0"
        />

        <div
          {...attributes}
          {...listeners}
          className="text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 shrink-0"
        >
          <GripVertical size={18} />
        </div>

        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            disabled={isFirst}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} className="-rotate-90" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            disabled={isLast}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} className="rotate-90" />
          </button>
        </div>

        <div
          className={cn(
            'p-2 rounded-lg shrink-0',
            isImageMode
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
              : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
          )}
        >
          {isImageMode ? <ImageIcon size={18} /> : <FileText size={18} />}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
            {fileMeta.file.name}
          </span>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold">
            <span>{(fileMeta.file.size / 1024 / 1024).toFixed(2)} MB</span>
            {fileMeta.pageCount !== undefined && <span>• {fileMeta.pageCount} صفحة</span>}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/10 shrink-0"
      >
        <XCircle size={18} />
      </button>
    </motion.div>
  );
};

const App: React.FC = () => {
  const [status, setStatus] = useState<OperationStatus>(OperationStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMeta[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<AppMode>('HOME');
  const [isDragging, setIsDragging] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [specificPagesInput, setSpecificPagesInput] = useState('');
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addLog = useCallback((text: string, type: 'info' | 'success' | 'error') => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        type,
        timestamp: new Date()
      },
      ...prev
    ]);
  }, []);

  useEffect(() => {
    const savedLogs = localStorage.getItem('ese_logs');
    const savedSettings = localStorage.getItem('ese_settings');

    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        setLogs(parsed.map((l: LogMessage) => ({ ...l, timestamp: new Date(l.timestamp) })));
      } catch {
        localStorage.removeItem('ese_logs');
      }
    }

    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        localStorage.removeItem('ese_settings');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ese_logs', JSON.stringify(logs.slice(0, 50)));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('ese_settings', JSON.stringify(settings));

    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const downloadBlob = (
    blob: Blob | Uint8Array,
    filename: string,
    type: string = 'application/pdf'
  ) => {
    const safeName = cleanFilename(filename);
    const finalBlob = blob instanceof Blob ? blob : new Blob([blob], { type });
    const url = URL.createObjectURL(finalBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetFilesForNewMode = (nextMode: AppMode) => {
    setMode(nextMode);
    setSelectedFiles([]);
    setSelectedIds(new Set());
    setSpecificPagesInput('');
    setStatus(OperationStatus.IDLE);
    setProgress(0);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelection = async (files: FileList | null) => {
    if (!files || mode === 'HOME') return;

    const incomingFiles = Array.from(files);

    let validFiles = incomingFiles.filter((file) => {
      if (mode === 'IMAGE_TO_PDF') return isImageFile(file);
      if (PDF_MODES.includes(mode)) return isPdfFile(file);
      return false;
    });

    if (validFiles.length === 0) {
      addLog(
        mode === 'IMAGE_TO_PDF'
          ? 'الرجاء اختيار صور فقط'
          : 'الرجاء اختيار ملفات PDF فقط',
        'error'
      );
      return;
    }

    if (SINGLE_FILE_MODES.includes(mode)) {
      if (selectedFiles.length >= 1) {
        addLog('هذه العملية تقبل ملف PDF واحد فقط. احذف الملف الحالي أولاً.', 'error');
        return;
      }

      validFiles = [validFiles[0]];

      if (incomingFiles.length > 1) {
        addLog('تم قبول أول ملف فقط لأن هذه العملية تعتمد على ملف واحد.', 'info');
      }
    }

    const uniqueFiles = validFiles.filter((file) => {
      const exists = selectedFiles.some(
        (f) => f.file.name === file.name && f.file.size === file.size
      );

      if (exists) {
        addLog(`الملف ${file.name} موجود مسبقاً في القائمة`, 'info');
      }

      return !exists;
    });

    if (uniqueFiles.length === 0) return;

    const newMetas: FileWithMeta[] = [];

    for (const file of uniqueFiles) {
      let pageCount: number | undefined;

      if (isPdfFile(file)) {
        try {
          pageCount = await getPdfPageCount(file);
        } catch {
          addLog(`تعذر قراءة عدد صفحات الملف: ${file.name}`, 'error');
        }
      }

      newMetas.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file,
        pageCount
      });
    }

    setSelectedFiles((prev) => [...prev, ...newMetas]);
    addLog(`تمت إضافة ${newMetas.length} ملف بنجاح`, 'info');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearFiles = (confirmClear: boolean = true) => {
    if (confirmClear && selectedFiles.length > 0) {
      if (!window.confirm('هل أنت متأكد من مسح جميع الملفات المختارة؟')) return;
    }

    setSelectedFiles([]);
    setSelectedIds(new Set());
    setSpecificPagesInput('');
    setStatus(OperationStatus.IDLE);
    setProgress(0);

    if (fileInputRef.current) fileInputRef.current.value = '';

    addLog('تم مسح قائمة الملفات', 'info');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSelectedFiles((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === selectedFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectedFiles.map((f) => f.id)));
    }
  };

  const moveSelectedUp = () => {
    if (selectedIds.size === 0) return;

    setSelectedFiles((prev) => {
      const newFiles = [...prev];

      for (let i = 1; i < newFiles.length; i++) {
        if (selectedIds.has(newFiles[i].id) && !selectedIds.has(newFiles[i - 1].id)) {
          [newFiles[i], newFiles[i - 1]] = [newFiles[i - 1], newFiles[i]];
        }
      }

      return newFiles;
    });
  };

  const moveSelectedDown = () => {
    if (selectedIds.size === 0) return;

    setSelectedFiles((prev) => {
      const newFiles = [...prev];

      for (let i = newFiles.length - 2; i >= 0; i--) {
        if (selectedIds.has(newFiles[i].id) && !selectedIds.has(newFiles[i + 1].id)) {
          [newFiles[i], newFiles[i + 1]] = [newFiles[i + 1], newFiles[i]];
        }
      }

      return newFiles;
    });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;

    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.size} ملف؟`)) return;

    setSelectedFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
  };

  const moveFileUp = (index: number) => {
    if (index === 0) return;

    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
  };

  const moveFileDown = (index: number) => {
    if (index === selectedFiles.length - 1) return;

    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      return newFiles;
    });
  };

  const parsePageNumbers = (input: string): number[] => {
    const pages: number[] = [];
    const parts = input.split(',');

    for (const part of parts) {
      const trimmed = part.trim();

      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));

        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i > 0) pages.push(i);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!Number.isNaN(num) && num > 0) pages.push(num);
      }
    }

    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const validateBeforeProcessing = () => {
    if (selectedFiles.length === 0) {
      throw new Error('يرجى اختيار ملف واحد على الأقل');
    }

    if (mode === 'MERGE' && selectedFiles.length < 2) {
      throw new Error('يجب اختيار ملفين PDF على الأقل للدمج');
    }

    if (SINGLE_FILE_MODES.includes(mode) && selectedFiles.length !== 1) {
      throw new Error('هذه العملية تتطلب ملف PDF واحد فقط');
    }

    if ((mode === 'EXTRACT' || mode === 'DELETE_PAGES') && !specificPagesInput.trim()) {
      throw new Error('يرجى تحديد أرقام الصفحات المطلوبة');
    }
  };

  const startProcessing = async () => {
    try {
      validateBeforeProcessing();

      setStatus(OperationStatus.PROCESSING);
      setProgress(10);

      addLog(`جاري بدء المعالجة: ${toolTitle(mode)}...`, 'info');

      const actualFiles = selectedFiles.map((f) => f.file);
      const baseFilename = cleanFilename(settings.outputFilename || `${mode}_${Date.now()}`);

      switch (mode) {
        case 'MERGE': {
          const merged = await mergePdfs(actualFiles, {
            addPageNumbers: settings.addPageNumbers,
            watermarkText: settings.watermarkText
          });

          setProgress(90);
          downloadBlob(merged, `${baseFilename}.pdf`);
          break;
        }

        case 'IMAGE_TO_PDF': {
          const pdfBlob = await imagesToPdfAdvanced(actualFiles, {
            orientation: settings.imageOrientation,
            format: settings.pageSize,
            quality: settings.imageQuality,
            addPageNumbers: settings.addPageNumbers
          });

          setProgress(90);
          downloadBlob(pdfBlob, `${baseFilename}.pdf`);
          break;
        }

        case 'SPLIT': {
          const splitResults = await splitPdf(actualFiles[0]);

          setProgress(90);

          splitResults.forEach((pdf, idx) => {
            downloadBlob(pdf, `${baseFilename}_page_${idx + 1}.pdf`);
          });

          break;
        }

        case 'EXTRACT': {
          const pages = parsePageNumbers(specificPagesInput);

          if (pages.length === 0) {
            throw new Error('يرجى إدخال أرقام صفحات صحيحة مثل: 1, 3, 5-7');
          }

          const pageCount = selectedFiles[0].pageCount;

          if (pageCount && pages.some((p) => p > pageCount)) {
            throw new Error(`يوجد رقم صفحة أكبر من عدد صفحات الملف. عدد الصفحات: ${pageCount}`);
          }

          const extracted = await extractPages(actualFiles[0], pages);

          setProgress(90);
          downloadBlob(extracted, `${baseFilename}_extracted.pdf`);
          break;
        }

        case 'DELETE_PAGES': {
          const pagesToDelete = parsePageNumbers(specificPagesInput);

          if (pagesToDelete.length === 0) {
            throw new Error('يرجى إدخال أرقام صفحات صحيحة للحذف مثل: 1, 3, 5-7');
          }

          const pageCount = selectedFiles[0].pageCount;

          if (pageCount && pagesToDelete.some((p) => p > pageCount)) {
            throw new Error(`يوجد رقم صفحة أكبر من عدد صفحات الملف. عدد الصفحات: ${pageCount}`);
          }

          if (pageCount && pagesToDelete.length >= pageCount) {
            throw new Error('لا يمكن حذف جميع الصفحات. يجب أن تبقى صفحة واحدة على الأقل');
          }

          const updatedPdf = await deletePages(actualFiles[0], pagesToDelete);

          setProgress(90);
          downloadBlob(updatedPdf, `${baseFilename}_pages_removed.pdf`);
          break;
        }

        case 'COMPRESS': {
          const compressed = await compressPdf(actualFiles[0], { level: compressionLevel });

          setProgress(90);
          downloadBlob(compressed, `${baseFilename}.pdf`);
          break;
        }

        case 'PDF_TO_IMAGE': {
          const images = await pdfToImages(actualFiles[0]);

          if (!images.length) {
            throw new Error('لم يتم توليد صور من ملف PDF');
          }

          setProgress(90);

          images.forEach((img, idx) => {
            const byteString = atob(img.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);

            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }

            downloadBlob(ia, `${baseFilename}_page_${idx + 1}.jpg`, 'image/jpeg');
          });

          break;
        }

        default:
          throw new Error('يرجى اختيار عملية صحيحة');
      }

      setProgress(100);
      setStatus(OperationStatus.SUCCESS);
      addLog(`تمت العملية بنجاح. اسم الملف: ${baseFilename}`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(OperationStatus.ERROR);
      addLog(error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء المعالجة', 'error');
    } finally {
      setTimeout(() => {
        setProgress(0);
        setStatus(OperationStatus.IDLE);
      }, 2000);
    }
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.file.size, 0);

  const renderToolIcon = (toolMode: AppMode) => {
    switch (toolMode) {
      case 'MERGE':
        return <FilePlus size={32} />;
      case 'IMAGE_TO_PDF':
        return <ImageIcon size={32} />;
      case 'SPLIT':
        return <Scissors size={32} />;
      case 'EXTRACT':
        return <CheckCircle2 size={32} />;
      case 'DELETE_PAGES':
        return <FileMinus size={32} />;
      case 'COMPRESS':
        return <Maximize2 size={32} />;
      case 'PDF_TO_IMAGE':
        return <ImageFile size={32} />;
      default:
        return <FileText size={32} />;
    }
  };

  const toolTitle = (toolMode: AppMode) => {
    switch (toolMode) {
      case 'MERGE':
        return 'دمج ملفات PDF';
      case 'IMAGE_TO_PDF':
        return 'صور إلى PDF';
      case 'SPLIT':
        return 'تقسيم PDF';
      case 'EXTRACT':
        return 'استخراج صفحات';
      case 'DELETE_PAGES':
        return 'حذف صفحات';
      case 'COMPRESS':
        return 'ضغط PDF';
      case 'PDF_TO_IMAGE':
        return 'PDF إلى صور';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300 font-['Cairo'] flex flex-col",
        settings.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800'
      )}
      dir="rtl"
    >
      <header className="bg-[#1e293b] text-white py-4 px-6 relative shadow-md z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.img
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              src={LOGO_URL}
              alt="شعار قوات الطوارئ الخاصة"
              className="w-14 h-14 md:w-16 md:h-16 object-contain filter drop-shadow-xl"
            />

            <div className="text-right">
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-snug">
                قوات الطوارئ الخاصة
              </h1>
              <h2 className="text-slate-300 text-xs md:text-sm font-medium opacity-90">
                إسم المطور: حمود محمد السبيعي
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 px-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <Info size={16} />
              <span>مساعدة</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
              title="الإعدادات"
            >
              <Settings size={16} />
            </button>

            <button
              onClick={() => setSettings((s) => ({ ...s, darkMode: !s.darkMode }))}
              className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
              title="الوضع الداكن"
            >
              {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-slate-400 text-[9px] text-center hidden md:block leading-tight">
              <div className="font-bold text-slate-300">سيلفر الرقمي</div>
              <div>v2.0.1</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
          <div className="h-full bg-[#cc0000] flex-1" />
          <div className="h-full bg-white flex-1" />
          <div className="h-full bg-[#cc0000] flex-1" />
        </div>
      </header>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <XCircle size={20} />
              </button>

              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <Settings size={20} className="text-slate-500" /> الإعدادات العامة
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-150 dark:border-slate-800/80">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">ترقيم الصفحات</p>
                    <p className="text-[11px] text-slate-500">إضافة رقم الصفحة تلقائياً بالأسفل</p>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.addPageNumbers}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, addPageNumbers: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#cc0000] focus:ring-[#cc0000] cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">الختم المائي (Watermark)</p>
                  <input
                    type="text"
                    placeholder="مثال: قوات الطوارئ الخاصة"
                    value={settings.watermarkText}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, watermarkText: e.target.value }))
                    }
                    className="w-full p-2.5 px-3 bg-white dark:bg-slate-900 rounded-lg text-sm border border-slate-200 dark:border-slate-800 focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] outline-none text-slate-800 dark:text-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">اتجاه الصفحة</p>
                    <select
                      value={settings.imageOrientation}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          imageOrientation: e.target.value as AppSettings['imageOrientation']
                        }))
                      }
                      className="w-full p-2.5 px-3 bg-white dark:bg-slate-900 rounded-lg text-sm border border-slate-200 dark:border-slate-800 focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] outline-none text-slate-800 dark:text-white transition-all cursor-pointer"
                    >
                      <option value="p">عمودي (Portrait)</option>
                      <option value="l">أفقي (Landscape)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">جودة الصور</p>
                    <div className="flex items-center gap-2 h-[42px] px-1">
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={settings.imageQuality}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, imageQuality: parseFloat(e.target.value) }))
                        }
                        className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer accent-[#cc0000]"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-8 text-left">
                        {Math.round(settings.imageQuality * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">اسم الملف النهائي</p>
                  <input
                    type="text"
                    placeholder="اتركه فارغاً للتسمية التلقائية"
                    value={settings.outputFilename}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, outputFilename: e.target.value }))
                    }
                    className="w-full p-2.5 px-3 bg-white dark:bg-slate-900 rounded-lg text-sm border border-slate-200 dark:border-slate-800 focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] outline-none text-slate-800 dark:text-white transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-[#cc0000] dark:hover:bg-[#cc0000] text-white font-bold rounded-lg text-sm transition-colors"
              >
                حفظ وإغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, x: 0 }}
              animate={{ scale: 1, x: 0 }}
              exit={{ scale: 0.95, x: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <XCircle size={20} />
              </button>

              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <Info className="text-blue-600" size={22} /> دليل الاستخدام
              </h3>

              <div className="space-y-4 text-slate-700 dark:text-slate-200 leading-relaxed text-sm font-medium">
                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">الأمان والخصوصية</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    جميع العمليات تتم داخل جهازك فقط ولا يتم رفع الملفات لأي خادم.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">الدمج والترتيب</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    اختر ملفات PDF، ثم رتبها بالسحب والإفلات، وبعد ذلك اضغط بدء المعالجة.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">الصفحات المحددة</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    عند الاستخراج أو الحذف استخدم الصيغة التالية: 1, 3, 5-7.
                  </p>
                </section>

                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-r-4 border-blue-600 rounded-lg text-sm text-blue-900 dark:text-blue-300 font-bold">
                  يتم حفظ الملفات في مجلد التنزيلات حسب إعدادات المتصفح.
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-[#cc0000] text-white font-bold rounded-lg text-sm transition-colors"
              >
                أفهم ذلك
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        {mode === 'HOME' ? (
          <div className="flex flex-col gap-8 py-4">
            <div className="text-center space-y-2">
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base font-bold max-w-xl mx-auto leading-relaxed">
                معالجة ملفات PDF والصور محلياً بسرعة وخصوصية عالية.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { id: 'MERGE', title: 'دمج PDF', icon: <FilePlus size={22} />, desc: 'جمع عدة ملفات' },
                { id: 'IMAGE_TO_PDF', title: 'صور إلى PDF', icon: <ImageIcon size={22} />, desc: 'تحويل الصور' },
                { id: 'SPLIT', title: 'تقسيم PDF', icon: <Scissors size={22} />, desc: 'صفحات منفصلة' },
                { id: 'EXTRACT', title: 'استخراج', icon: <CheckCircle2 size={22} />, desc: 'صفحات محددة' },
                { id: 'DELETE_PAGES', title: 'حذف صفحات', icon: <FileMinus size={22} />, desc: 'إزالة صفحات' },
                { id: 'COMPRESS', title: 'ضغط الحجم', icon: <Maximize2 size={22} />, desc: 'تقليل الحجم' },
                { id: 'PDF_TO_IMAGE', title: 'PDF إلى صور', icon: <ImageFile size={22} />, desc: 'تحويل الصفحات' },
                { id: 'SETTINGS', title: 'الإعدادات', icon: <Settings size={22} />, desc: 'تخصيص النظام' }
              ].map((tool) => (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    tool.id === 'SETTINGS'
                      ? setShowSettings(true)
                      : resetFilesForNewMode(tool.id as AppMode)
                  }
                  className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col items-center gap-3 text-center group"
                >
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 md:p-3.5 rounded-lg text-slate-700 dark:text-slate-300 group-hover:bg-[#cc0000] group-hover:text-white transition-all shadow-sm">
                    {tool.icon}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm md:text-base text-slate-800 dark:text-white">
                      {tool.title}
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide font-medium">
                      {tool.desc}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>


          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectedFiles.length > 0) {
                      if (!window.confirm('العودة للرئيسية ستلغي قائمة الملفات الحالية. هل أنت متأكد؟')) return;
                    }

                    resetFilesForNewMode('HOME');
                  }}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm text-slate-700 dark:text-slate-300"
                >
                  <ChevronRight size={16} className="rotate-180" />
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="bg-[#cc0000] text-white p-2 rounded-lg shadow-lg shadow-red-500/10">
                    {renderToolIcon(mode)}
                  </div>

                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white leading-none">
                      {toolTitle(mode)}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      تحضير الملفات المطلوبة للمعالجة
                    </p>
                  </div>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="bg-white dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-3 text-xs shadow-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-[9px] font-bold">عدد الملفات</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedFiles.length}</span>
                  </div>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />

                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-[9px] font-bold">الحجم الكلي</span>
                    <span className="font-bold text-slate-800 dark:text-white">{(totalSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
              )}
            </div>

            {(mode === 'EXTRACT' || mode === 'DELETE_PAGES') && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50/50 dark:bg-blue-950/15 p-4 rounded-xl border border-blue-100/60 dark:border-blue-950/40 flex flex-col md:flex-row gap-4 items-center"
              >
                <div className="bg-blue-500 text-white p-2.5 rounded-xl shrink-0">
                  <LayoutGrid size={20} />
                </div>

                <div className="flex-1 space-y-1.5 w-full">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300 px-1">
                    تحديد الصفحات المراد {mode === 'EXTRACT' ? 'استخراجها' : 'حذفها'}
                  </p>

                  <input
                    type="text"
                    placeholder="مثال: 1, 3, 5-7"
                    value={specificPagesInput}
                    onChange={(e) => setSpecificPagesInput(e.target.value)}
                    className="w-full p-2.5 px-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] outline-none text-sm placeholder:text-slate-400/85 text-slate-800 dark:text-white transition-all"
                  />
                </div>
              </motion.div>
            )}

            {mode === 'COMPRESS' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50/20 dark:bg-red-950/5 p-4 rounded-xl border border-red-100/40 dark:border-red-950/25 flex flex-col gap-3.5 w-full"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-[#cc0000] text-white p-2.5 rounded-xl shrink-0">
                    <Maximize2 size={20} className="rotate-180" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                      تحديد مستوى ضغط الملف
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      اختر مستوى الضغط المطلوب لحجم وجودة الملف النهائي. يقوم نظام الضغط الذكي بتقليص الصور والمحتويات لتقليل الحجم بشكل ملموس وفعّال.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mt-1">
                  {[
                    { id: 'low', title: 'ضغط منخفض', desc: 'جودة ممتازة', color: 'border-green-200 dark:border-green-900/30' },
                    { id: 'medium', title: 'ضغط متوازن', desc: 'جودة متوازنة', color: 'border-amber-200 dark:border-amber-900/30' },
                    { id: 'high', title: 'ضغط مرتفع', desc: 'أصغر حجم ممكن', color: 'border-red-200 dark:border-red-900/30' },
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setCompressionLevel(level.id as 'low' | 'medium' | 'high')}
                      className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1',
                        compressionLevel === level.id
                          ? 'bg-[#cc0000] border-[#cc0000] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <span className="text-xs font-black">{level.title}</span>
                      <span className={cn(
                        'text-[9px] font-bold opacity-80',
                        compressionLevel === level.id ? 'text-red-100' : 'text-slate-400 dark:text-slate-500'
                      )}>
                        {level.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {!(SINGLE_FILE_MODES.includes(mode) && selectedFiles.length >= 1) && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelection(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer group bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 hover:border-[#cc0000] dark:hover:border-[#cc0000]',
                  isDragging
                    ? 'border-[#cc0000] bg-red-50/30 dark:bg-red-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                )}
              >
                <input
                  type="file"
                  multiple={!SINGLE_FILE_MODES.includes(mode)}
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileSelection(e.target.files)}
                  accept={mode === 'IMAGE_TO_PDF' ? 'image/*' : '.pdf,application/pdf'}
                />

                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-full text-slate-400 group-hover:scale-105 group-hover:text-[#cc0000] transition-all duration-300">
                  <UploadCloud size={40} strokeWidth={1.5} />
                </div>

                <div className="text-center space-y-1 text-slate-800 dark:text-white">
                  <p className="text-lg font-bold">سحب وإفلات الملفات هنا</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    أو انقر لتصفح ملفات جهازك
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-850 rounded-md text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-800">
                    {mode === 'IMAGE_TO_PDF' ? 'JPG, PNG, WEBP' : 'PDF فقط'}
                  </span>

                  <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-850 rounded-md text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-800">
                    {SINGLE_FILE_MODES.includes(mode) ? 'ملف واحد فقط' : 'عدة ملفات'}
                  </span>
                </div>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between px-1 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === selectedFiles.length && selectedFiles.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#cc0000] focus:ring-[#cc0000] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        تحديد الكل
                      </span>
                    </label>

                    <h4 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                      قائمة المعالجة
                      <span className="bg-[#cc0000] text-white px-2 py-0.5 rounded-md text-xs font-bold">
                        {selectedFiles.length}
                      </span>
                    </h4>
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                      <button
                        onClick={moveSelectedUp}
                        className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md hover:bg-slate-150 hover:text-[#cc0000] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-150 dark:border-slate-800"
                        title="نقل لأعلى"
                      >
                        <ChevronRight size={16} className="-rotate-90" />
                      </button>

                      <button
                        onClick={moveSelectedDown}
                        className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md hover:bg-slate-150 hover:text-[#cc0000] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-150 dark:border-slate-800"
                        title="نقل لأسفل"
                      >
                        <ChevronRight size={16} className="rotate-90" />
                      </button>

                      <button
                        onClick={deleteSelected}
                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-100 dark:border-red-900/30"
                      >
                        <Trash2 size={14} /> حذف ({selectedIds.size})
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => clearFiles()}
                    className="text-red-600 dark:text-red-400 text-xs font-bold hover:underline flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/10 transition-all"
                  >
                    <Trash2 size={14} /> إفراغ القائمة
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-inner min-h-[250px] max-h-[50vh] overflow-y-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={selectedFiles.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence>
                          {selectedFiles.map((fileMeta, index) => (
                            <SortableFileItem
                              key={fileMeta.id}
                              fileMeta={fileMeta}
                              onRemove={() => removeFile(fileMeta.id)}
                              mode={mode}
                              onMoveUp={() => moveFileUp(index)}
                              onMoveDown={() => moveFileDown(index)}
                              isFirst={index === 0}
                              isLast={index === selectedFiles.length - 1}
                              isSelected={selectedIds.has(fileMeta.id)}
                              onToggleSelect={() => toggleSelect(fileMeta.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                <div className="mt-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                        اسم الملف النهائي
                      </label>

                      <input
                        type="text"
                        placeholder="اتركه فارغاً للتسمية التلقائية"
                        value={settings.outputFilename}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, outputFilename: e.target.value }))
                        }
                        className="w-full p-2.5 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-750 outline-none focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] text-sm text-slate-800 dark:text-white font-medium"
                      />
                    </div>

                    <Button
                      onClick={startProcessing}
                      disabled={status === OperationStatus.PROCESSING || selectedFiles.length === 0}
                      className="w-full md:w-auto px-6 py-2.5 text-base font-bold rounded-lg bg-[#cc0000] hover:bg-red-700 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      icon={
                        status === OperationStatus.PROCESSING ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <div className="bg-white/10 p-1 rounded-md">
                            <Download size={18} />
                          </div>
                        )
                      }
                    >
                      {status === OperationStatus.PROCESSING ? 'جاري التنفيذ...' : 'بدء المعالجة'}
                    </Button>
                  </div>

                  {status === OperationStatus.PROCESSING && (
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-[#cc0000] uppercase tracking-widest animate-pulse">
                          Processing Files...
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
                      </div>

                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-red-600 to-[#cc0000] shadow-[0_0_20px_rgba(204,0,0,0.4)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>


    </div>
  );
};

export default App;