export interface Request {
    id: string;
    title: string;
    documentCount: number;
    rejectedCount: number;
    createdAt: string;
    status: string;
    rawStatus: number;
    createdBy: string;
    rejectionReason?: string;
  }
  
  export interface Officer {
    id: string;
    name: string;
  }
  
  export interface Signature {
    id: string;
    name: string;
    url: string;
    createdAt: string;
  }