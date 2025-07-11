import React, { useState, useEffect } from "react";
import { message, Table, Tooltip } from "antd";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useParams } from "react-router";
import { requestClient } from "../store";
import { AxiosError } from "axios";
import { signStatus, signStatusDisplay } from "../libs/constants";
import type { TemplateVariable, Document, Request } from "../@types/Interfaces/request";

const RejectedRequest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRequest = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await requestClient.getRequest(id);
      setRequest({
        ...data,
        documents: (data.documents || [])
        .filter((doc: any) => doc.signStatus == signStatus.rejected)
        .map((doc: any) => ({
          ...doc,
          signStatus: doc.signStatus,
          data: doc.data || {},
          rejectionReason: doc.rejectionReason,
        })),
        templateVariables: data.templateVariables || [],
      });
    } catch (error) {
      handleError(error, "Failed to fetch request");
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
    ];
  };

  return (
    <MainAreaLayout
      title={`RejectedRequest: ${request?.title || "Loading..."}`}
    >
      <Table
        columns={request ? getColumns(request.templateVariables || []) : []}
        dataSource={request?.documents || []}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: "No documents uploaded yet" }}
      />
    </MainAreaLayout>
  );
};

export default RejectedRequest;