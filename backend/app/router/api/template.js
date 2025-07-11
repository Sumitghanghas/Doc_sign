import { Router } from 'express';
import { checkLoginStatus } from '../../middleware/checkAuth.js';
import { checkReader } from '../../middleware/CheckRole.js';
import { requestUpload } from '../../middleware/multer.js';
import * as requestController from '../../controller/RequestController.js';

const router = Router();


router.post(
  '/',
  checkLoginStatus,
  requestUpload.single('templateFile'),
  requestController.createRequest
);
router.get('/', checkLoginStatus, requestController.getAllRequests);
router.get('/:id', checkLoginStatus, requestController.getRequestById);
router.post('/:id/clone', checkLoginStatus, requestController.cloneRequest);
router.post('/:id/print', checkLoginStatus, requestController.printRequest);
router.post('/:id/download-zip', checkLoginStatus, requestController.downloadZip);
router.delete('/:id', checkLoginStatus, requestController.deleteRequest);

export default router;