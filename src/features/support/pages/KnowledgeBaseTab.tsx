import {
  Button,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Edit,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../../../utils/errors";
import { adminSupportApi } from "../api/adminSupportApi";
import type { SupportKnowledgeArticle, TicketCategory } from "../types/support";

const { Text } = Typography;
const { TextArea } = Input;

interface ArticleFormValues {
  title: string;
  slug?: string;
  category: TicketCategory;
  content: string;
  keywords?: string[];
  isFaq?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "APPOINTMENTS", label: "Appointments" },
  { value: "PRESCRIPTIONS", label: "Prescriptions" },
  { value: "MEDICINE_ORDERS", label: "Medicine Orders" },
  { value: "LAB_REPORTS", label: "Lab Reports" },
  { value: "PAYMENTS", label: "Billing & Payments" },
  { value: "TECHNICAL_HELP", label: "Technical Help" },
  { value: "GENERAL_INQUIRY", label: "General Clinic Inquiries" },
];

export const KnowledgeBaseTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<SupportKnowledgeArticle[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SupportKnowledgeArticle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ArticleFormValues>();

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminSupportApi.getArticles({
        category: categoryFilter,
        search: search.trim() ? search.trim() : undefined,
      });
      setArticles(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setArticles([]);
      message.error(getErrorMessage(err, "Failed to load articles"));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  useEffect(() => {
     
    void fetchArticles();
  }, [fetchArticles]);

  const handleOpenCreateModal = () => {
    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({
      category: "APPOINTMENTS",
      status: "PUBLISHED",
      isFaq: true,
      keywords: [],
    });
    setModalVisible(true);
  };

  const handleOpenEditModal = (article: SupportKnowledgeArticle) => {
    setEditingArticle(article);
    form.resetFields();
    form.setFieldsValue({
      title: article.title,
      slug: article.slug,
      category: article.category,
      content: article.content,
      keywords: article.keywords ?? [],
      isFaq: article.is_faq,
      status: article.status,
    });
    setModalVisible(true);
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingArticle) {
        await adminSupportApi.updateArticle(editingArticle.id, values);
        message.success("Article updated successfully");
      } else {
        await adminSupportApi.createArticle(values);
        message.success("Article created and published to AI Assistant");
      }
      setModalVisible(false);
      await fetchArticles();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "errorFields" in err) return;
      message.error(getErrorMessage(err, "Failed to save article"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await adminSupportApi.deleteArticle(id);
      message.success("Article removed");
      await fetchArticles();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to delete article"));
    }
  };

  const columns: ColumnsType<SupportKnowledgeArticle> = [
    {
      title: "Title & Slug",
      key: "title",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            /{record.slug}
          </Text>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat: string) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: "FAQ",
      dataIndex: "is_faq",
      key: "is_faq",
      render: (isFaq: boolean) =>
        isFaq ? <Tag color="purple">FAQ Card</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const color = status === "PUBLISHED" ? "green" : status === "DRAFT" ? "orange" : "default";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Patient Feedback",
      key: "feedback",
      render: (_, record) => (
        <Space size="middle">
          <span style={{ color: "#52c41a", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <ThumbsUp size={13} /> {record.helpful_count || 0}
          </span>
          <span style={{ color: "#ff4d4f", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <ThumbsDown size={13} /> {record.not_helpful_count || 0}
          </span>
        </Space>
      ),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="text"
            icon={<Edit size={14} />}
            onClick={() => handleOpenEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this article?"
            description="AI Assistant will no longer be able to reference this article."
            onConfirm={() => { void handleDeleteArticle(record.id); }}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
      {/* Search & Actions Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="Search articles & keywords..."
            prefix={<Search size={15} color="#8c8c8c" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => { void fetchArticles(); }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="All Categories"
            allowClear
            style={{ width: 200 }}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={CATEGORIES}
          />
          <Button onClick={() => { void fetchArticles(); }}>Apply Filter</Button>
        </Space>
        <Button
          type="primary"
          icon={<Plus size={15} />}
          onClick={handleOpenCreateModal}
        >
          New Knowledge Article
        </Button>
      </div>

      {/* Articles Table */}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={articles}
        columns={columns}
        scroll={{ y: 'calc(100vh - 430px)', x: 'max-content' }}
        pagination={{ pageSize: 10 }}
      />

      {/* Create / Edit Article Modal */}
      <Modal
        title={editingArticle ? "Edit Knowledge Article" : "Create New Knowledge Article"}
        open={modalVisible}
        onOk={() => { void handleFormSubmit(); }}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="title"
            label="Article Title"
            rules={[{ required: true, message: "Please enter article title" }]}
          >
            <Input placeholder="e.g. How to prepare for fasting blood sugar test" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: "Please select category" }]}
              >
                <Select options={CATEGORIES} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "PUBLISHED", label: "Published (Visible to AI & Patients)" },
                    { value: "DRAFT", label: "Draft" },
                    { value: "ARCHIVED", label: "Archived" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="Content (Knowledge Base & AI Grounding Text)"
            rules={[{ required: true, message: "Please enter content" }]}
          >
            <TextArea
              rows={8}
              placeholder="Provide clear, accurate clinical guidelines or clinic policies. The AI Chatbot uses this exact text for grounding patient answers."
            />
          </Form.Item>

          <Form.Item
            name="keywords"
            label="Search Keywords & Aliases"
            tooltip="Comma-separated or press enter for tags (e.g. reschedule, timing, booking)"
          >
            <Select mode="tags" placeholder="Add keywords for search indexing..." />
          </Form.Item>

          <Form.Item
            name="isFaq"
            label="Promote to Patient FAQ Quick Card"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
