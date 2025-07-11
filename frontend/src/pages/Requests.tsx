import React, { useEffect, useState } from "react";
import { Button, Drawer, Select, Tag, message, Form, Input, Upload, Tooltip } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import CustomTable from "../components/CustomTable";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useNavigate } from "react-router";
import { requestClient, useAppStore } from "../store";
import { AxiosError } from "axios";
import { roles, signStatus, signStatusDisplay } from "../libs/constants";
import { Request, Officer, Signature } from '../@types/Interfaces/requests';
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Requests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);
  const [isSendDrawerOpen, setIsSendDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSignDrawerOpen, setIsSignDrawerOpen] = useState(false);
  const [isRejectDrawerOpen, setIsRejectDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signForm] = Form.useForm();
  const [sendForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const { session } = useAppStore();
  const userRole = session?.role;
  const isReader = userRole === roles.reader;

  const fetchRequests = async () => {
    try {
      setLoading(true);
  
      const data = await requestClient.getRequests();
  
      const sortedRequests = (data as Request[]).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  
      const mappedData = sortedRequests.map((req: any) => ({
        ...req,
        rawStatus: req.status
          ? Number(
              Object.keys(signStatusDisplay).find(
                (key) =>
                  signStatusDisplay[key as unknown as keyof typeof signStatusDisplay] === req.status
              )
            )
          : signStatus.unsigned,
      }));
  
      setRequests(mappedData);
      setFilteredRequests(mappedData);
    } catch (error) {
      handleError(error, "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };
  

  const fetchOfficers = async () => {
    try {
      const data = await requestClient.getOfficers();
      setOfficers(data);
    } catch (error) {
      console.error('fetchOfficers error:', error);
      handleError(error, "Failed to fetch officers. Please try again later.");
    }
  };

  const fetchSignatures = async () => {
    try {
      const data = await requestClient.getSignatures();
      setSignatures(
        data.map((item) => ({
          id: item.id,
          name: item.userId,
          url: item.url,
          createdAt: item.createdBy,
        }))
      );
    } catch (error: any) {
      if (!error.message.includes('404')) {
        message.error('Failed to fetch signatures');
      }
      setSignatures([]);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const filtered = requests.filter((request) =>
      request.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredRequests(filtered);
  };

  const handleAddRequest = () => {
    setIsCreateDrawerOpen(true);
    createForm.resetFields();
  };

  const handleCreateRequest = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);
      const templateFile = values.templateFile?.[0]?.originFileObj;
      if (!templateFile) {
        throw new Error("Please upload a template file");
      }

      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // word file extend by .docx
        "application/msword", // word file extend by .doc
      ];

      if (!allowedTypes.includes(templateFile.type)) {
        message.error("Invalid file type. Please upload a .doc or .docx file.");
        return;
      }
      await requestClient.createRequest({
        title: values.title,
        description: values.description,
        templateFile,
      });
      message.success("Request created successfully!");
      await fetchRequests();
      setIsCreateDrawerOpen(false);
      createForm.resetFields();
    } catch (error) {
      console.error('handleCreateRequest error:', error);
      handleError(error, "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForSignature = async () => {
    try {
      const values = await sendForm.validateFields();
      setLoading(true);
      await requestClient.sendForSignature(selectedRequest!.id, {
        officerId: values.officerId,
      });
      message.success("Request sent for signature!");
      await fetchRequests();
      setIsSendDrawerOpen(false);
      sendForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleSendForSignature error:', error);
      handleError(error, "Failed to send request for signature");
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.cloneRequest(id);
      message.success("Request cloned successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleCloneRequest error:', error);
      handleError(error, "Failed to clone request");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.deleteRequest(id);
      message.success("Request deleted successfully!");
      setRequests((prev) => prev.filter((req) => req.id !== id));
      setFilteredRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('handleDeleteRequest error:', error);
      handleError(error, "Failed to delete request");
    } finally {
      setLoading(false);
    }
  };

  const handleSignRequest = async () => {
    try {
      const values = await signForm.validateFields();
      const requestId = selectedRequest!.id;
      setSigningRequestId(requestId);
      setRequests((pre) =>
        pre.map((req) =>
          req.id === requestId
            ? {
              ...req,
              status: signStatusDisplay[signStatus.inProcess],
              rawStatus: signStatus.inProcess,
            }
            : req
        )
      );
      setFilteredRequests((pre) =>
        pre.map((req) =>
          req.id === requestId
            ? {
              ...req,
              status: signStatusDisplay[signStatus.inProcess],
              rawStatus: signStatus.inProcess,
            }
            : req
        )
      );
      await requestClient.signRequest(requestId, values.signatureId);
      message.success("Request signed successfully!");
      await fetchRequests();
      setIsSignDrawerOpen(false);
      signForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleSignRequest error:', error);
      handleError(error, "Failed to sign request");
      await fetchRequests();
    } finally {
      setSigningRequestId(null);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.dispatchRequest(id);
      message.success("Request dispatched successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleDispatch error:', error);
      handleError(error, "Failed to dispatch request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      const values = await rejectForm.validateFields();
      setLoading(true);
      await requestClient.rejectRequest(selectedRequest!.id, values.rejectionReason);
      message.success("Request rejected successfully!");
      await fetchRequests();
      setIsRejectDrawerOpen(false);
      rejectForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleRejectRequest error:', error);
      handleError(error, "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintRequest = async (requestId: string) => {
    try {
      const pdfBlob = await requestClient.printRequest(requestId);
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.onbeforeunload = () => URL.revokeObjectURL(url);
        };
      } else {
        message.error('Failed to open print window');
      }
    } catch (error) {
      console.error('handlePrintRequest error:', error);
      handleError(error, 'Failed to print documents');
    }
  };

  const handleDownloadAll = async (requestId: string, requestTitle: string) => {
    try {
      const zipBlob = await requestClient.downloadZip(requestId);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${requestTitle}_signed_documents.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('handleDownloadAll error:', error);
      handleError(error, 'Failed to download ZIP');
    }
  };

  const handleDelegateRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.delegateRequest(id);
      message.success("Request delegated successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleDelegateRequest error:', error);
      handleError(error, "Failed to delegate request");
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
    fetchRequests();
    fetchOfficers();
  }, []);

  const getActions = (record: Request) => {
    const actions: JSX.Element[] = [];


    actions.push(
      <Button key="clone" onClick={() => handleCloneRequest(record.id)}>
        Clone
      </Button>
    );

    if (record.rawStatus === signStatus.unsigned) {
      if (record.createdBy === session?.userId) {
        actions.push(
          <Button
            key="send"
            type="primary"
            disabled={record.documentCount === 0 || officers.length === 0}
            onClick={() => {
              setSelectedRequest(record);
              setIsSendDrawerOpen(true);
            }}
          >
            Send for Signature
          </Button>,
          <Button
            key="delete"
            danger
            onClick={() => handleDeleteRequest(record.id)}
          >
            Delete
          </Button>
        );
      }
    } else if (record.rawStatus === signStatus.delegated) {
      actions.push(
        <Button
          key="sign"
          type="primary"
          loading={signingRequestId === record.id}
          disabled={signingRequestId === record.id}
          onClick={() => {
            setSelectedRequest(record);
            setIsSignDrawerOpen(true);
            fetchSignatures();
          }}
        >
          Sign
        </Button>
      );
    } else if (record.rawStatus === signStatus.readForSign &&  record.createdBy !== session?.userId && !isReader) {
      actions.push(
        <Button
          key="sign"
          type="primary"
          loading={signingRequestId === record.id}
          disabled={signingRequestId === record.id}
          onClick={() => {
            setSelectedRequest(record);
            setIsSignDrawerOpen(true);
            fetchSignatures();
          }}
        >
          Sign
        </Button>,
        <Button
          key="reject"
          danger
          onClick={() => {
            setSelectedRequest(record);
            setIsRejectDrawerOpen(true);
          }}
        >
          Reject
        </Button>,
        <Button
          key="delegate"
          onClick={() => handleDelegateRequest(record.id)}
        >
          Delegate
        </Button>
      );
    } else if (record.rawStatus === signStatus.Signed) {
      actions.push(
        <Button
          key="print"
          onClick={() => handlePrintRequest(record.id)}
        >
          Print
        </Button>,
        <Button
          key="download"
          onClick={() => handleDownloadAll(record.id, record.title)}
        >
          Download All (ZIP)
        </Button>
      );
      if (isReader) {
        actions.push(
          <Button
            key="dispatch"
            type="primary"
            onClick={() => handleDispatch(record.id)}
          >
            Dispatch
          </Button>
        );
      }
    }

    return actions;
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/template/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Number of Documents",
      dataIndex: "documentCount",
      key: "documentCount",
      render: (count: number, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/request/${record.id}`)}
        >
          {count}
        </Button>
      ),
    },
    {
      title: "Rejected Documents",
      dataIndex: "rejectedCount",
      key: "rejectedCount",
      render: (count: number, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/request/${record.id}/reject`)}
          disabled={count === 0}
        >
          {count}
        </Button>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "Request Status",
      dataIndex: "status",
      key: "status",
      render: (_: string, record: Request) => {
        const displayStatus = isReader && record.rawStatus === signStatus.Signed
          ? signStatusDisplay[signStatus.readyForDispatch]
          : record.status;
  
        return (
          <Tooltip
            title={
              record.rawStatus === signStatus.rejected && record.rejectionReason
                ? `Reason: ${record.rejectionReason}`
                : ''
            }
          >
            <Tag
              color={
                displayStatus === signStatusDisplay[signStatus.unsigned]
                  ? "red"
                  : displayStatus === signStatusDisplay[signStatus.readForSign]
                    ? "orange"
                    : displayStatus === signStatusDisplay[signStatus.rejected]
                      ? "volcano"
                      : displayStatus === signStatusDisplay[signStatus.delegated]
                        ? "blue"
                        : displayStatus === signStatusDisplay[signStatus.inProcess]
                          ? "cyan"
                          : displayStatus === signStatusDisplay[signStatus.Signed]
                            ? "green"
                            : displayStatus === signStatusDisplay[signStatus.readyForDispatch]
                              ? "lime"
                              : displayStatus === signStatusDisplay[signStatus.dispatched]
                                ? "purple"
                                : "default"
              }
            >
              {displayStatus || "Unknown"}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Action",
      key: "actions",
      render: (record: Request) => (
        <div style={{ display: "flex", gap: "8px" }}>{getActions(record)}</div>
      ),
    },
  ];

  return (
    <MainAreaLayout
      title="Requests"
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Input.Search
            placeholder="Search by title"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button type="primary" onClick={handleAddRequest}>
            New Request for Signature
          </Button>
        </div>
      }
    >
      <CustomTable
        serialNumberConfig={{ name: "", show: true }}
        columns={columns}
        data={filteredRequests}
        loading={loading}
      />
      <Drawer
        title="Send for Signature"
        open={isSendDrawerOpen}
        onClose={() => {
          setIsSendDrawerOpen(false);
          setSelectedRequest(null);
          sendForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={sendForm} layout="vertical" onFinish={handleSendForSignature}>
          <Form.Item
            label="Select Officer"
            name="officerId"
            rules={[{ required: true, message: "Please select an officer" }]}
          >
            <Select
              placeholder="Select an officer"
              disabled={officers.length === 0}
              options={officers.map((officer) => ({
                value: officer.id,
                label: officer.name,
              }))}
            />
          </Form.Item>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setIsSendDrawerOpen(false);
                setSelectedRequest(null);
                sendForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} disabled={officers.length === 0}>
              Send
            </Button>
          </div>
        </Form>
      </Drawer>
      <Drawer
        title="Create New Request"
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateRequest}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="Enter request title" />
          </Form.Item>
          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: "Please enter a description" }]}
          >
            <Input placeholder="Enter request description" />
          </Form.Item>
          <Form.Item
            label="Template File"
            name="templateFile"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e.fileList)}
            rules={[{ required: true, message: "Please upload a template file" }]}
          >
            <Upload
              accept=".doc,.docx"
              maxCount={1}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>Upload Template File</Button>
            </Upload>
          </Form.Item>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setIsCreateDrawerOpen(false);
                createForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create
            </Button>
          </div>
        </Form>
      </Drawer>
      <Drawer
        title="Sign Request"
        open={isSignDrawerOpen}
        onClose={() => {
          setIsSignDrawerOpen(false);
          setSelectedRequest(null);
          signForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={signForm} layout="vertical" onFinish={handleSignRequest}>
          <Form.Item
            label="Select Signature"
            name="signatureId"
            rules={[{ required: true, message: "Please select a signature" }]}
          >
            <Select
              placeholder="Select a signature"
              style={{ width: '100%' }}
              options={signatures.map((sig) => ({
                value: sig.id,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={`${backendUrl}${sig.url}`}
                      alt={sig.name}
                      style={{ width: 40, height: 40, objectFit: 'contain', border: '1px solid #ddd' }}
                    />
                    <span>{sig.name}</span>
                  </div>
                ),
              }))}
            />
          </Form.Item>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setIsSignDrawerOpen(false);
                setSelectedRequest(null);
                signForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={signingRequestId === selectedRequest?.id}>
              Sign
            </Button>
          </div>
        </Form>
      </Drawer>
      <Drawer
        title="Reject Request"
        open={isRejectDrawerOpen}
        onClose={() => {
          setIsRejectDrawerOpen(false);
          setSelectedRequest(null);
          rejectForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectRequest}>
          <Form.Item
            label="Rejection Reason"
            name="rejectionReason"
            rules={[{ required: true, message: "Please enter a rejection reason" }]}
          >
            <Input.TextArea
              placeholder="Enter the reason for rejection"
              rows={4}
            />
          </Form.Item>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setIsRejectDrawerOpen(false);
                setSelectedRequest(null);
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

export default Requests;