import { Router } from 'express';
import { checkLoginStatus } from '../middleware/checkAuth.js';
// import { checkReader } from '../middleware/CheckRole.js';
import { requestUpload } from '../middleware/multer.js';
import * as documentController from '../controller/TampleteController.js';

const router = Router();

router.get('/:id/pdf', checkLoginStatus, documentController.convertToPDF);
router.post(
  '/:id/documents',
  checkLoginStatus,
//   checkReader,
  requestUpload.array('documents', 100),
  documentController.uploadDocuments
);
router.get('/:id/documents/:documentId/preview', checkLoginStatus, documentController.previewDocument);
router.delete('/:id/documents/:documentId', checkLoginStatus, documentController.deleteDocument);

export default router;