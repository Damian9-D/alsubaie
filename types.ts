export enum OperationStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
  timestamp: Date;
}

export interface FileWithMeta {
  id: string;
  file: File;
  pageCount?: number;
  previewUrl?: string;
}

export type AppMode = 
  | 'MERGE' 
  | 'IMAGE_TO_PDF' 
  | 'SPLIT' 
  | 'EXTRACT' 
  | 'DELETE_PAGES' 
  | 'COMPRESS' 
  | 'PDF_TO_IMAGE' 
  | 'HOME';

export interface AppSettings {
  darkMode: boolean;
  addPageNumbers: boolean;
  watermarkText: string;
  imageOrientation: 'p' | 'l';
  pageSize: string;
  imageQuality: number;
  outputFilename: string;
}
