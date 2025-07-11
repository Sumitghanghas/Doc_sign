import * as templateServices from '../services/templates.js';
import { SendForSignatureSchema } from '../schema/signature.js';
import { userServices } from '../services/index.js';
import { roles, status, signStatus } from '../constants/index.js';
import { signingQueue } from '../scaling/queues/signingQueue.js';
// import { signJobHandler } from '../scaling/jobs/signingJobHandler.js';
// import { Worker } from 'bullmq';
// import IORedis from 'ioredis';

export const sendForSignature = async (req, res, next) => {
    try {
        const id = req.params.id;
        const request = await templateServices.findOne({
            id,
            signStatus: signStatus.unsigned,
            createdBy: req.session.userId,
            status: status.active,
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        if (request.data.length === 0) {
            return res.status(400).json({ error: 'Cannot send request without documents' });
        }
        if( request.signStatus !== signStatus.unsigned) {
            return res.status(400).json({ error: 'Request is not in unsigned status' });
        }

        const body = await SendForSignatureSchema.safeParseAsync(req.body);
        if (!body.success) {
            return res.status(400).json({
                error: 'Invalid payload',
                detailed: body.error,
            });
        }

        const { officerId } = body.data;
        const officer = await userServices.findOne({
            id: officerId,
            role: roles.officer,
            status: status.active,
        });

        if (!officer) {
            return res.status(400).json({ error: 'Invalid officer' });
        }

        const updatedTemplate = await templateServices.updateOne(
            { id },
            {
                $set: {
                    signStatus: signStatus.readForSign,
                    assignedTo: officerId,
                    updatedBy: req.session.userId,
                    updatedAt: new Date(),
                },
            }
        );

        return res.json({
            id: updatedTemplate.id.toString(),
            title: updatedTemplate.templateName,
            documentCount: updatedTemplate.data.length,
            rejectedCount: updatedTemplate.data.filter((d) => d.signStatus === signStatus.rejected).length,
            createdAt: updatedTemplate.createdAt.toISOString(),
            status: updatedTemplate.signStatus,
            description: updatedTemplate.description || '',
            documents: updatedTemplate.data.map((dd) => ({
                id: dd.id.toString(),
                name: dd.data.name || 'Document',
                filePath: dd.url,
                uploadedAt: dd.createdAt?.toISOString() || updatedTemplate.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('POST /api/sendForSignature/:id/ error:', error);
        next(error);
    }
};


export const signRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { signatureId } = req.body;
    const userId = req.session.userId;
    const courtId = req.session.courtId;


    const job = await signingQueue.add('sign-document', {
      id,
      userId,
      signatureId,
      courtId,
    });

    console.log('signRequest -> queue add success:', job.data);

    res.status(200).json({ message: 'Sign job added to queue' });

  } catch (error) {
    console.error('signRequest -> queue add failed:', error);
    next(error);
  }
};



export const rejectRequest = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { rejectionReason } = req.body;
        console.log('Reject request received:', { id, rejectionReason });

        if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
            return res.status(400).json({ error: 'Rejection reason is required and must be a non-empty string' });
        }

        const userObjectId = req.session.userId;

        if (!userObjectId) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        const template = await templateServices.findOne({
            id,
            signStatus: signStatus.readForSign,
            assignedTo: userObjectId,
            status: status.active,
        });

        if (!template) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const rejectedDocuments = template.data.map(doc => ({
            ...doc,
            signStatus: signStatus.rejected,
            rejectionReason: rejectionReason.trim(),
            rejectedDate: new Date()
        }));

        const updatedTemplate = await templateServices.updateOne(
            { id },
            {
                $set: {
                    data: rejectedDocuments,
                    signStatus: signStatus.rejected,
                    rejectionReason: rejectionReason.trim(),
                    updatedBy: userObjectId,
                    updatedAt: new Date(),
                },
            }
        );

        console.log('Updated template with rejectionReason:', updatedTemplate);

        return res.json({
            id: template.id.toString(),
            title: template.templateName,
            documentCount: template.data.length,
            rejectedCount: rejectedDocuments.length,
            createdAt: template.createdAt.toISOString(),
            status: signStatus.rejected,
            rejectionReason: rejectionReason.trim(),
            description: template.description || '',
            documents: rejectedDocuments.map((d) => ({
                id: d.id.toString(),
                name: d.data.name || 'Document',
                filePath: d.url,
                uploadedAt: d.createdAt?.toISOString() || template.createdAt.toISOString(),
                rejectionReason: d.rejectionReason,
                rejectedDate: d.rejectedDate
            })),
        });
    } catch (error) {
        console.error('POST /api/requests/:id/reject error:', error);
        next(error);
    }
};

export const getDocumentData = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        const template = await templateServices.findOne(
            { 'data.id': documentId },
            { 'data.$': 1, templateName: 1, description: 1 }
        );

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const document = template.data[0];
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        return res.json({
            documentId: document.id.toString(),
            templateName: template.templateName,
            description: template.description || '',
            data: document.data instanceof Map ? Object.fromEntries(document.data) : document.data || {},
            signedDate: document.signedDate?.toISOString(),
            signedPath: document.signedPath || '',
            qrCodePath: document.qrCodePath || '',
        });
    } catch (error) {
        console.error('GET /api/documents/:documentId error:', error);
        next(error);
    }
};

export const rejectDocument = async (req, res, next) => {
    try {
        const { id, documentId } = req.params;
        const { rejectionReason } = req.body;
        console.log('Reject document received:', { id, documentId, rejectionReason });

        if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
            return res.status(400).json({ error: 'Rejection reason is required and must be a non-empty string' });
        }

        const request = await templateServices.findOne({
            id,
            signStatus: signStatus.readForSign,
            assignedTo: req.session.userId,
            status: status.active,
            'data.id': documentId,
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const updatedDocument = await templateServices.updateOne(
            {
                id,
                'data.id': documentId,
            },
            {
                $set: {
                    'data.$.signStatus': signStatus.rejected,
                    'data.$.rejectionReason': rejectionReason.trim(),
                    'data.$.rejectedDate': new Date(),
                    updatedBy: req.session.userId,
                    updatedAt: new Date(),
                },
            }
        );
        console.log('Updated document with rejectionReason:', updatedDocument);

        return res.json({
            message: 'Document rejected successfully',
            documentId,
            rejectionReason: rejectionReason.trim(),
        });
    } catch (error) {
        console.error('POST /api/requests/:requestId/documents/:documentId/reject error:', error);
        next(error);
    }
}

export const delegateRequest = async (req, res, next) => {
    try {
        const id = req.params.id;
        const template = await templateServices.findOne({
            id,
            signStatus: signStatus.readForSign,
            assignedTo: req.session.userId,
            status: status.active,
        });

        if (!template) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const readerId = template.createdBy;

        const updatedRequest = await templateServices.updateOne(
            { id },
            {
                $set: {
                    signStatus: signStatus.delegated,
                    delegatedTo: readerId,
                    updatedBy: req.session.userId,
                    updatedAt: new Date(),
                },
            }
        );

        return res.json({
            id: updatedRequest.id.toString(),
            title: updatedRequest.templateName,
            documentCount: updatedRequest.data.length,
            rejectedCount: updatedRequest.data.filter(d => d.signStatus === signStatus.rejected).length,
            createdAt: updatedRequest.createdAt.toISOString(),
            status: updatedRequest.signStatus,
            description: updatedRequest.description || '',
            documents: updatedRequest.data.map(d => ({
                id: d.id.toString(),
                name: 'Document',
                filePath: d.url,
                uploadedAt: d.createdAt?.toISOString() || updatedRequest.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('POST /api/requests/:id/delegate error:', error);
        next(error);
    }
}