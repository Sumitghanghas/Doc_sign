import * as templateServices from '../../services/templates.js';
import * as signatureServices from '../../services/signature.js';
import Court from '../../models/courts.js';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import QRCode from 'qrcode';
import { signStatus, status } from '../../constants/index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import libre from 'libreoffice-convert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const convertToPDF = (docxBuf) => {
  return new Promise((resolve, reject) => {
    libre.convert(docxBuf, '.pdf', undefined, (err, pdfBuf) => {
      if (err) reject(err);
      else resolve(pdfBuf);
    });
  });
};

export const signJobHandler = async ({ id, userId, signatureId, courtId }) => {
  const court = await Court.findOne({ id: courtId });
  if (!court) throw new Error('Court not found');

  const request = await templateServices.findOne({ id, status: status.active });
  if (!request || request.createdBy == userId) {
    throw new Error('Request not found or not authorized');
  }
if (request.signStatus === signStatus.Signed) {
  console.log(`Request ${id} already signed. Skipping...`);
  return;
}

  const signature = await signatureServices.findOne({ id: signatureId, userId });
  if (!signature) throw new Error('Signature not found');
  console.log('Signature found:', request.url);

  const docxPath = path.resolve(__dirname, '../../uploads/templates', request.url);
  if (!fs.existsSync(docxPath)) throw new Error('Template file not found');

  const signedDir = path.resolve(__dirname, '../../uploads/signed', id);
  if (!fs.existsSync(signedDir)) fs.mkdirSync(signedDir, { recursive: true });

  const qrCodeDir = path.resolve(__dirname, '../../uploads/qrcodes', id);
  if (!fs.existsSync(qrCodeDir)) fs.mkdirSync(qrCodeDir, { recursive: true });

  const signedDocuments = [];
  let i = 0;
  for (const document of request.data) {
    if (document.signStatus === signStatus.rejected) {
      signedDocuments.push(document);
      continue;
    }
    console.log(i++);

    const content = fs.readFileSync(docxPath, 'binary');
    const zip = new PizZip(content);

    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue) => {
        let normalizedPath = tagValue.replace(/\\/g, '/').replace(/^\/+/, '');
        const imagePath = path.resolve(__dirname, '../', normalizedPath);
        if (fs.existsSync(imagePath)) return fs.readFileSync(imagePath);
        const altPath = path.resolve(__dirname, '../../uploads/signatures', path.basename(normalizedPath));
        if (fs.existsSync(altPath)) return fs.readFileSync(altPath);
        const qrPath = path.resolve(qrCodeDir, path.basename(normalizedPath));
        if (fs.existsSync(qrPath)) return fs.readFileSync(qrPath);
        throw new Error(`Image file not found for ${tagValue}`);
      },
      getSize: (tagValue) => (tagValue.includes('qrcode') ? [250, 250] : [150, 100]),
      parser: (tag) => tag === 'Signature' || tag === 'qrCode',
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule],
    });

    const data = document.data instanceof Map ? Object.fromEntries(document.data) : document.data || {};
    data['Signature'] = signature.url.replace(/\\/g, '/');
    data['Court'] = court.name;

    const qrCodeUrl = `${process.env.FRONTEND_URL}/document/${document.id}`;
    const qrCodeFileName = `${document.id}_qrcode.png`;
    const qrCodePath = path.join(qrCodeDir, qrCodeFileName);
    await QRCode.toFile(qrCodePath, qrCodeUrl, { width: 100, margin: 0 });
    data['qrCode'] = qrCodePath.replace(/\\/g, '/');

    try {
      doc.render(data);
    } catch (err) {
      throw new Error(`Docxtemplater render error: ${err.message}`);
    }

    const filledDocxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const pdfBuf = await convertToPDF(filledDocxBuf);
    const signedPdfPath = path.join(signedDir, `${document.id}_signed.pdf`);
    fs.writeFileSync(signedPdfPath, pdfBuf);

    signedDocuments.push({
      ...document,
      signedPath: signedPdfPath,
      signStatus: signStatus.Signed,
      signedDate: new Date(),
      qrCodePath,
    });
  }

  await templateServices.updateOne(
    { id },
    {
      $set: {
        data: signedDocuments,
        signStatus: signStatus.Signed,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    }
  );
};
