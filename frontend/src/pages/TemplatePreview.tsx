 import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Spin, Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import MainAreaLayout from '../components/main-layout/main-layout';
import { requestClient } from '../store';

interface Request {
  id: string;
  title: string;
  url: any;
}

export const TemplatePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await requestClient.getRequest(id);
        const requestData = {
          id: data.id,
          title: data.title,
          url: data.url,
        };
        setRequest(requestData);
  
        await openTemplateAsPdf(requestData.id);
      } catch (error) {
        console.error('fetchRequest error:', error);
        message.error('Failed to fetch request or generate PDF');
      } finally {
        setLoading(false);
      }
    };
  
    fetchRequest();
  
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl); // cleanup blob
      }
    };
  }, [id]);

  const openTemplateAsPdf = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await requestClient.getRequestPdf(templateId);

      const pdfBase64 = response?.pdf;
      if (typeof pdfBase64 !== 'string' || !pdfBase64) {
        throw new Error('Invalid or empty PDF data received');
      }

      const binaryString = atob(pdfBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);

      setPdfUrl(blobUrl);
    } catch (error) {
      console.error('Error in openTemplateAsPdf:', error);
      message.error('Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainAreaLayout
      title={`Template Preview: ${request?.title || 'Loading...'}`}
      extra={
        <>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard/requests')}
            style={{ marginRight: 8 }}
          >
            Back to Requests
          </Button>
        </>
      }
    >
      {loading ? (
        <Spin
          size="large"
          style={{ display: 'block', textAlign: 'center', marginTop: 50 }}
        />
      ) : request ? (
        <div>
          <h3>{request.title}</h3>

          {pdfUrl && (
            <div style={{ height: '80vh', marginTop: 16 }}>
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                style={{ border: '1px solid #ccc', borderRadius: 8 }}
                title="PDF Preview"
              />
            </div>
          )}
        </div>
      ) : (
        <p>No template found</p>
      )}
    </MainAreaLayout>
  );
};

