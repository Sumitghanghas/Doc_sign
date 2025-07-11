import { roles, signStatus, status } from '../constants/index.js';
import User from '../models/users.js';
import * as templateServices from '../services/templates.js';

export const checkSignaturePermission = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const requestId = req.params.id;

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const request = await templateServices.findOne({ id: requestId, status: status.active });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (user.role === roles.officer && request.signStatus === signStatus.delegated) {
      return res.status(403).json({ error: 'Officers cannot sign delegated requests' });
    }

    if (user.role === roles.reader && request.signStatus !== signStatus.delegated) {
      return res.status(403).json({ error: 'Readers can only sign delegated requests' });
    }

    if (![roles.reader, roles.officer].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to sign documents' });
    }

    req.user = user;
    req.signatureRequest = request;

    next();
  } catch (err) {
    console.error('checkSignaturePermission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
