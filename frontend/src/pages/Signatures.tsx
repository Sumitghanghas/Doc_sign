import React, { useState, useEffect } from 'react';
import { Button, Upload, message, Spin, Modal } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import MainAreaLayout from '../components/main-layout/main-layout';
import { requestClient } from '../store';
import type { Signature } from '../@types/Interfaces/Signature';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Signature: React.FC = () => {
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const fetchSignatures = async () => {
        try {
            setLoading(true);
            const data = await requestClient.getSignatures();
            setSignatures(
                data.map((item: any) => ({
                    id: item.id,
                    userId: item.userId,
                    filePath: item.url,
                    createdBy: item.createdBy,
                    updatedBy: item.updatedBy,
                }))
            );
        } catch (error: any) {
            if (error.message.includes('404')) {
                setSignatures([]);
            } else {
                message.error('Failed to load signatures');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.error('Please select a signature file');
            return;
        }

        try {
            setUploading(true);
            const signatureFile = fileList[0];
            await requestClient.uploadSignature(signatureFile);
            message.success('Signature uploaded successfully');
            setFileList([]);
            await fetchSignatures();
            setPreviewVisible(false); // 👈 close modal on success
        } catch (error) {
            console.error('handleUpload error:', error);
            message.error('Failed to upload signature');
        } finally {
            setUploading(false);
        }
    };

    const handlePreview = async (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result as string);
            setPreviewVisible(true);
        };
        reader.readAsDataURL(file);
    };

    const uploadProps = {
        accept: '.png,.jpg,.jpeg',
        beforeUpload: (file: File) => {
            setFileList([file]);
            handlePreview(file); 
            return false;
        },
        onRemove: () => {
            setFileList([]);
            setPreviewVisible(false);
        },
        fileList,
    };

    useEffect(() => {
        fetchSignatures();
    }, []);

    return (
        <MainAreaLayout title="Upload Signature">
            <div className="p-6 bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Signature Management</h2>

                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />} className="bg-blue-600 text-white hover:bg-blue-700">
                            Select Signature File
                        </Button>
                    </Upload>
                </div>

                <Modal
                    title="Preview Signature"
                    open={previewVisible}
                    onCancel={() => setPreviewVisible(false)}
                    footer={[
                        <Button key="cancel" onClick={() => setPreviewVisible(false)}>
                            Cancel
                        </Button>,
                        <Button
                            key="upload"
                            type="primary"
                            loading={uploading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleUpload}
                        >
                            Upload Signature
                        </Button>,
                    ]}
                >
                    {previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto object-contain" />}
                </Modal>

                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Signature Library</h3>

                    {loading ? (
                        <div className="flex justify-center my-8">
                            <Spin size="large" />
                        </div>
                    ) : signatures.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {signatures.map((signature) => (
                                <div
                                    key={signature.id}
                                    className="w-full h-64 bg-white shadow-md rounded-xl border border-gray-200 p-4 flex items-center justify-center hover:shadow-xl transition-all duration-300"
                                >
                                    <img
                                        src={`${backendUrl}${signature.filePath}`}
                                        alt="signature"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center mt-6">No signatures uploaded yet.</p>
                    )}
                </div>
            </div>
        </MainAreaLayout>
    );
};

export default Signature;
