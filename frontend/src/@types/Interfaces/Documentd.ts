export interface Documentdata {
    documentId: string;
    templateName: string;
    description: string;
    data: Record<string, any>;
    signedDate?: string;
  }