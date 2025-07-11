import { z } from 'zod';
import { Client } from './abstract';
import { signStatus, signStatusDisplay } from '../libs/constants';

export const documentSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  filePath: z.string().optional(),
  uploadedAt: z.string().optional(),
  signedDate: z.string().optional(),
  signStatus: z.number().optional(),
  rejectionReason: z.string().optional(),
  qrCodePath: z.string().optional(),
  data: z.record(z.any()).optional(),
});

export const templateVariablesSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  showOnExcel: z.boolean(),
});

export const requestSchema = z.object({
   id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  documentCount: z.number(),
  rejectedCount: z.number(),
  createdAt: z.string(),
  createdBy: z.string(),
  status: z.number()
    .optional()
    .transform((val) =>
      typeof val === 'number' ? signStatusDisplay[val as signStatus] : signStatusDisplay[signStatus.unsigned]
    ),
  rejectionReason: z.string().optional(),
  templateVariables: z.array(templateVariablesSchema).optional(),
  documents: z.array(documentSchema).optional(),
});

export const documentDataSchema = z.object({ 
  documentId: z.string(),
  templateName: z.string(),
  description: z.string(),
  data: z.record(z.any()),
  signedDate: z.string().optional(),
  signedPath: z.string().optional(),
  qrCodePath: z.string().optional(),
});

export const pdfResponseSchema = z.object({
  pdf: z.string(),
});

export const officerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const signatureSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

export class RequestClient extends Client {
  constructor(url: string) {
    super(url);
  }

  async getRequests() {
    try {
      const res = await this.request('GET', '/api/templates');
      const body = z.array(requestSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getRequests parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getRequests error:', error);
      throw error;
    }
  }

  async getRequest(id: string) {
    try {
      const res = await this.request('GET', `/api/templates/${id}`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('getRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('getRequest error:', error);
      throw error;
    }
  }

  async getDocumentData(documentId: string) {
    try {
      const res = await this.request('GET', `/templates/documents/${documentId}`);
      const parsedData = documentDataSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('getDocumentData parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('getDocumentData error:', error);
      throw error;
    }
  }

  async getOfficers() {
    try {
      const res = await this.request('GET', '/api/users/officers');
      const body = z.array(officerSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getOfficers parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getOfficers error:', error);
      throw error;
    }
  }

  async createRequest(data: { title: string; description: string; templateFile: File }) {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('templateFile', data.templateFile);

      console.log('Sending createRequest with:', {
        title: data.title,
        description: data.description,
        templateFile: {
          name: data.templateFile.name,
          type: data.templateFile.type,
          size: data.templateFile.size,
        },
      });

      const res = await this.request('POST', '/api/templates', {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });


      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('createRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('createRequest error:', error);
      throw error;
    }
  }

  async getRequestPdf(id: string) {
    const res = await this.request('GET', `/templates/${id}/pdf`);
    const parsed = pdfResponseSchema.safeParse(res?.data);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      throw new Error('Invalid PDF data from backend');
    }
    return parsed.data;
  }

  async uploadDocuments(id: string, files: File[], dataEntries?: any[]) {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));

      if (dataEntries) {
        formData.append('dataEntries', JSON.stringify(dataEntries));
      }
      console.log('Sending uploadDocuments with:', { id, files: files.map((f) => f.name), dataEntries });

      const res = await this.request('POST', `/templates/${id}/documents`, {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('uploadDocuments response:', res.data);
      const parsed = requestSchema.safeParse(res.data);
      if (!parsed.success) {
        console.error('uploadDocuments parse error:', parsed.error);
        throw new Error('Invalid data from backend');
      }
    } catch (error) {
      console.error('uploadDocuments error:', error);
      throw error;
    }
  }

  async deleteDocument(id: string, documentId: string) {
    try {
      const res = await this.request('DELETE', `/templates/${id}/documents/${documentId}`);
      console.log('deleteDocument response:', res.data);
    } catch (error) {
      console.error('deleteDocument error:', error);
      throw error;
    }
  }

  async sendForSignature(requestId: string, data: { officerId: string }) {
    try {
      const res = await this.request('POST', `/signatures/${requestId}/send`, {
        data,
      });
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('sendForSignature parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('sendForSignature error:', error);
      throw error;
    }
  }

  async cloneRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/templates/${requestId}/clone`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('cloneRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('cloneRequest error:', error);
      throw error;
    }
  }

  async deleteRequest(requestId: string) {
    try {
      await this.request('DELETE', `/templates/${requestId}`);
    } catch (error) {
      console.error('deleteRequest error:', error);
      throw error;
    }
  }

  async signRequest(requestId: string, signatureId?: string) {
    try {
      const formData = new FormData();
      if (signatureId) {
        formData.append('signatureId', signatureId);
      }

      console.log('Sending signRequest with:', { requestId, signatureId });
      const res = await this.request('POST', `/signatures/${requestId}/sign`, {
        data: formData,
        headers: {},
      });

      return res;
    } catch (error) {
      console.error('signRequest error:', error);
      throw error;
    }
  }

  async uploadSignature(signatureFile: File) {
    try {
      const formData = new FormData();
      formData.append('signatureFile', signatureFile);

      const res = await this.request('POST', '/api/signatures', {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const parsedData = signatureSchema.safeParse(res.data);
      if (!parsedData.success) {
        console.error('uploadSignature parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }

      return parsedData.data;
    } catch (error) {
      console.error('uploadSignature error:', error);
      throw error;
    }
  }

  async getSignatures() {
    try {
      const res = await this.request('GET', '/api/signatures');
      const body = z.array(signatureSchema).safeParse(res.data);
      if (!body.success) {
        console.error('getSignatures parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getSignatures error:', error);
      throw error;
    }
  }

  async printRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/templates/${requestId}/print`, {
        responseType: 'blob',
      });
      return res.data;
    } catch (error) {
      console.error('printRequest error:', error);
      throw error;
    }
  }

  async downloadZip(requestId: string) {
    try {
      const res = await this.request('POST', `/api/templates/${requestId}/download-zip`, {
        responseType: 'blob',
      });
      return res.data;
    } catch (error) {
      console.error('downloadZip error:', error);
      throw error;
    }
  }

  async dispatchRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/templates/${requestId}/dispatch`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('dispatchRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data; 
    } catch (error) {
      console.error('dispatchRequest error:', error);
      throw error;
    }
  }

  async rejectRequest(requestId: string, rejectionReason: string) {
    try {
      const res = await this.request('POST', `/signatures/${requestId}/reject`, {
        data: { rejectionReason },
      });
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('rejectRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('rejectRequest error:', error);
      throw error;
    }
  }

  async rejectDocument(requestId: string, documentId: string, rejectionReason: string) {
    try{
      console.log('rejectDocument called with:', { requestId, documentId, rejectionReason });
      const res = await this.request('POST', `/signatures/${requestId}/documents/${documentId}/reject`, {
        data: { rejectionReason },
      });
      console.log('rejectDocument response:', res.data);
      const parsedData = documentSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('rejectDocument parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      console.log('rejectDocument parsed data:', parsedData.data);
      return parsedData.data;
    } catch (error) {
      console.error('rejectDocument error:', error);
      throw error;
    }
  }

  async delegateRequest(id: string) {
    try {
      const res = await this.request('POST', `/signatures/${id}/delegate`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('delegateRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('delegateRequest error:', error);
      throw error;
    }
  }
}