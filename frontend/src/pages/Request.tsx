import React, { useState, useEffect } from "react";
import { Button, Upload, message, Table, Space, Drawer, Form, Input, Tooltip } from "antd";
import { UploadOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useParams } from "react-router";
import { requestClient, useAppStore } from "../store";
import { AxiosError } from "axios";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { signStatus, signStatusDisplay } from "../libs/constants";
import type { TemplateVariable, Document, Request } from "../@types/Interfaces/request";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Request: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRejectDrawerOpen, setIsRejectDrawerOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [rejectForm] = Form.useForm();
  const { session } = useAppStore();
  // const userRole = session?.role;
  // const isOfficer = userRole === roles.officer;

  const fetchRequest = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await requestClient.getRequest(id);
      setRequest({
        ...data,
        documents: (data.documents || []).map((doc: any) => ({
          ...doc,
          signStatus: doc.signStatus,
          data: doc.data || {},
          rejectionReason: doc.rejectionReason,
        })),
        templateVariables: data.templateVariables || [],
        createdBy: data.createdBy, 
      });
    } catch (error) {
      handleError(error, "Failed to fetch request");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileList: File[]) => {
    if (!id) return;
    try {
      setUploading(true);

      const dataEntries: any[] = [];
      for (const file of fileList) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];

        rows.forEach(row => {
          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
          });
          dataEntries.push({
            id: new mongoose.Types.ObjectId().toString(),
            url: file.name,
            data: rowData,
            signStatus: signStatus.unsigned,
            createdAt: new Date().toISOString(),
          });
        });
      }

      console.log('Uploading documents:', { files: fileList.map(f => f.name), dataEntries });

      await requestClient.uploadDocuments(id, fileList, dataEntries);
      message.success("Documents uploaded successfully!");
      await fetchRequest();
    } catch (error) {
      console.error('handleUpload error:', error);
      handleError(error, "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!request?.templateVariables) {
      message.error("No template variables available");
      return;
    }

    const excelVariables = request.templateVariables
      .filter(v => v.showOnExcel)
      .map(v => v.name);

    if (excelVariables.length === 0) {
      message.error("No variables to include in Excel template");
      return;
    }

    const ws = XLSX.utils.json_to_sheet([{}], { header: excelVariables });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${request.title}_template.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewDocument = (document: Document) => {
    if (!id) return;
    const url = document.signStatus === signStatus.Signed
      ? `${backendUrl}/Uploads/signed/${id}/${document.id}_signed.pdf`
      : `${backendUrl}/templates/${id}/documents/${document.id}/preview`;
    window.open(url, '_blank');
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!id) return;
    try {
      await requestClient.deleteDocument(id, document.id);
      message.success("Document deleted successfully!");
      await fetchRequest();
    } catch (error) {
      console.error('deleteDocument error:', error);
      handleError(error, "Failed to delete document");
    }
  };

  const handleRejectDocument = async () => {
    if (!id || !selectedDocumentId) return;
    try {
      const values = await rejectForm.validateFields();
      setLoading(true);
      await requestClient.rejectDocument(id, selectedDocumentId, values.rejectionReason);
      message.success("Document rejected successfully!");
      await fetchRequest();
      setIsRejectDrawerOpen(false);
      setSelectedDocumentId(null);
      rejectForm.resetFields();
    } catch (error) {
      console.error('handleRejectDocument error:', error);
      handleError(error, "Failed to reject document");
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: unknown, fallbackMsg: string) => {
    if (error instanceof AxiosError) {
      message.error(error.response?.data?.error || fallbackMsg);
      return;
    }
    if (error instanceof Error) {
      message.error(error.message);
      return;
    }
    message.error(fallbackMsg);
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const getColumns = (templateVariables: TemplateVariable[]) => {
    const excelFields = templateVariables
      .filter(variable => variable.showOnExcel)
      .map(variable => variable.name);

    const dynamicColumns = excelFields.map(field => ({
      title: field,
      dataIndex: ['data', field],
      key: field,
      render: (value: any) => value || '-',
    }));

    return [
      ...dynamicColumns,
      {
        title: 'Sign Date',
        dataIndex: 'signedDate',
        key: 'signedDate',
        render: (text: string) => (text ? new Date(text).toLocaleDateString() : '-'),
      },
      {
        title: 'Request Status',
        dataIndex: 'signStatus',
        key: 'signStatus',
        render: (status: number, record: Document) => (
          <Tooltip
            title={
              status === signStatus.rejected ? record.rejectionReason
                ? `Reason: ${record.rejectionReason}`
                : 'No reason provided' : ""
            }
          >
            <span>{signStatusDisplay[status as signStatus] || 'Unknown'}</span>
          </Tooltip>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: Document) => (
          <Space>
            {record.signStatus === signStatus.Signed && (
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handlePreviewDocument(record)}
              >
                Download
              </Button>
            )}
            {(record.signStatus === signStatus.unsigned || record.signStatus === signStatus.readForSign) && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => handlePreviewDocument(record)}
              >
                Preview
              </Button>
            )}
            {request && request.createdBy != session?.userId && (record.signStatus === signStatus.unsigned || record.signStatus === signStatus.readForSign) && (
              <Button
                danger
                onClick={() => {
                  setSelectedDocumentId(record.id);
                  setIsRejectDrawerOpen(true);
                }}
              >
                Reject
              </Button>
            )}
            {request && request.createdBy == session?.userId && record.signStatus === signStatus.unsigned && (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteDocument(record)}
              >
                Delete
              </Button>
            )}
          </Space>
        ),
      },
    ];
  };

  return (
    <MainAreaLayout
      title={`Request: ${request?.title || "Loading..."}`}
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {request?.status === signStatusDisplay[signStatus.unsigned] && (
            <Upload
            accept=".xlsx,.xls"
            multiple
            showUploadList={false}
            beforeUpload={() => false}
            fileList={[]}
            onChange={({ fileList }) =>
              handleUpload(fileList.map((file) => file.originFileObj as File))
            }
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              Bulk Upload Excel Files
            </Button>
          </Upload>
          )}
          
          <Button onClick={handleDownloadTemplate}>
            Download Template
          </Button>
        </div>
      }
    >
      <Table
        columns={request ? getColumns(request.templateVariables || []) : []}
        dataSource={request?.documents || []}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: "No documents uploaded yet" }}
      />
      <Drawer
        title="Reject Document"
        open={isRejectDrawerOpen}
        onClose={() => {
          setIsRejectDrawerOpen(false);
          setSelectedDocumentId(null);
          rejectForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectDocument}>
          <Form.Item
            label="Rejection Reason"
            name="rejectionReason"
            rules={[{ required: true, message: "Please enter a rejection reason" }]}
          >
            <Input.TextArea placeholder="Enter the reason for rejection" rows={4} />
          </Form.Item>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setIsRejectDrawerOpen(false);
                setSelectedDocumentId(null);
                rejectForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Reject
            </Button>
          </div>
        </Form>
      </Drawer>
    </MainAreaLayout>
  );
};

export default Request;