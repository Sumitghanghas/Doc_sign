import {Router} from 'express';
import * as signatureController from '../controller/SignatureController.js';
import { checkLoginStatus } from '../middleware/checkAuth.js';
import { checkReader, checkOfficer } from '../middleware/CheckRole.js';

const router = Router();

router.get('/documents/:documentId',checkLoginStatus, signatureController.getDocumentData);
router.post('/:id/send', checkLoginStatus, signatureController.sendForSignature);
router.post('/:id/sign', checkLoginStatus, signatureController.signRequest);
router.post('/:id/reject', checkLoginStatus, checkOfficer, signatureController.rejectRequest);
router.post('/:id/documents/:documentId/reject', checkLoginStatus, checkOfficer, signatureController.rejectDocument);
router.post('/:id/delegate', checkLoginStatus, checkOfficer, signatureController.delegateRequest);

export default router;