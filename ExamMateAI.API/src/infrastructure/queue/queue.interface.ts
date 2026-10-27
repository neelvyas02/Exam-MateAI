export interface DocumentProcessingJobData {
  documentId: string;
  userId: string;
  documentType: string;
}

export interface IJobQueue {
  addDocumentJob(data: DocumentProcessingJobData): Promise<string>;
  close(): Promise<void>;
}
