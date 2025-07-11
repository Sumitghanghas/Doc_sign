export interface TemplateVariable {
  name: string;
  required: boolean;
  showOnExcel: boolean;
}

export interface Document {
  id: string;
  name: string;
  filePath: string;
  uploadedAt: string;
  signedDate?: string;
  signStatus: number;
  data: Record<string, any>;
  rejectionReason: string;
}

export interface Request {
  id: string;
  title: string;
  documentCount: number;
  documents: Document[];
  status: string;
  templateVariables: TemplateVariable[];
  createdBy: string;
}