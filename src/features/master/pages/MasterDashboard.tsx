/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable react-hooks/set-state-in-effect */

/* eslint-disable react-hooks/immutability */

import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/routes';
import { apiClient } from '@/shared/api/client';

const { Text } = Typography;
const { Option } = Select;

interface TenantAdmin {
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  database_name: string;
  admin_id: string | null;
  username: string | null;
  admin_status: 'ACTIVE' | 'INACTIVE' | null;
  phone?: string | null;
  admin_role?: string | null;
}

interface Tenant {
  id: string;
  tenant_code: string;
  tenant_name: string;
  database_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export function MasterDashboard() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  useEffect(() => {
    if (!localStorage.getItem('hms_master_auth')) navigate(ROUTES.masterLogin);
  }, [navigate]);

  const [activeTab, setActiveTab] = useState<'hospitals' | 'admins' | 'admin_users'>('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterStatus]);

  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [provisionForm] = Form.useForm();
  const [createAdminForm] = Form.useForm();
  const [editAdminForm] = Form.useForm();
  const [editTenantForm] = Form.useForm();
  const [adminUserForm] = Form.useForm();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [tenantAdmins, setTenantAdmins] = useState<TenantAdmin[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<TenantAdmin | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);


  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [isAdminUserModalOpen, setIsAdminUserModalOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [auSaving, setAuSaving] = useState(false);

  const fetchAdminUsers = async () => {
    setAdminUsersLoading(true);
    try {
      const res = await apiClient.get('/master/admin-users');
      setAdminUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const openCreateAdminUser = () => {
    setEditingAdminUser(null);
    adminUserForm.resetFields();
    adminUserForm.setFieldsValue({ role: 'Viewer', status: 'ACTIVE' });
    setIsAdminUserModalOpen(true);
  };

  const openEditAdminUser = (u: AdminUser) => {
    setEditingAdminUser(u);
    adminUserForm.setFieldsValue({ name: u.name, email: u.email, role: u.role, status: u.status });
    setIsAdminUserModalOpen(true);
  };

  const handleSaveAdminUser = async (values: Record<string, any>) => {
    setAuSaving(true);
    try {
      if (editingAdminUser) {
        await apiClient.put(`/master/admin-users/${editingAdminUser.id}`, {
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
        });
        if (values.password?.trim().length >= 6) {
          await apiClient.put(
            `/master/admin-users/${editingAdminUser.id}/password`,
            { password: values.password }
          );
        }
      } else {
        await apiClient.post('/master/admin-users', values);
      }
      setIsAdminUserModalOpen(false);
      fetchAdminUsers();
      message.success(editingAdminUser ? 'Master user updated.' : 'Master user created.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        message.error(err.response.data.error || 'Failed to save master user');
      } else {
        message.error('Network error');
      }
    } finally {
      setAuSaving(false);
    }
  };

  const handleDeleteAdminUser = (u: AdminUser) => {
    modal.confirm({
      title: 'Delete Master User',
      content: `Are you sure you want to remove ${u.name} (${u.email})? This cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiClient.delete(`/master/admin-users/${u.id}`);
          fetchAdminUsers();
          message.success('Master user deleted.');
        } catch {
          message.error('Failed to delete master user');
        }
      },
    });
  };

  const toggleAdminUserStatus = async (u: AdminUser) => {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.put(`/master/admin-users/${u.id}`, { status: newStatus });
      fetchAdminUsers();
    } catch {
      message.error('Network error');
    }
  };

  const toggleTenantAdminStatus = async (a: TenantAdmin) => {
    if (!a.admin_id) return;
    const newStatus = a.admin_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.put(`/master/tenant-admins/${a.admin_id}/status`, { status: newStatus });
      fetchTenantAdmins();
    } catch {
      message.error('Network error');
    }
  };

  useEffect(() => {
    if (activeTab === 'hospitals') fetchTenants();
    else if (activeTab === 'admins') fetchTenantAdmins();
    else fetchAdminUsers();
    setSearchQuery('');
    setFilterStatus('ALL');
  }, [activeTab]);

  const handleLogout = () => {
    ['hms_master_auth', 'hms_master_token', 'hms_master_role', 'hms_master_name'].forEach((k) =>
      localStorage.removeItem(k),
    );
    navigate(ROUTES.masterLogin);
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/master/tenants');
      setTenants(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/master/tenant-admins');
      setTenantAdmins(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (values: Record<string, any>) => {
    setIsProvisioning(true);
    try {
      await apiClient.post('/master/tenants', {
        tenantName: values.tenantName,
        databaseName: values.databaseName,
        status: values.status,
      });
      provisionForm.resetFields();
      setIsProvisionModalOpen(false);
      fetchTenants();
      message.success('Hospital and Database provisioned!');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        message.error(err.response.data.error || 'Failed to create tenant');
      } else {
        message.error('Network error');
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleDeleteTenant = (t: Tenant) => {
    modal.confirm({
      title: 'Delete Hospital',
      content: `Delete "${t.tenant_name}"? This will permanently drop the "${t.database_name}" database.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiClient.delete(`/master/tenants/${t.id}`);
          fetchTenants();
          message.success('Tenant deleted.');
        } catch (err) {
          message.error('Failed to delete tenant');
        }
      },
    });
  };

  const handleCreateAdmin = async (values: Record<string, any>) => {
    setIsCreating(true);
    try {
      await apiClient.post('/master/tenant-admins', {
        tenantId: values.tenantId,
        username: values.username,
        password: values.password,
        phone: values.phone,
        role: values.role,
        status: values.status,
      });
      createAdminForm.resetFields();
      setIsCreateAdminModalOpen(false);
      fetchTenantAdmins();
      message.success('Admin login created.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        message.error(err.response.data.error || 'Failed to create admin');
      } else {
        message.error('Network error');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAdmin = async (values: Record<string, any>) => {
    if (!editingAdmin) return;
    setIsEditing(true);
    try {
      await apiClient.put(
        `/master/tenant-admins/${editingAdmin.admin_id}`,
        {
          username: values.username,
          ...(values.password && values.password.trim().length >= 6
            ? { password: values.password }
            : {}),
          phone: values.phone,
          role: values.role,
          status: values.status,
        }
      );
      setEditingAdmin(null);
      fetchTenantAdmins();
      message.success('Admin updated.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        message.error(err.response.data.error || 'Failed to update admin');
      } else {
        message.error('Network error');
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteAdmin = (a: TenantAdmin) => {
    modal.confirm({
      title: 'Delete Admin Login',
      content: `Are you sure you want to delete the admin "${a.username}" for hospital "${a.tenant_name}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiClient.delete(`/master/tenant-admins/${a.admin_id}`);
          fetchTenantAdmins();
          message.success('Admin login deleted.');
        } catch (err) {
          if (axios.isAxiosError(err) && err.response) {
            message.error(err.response.data.error || 'Failed to delete admin');
          } else {
            message.error('Network error');
          }
        }
      },
    });
  };

  const handleUpdateTenant = async (values: Record<string, any>) => {
    if (!editingTenant) return;
    setIsEditing(true);
    try {
      await apiClient.put(`/master/tenants/${editingTenant.id}`, {
        tenantName: values.tenantName,
        status: values.status,
      });
      setEditingTenant(null);
      fetchTenants();
      message.success('Hospital updated.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        message.error(err.response.data.error || 'Failed to update tenant');
      } else {
        message.error('Network error');
      }
    } finally {
      setIsEditing(false);
    }
  };

  const tenantsWithoutAdmin = tenantAdmins.filter((t) => !t.admin_id);
  const filteredTenants = tenants.filter(
    (t) =>
      (t.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tenant_code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'ALL' || t.status === filterStatus),
  );
  const filteredAdmins = tenantAdmins.filter(
    (a) =>
      a.admin_id &&
      (a.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.username?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'ALL' || a.admin_status === filterStatus),
  );
  const filteredAdminUsers = adminUsers.filter(
    (u) =>
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'ALL' || u.status === filterStatus),
  );

  const totalItems =
    activeTab === 'hospitals'
      ? filteredTenants.length
      : activeTab === 'admins'
        ? filteredAdmins.length
        : filteredAdminUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const hospitalColumns: ColumnsType<Tenant> = [
    {
      title: 'Hospital Name',
      dataIndex: 'tenant_name',
      key: 'hospital_name',
      render: (v: string) => (
        <Text strong style={{ fontSize: 13 }}>
          {v}
        </Text>
      ),
    },
    {
      title: 'Tenant Code',
      dataIndex: 'tenant_code',
      key: 'tenant_code',
      render: (v: string) => (
        <Tag color="cyan" style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Database',
      dataIndex: 'database_name',
      key: 'db',
      render: (v: string) => (
        <Tag
          style={{
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            fontSize: 11,
          }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Badge
          status={v === 'ACTIVE' ? 'success' : 'error'}
          text={<span style={{ fontSize: 11, fontWeight: 600 }}>{v}</span>}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: any, t: Tenant) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingTenant(t);
                editTenantForm.setFieldsValue({ tenantName: t.tenant_name, status: t.status });
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteTenant(t)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const adminColumns: ColumnsType<TenantAdmin> = [
    {
      title: 'Hospital Name',
      key: 'hospital',
      render: (_: any, a: TenantAdmin) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {a.tenant_name}
          </Text>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
            {a.tenant_code}
          </div>
        </div>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'admin_status',
      key: 'admin_status',
      render: (v: string, a: TenantAdmin) => (
        <Tag
          color={v === 'ACTIVE' ? 'green' : 'red'}
          style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          onClick={() => toggleTenantAdminStatus(a)}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: any, a: TenantAdmin) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingAdmin(a);
                editAdminForm.setFieldsValue({
                  username: a.username,
                  password: '',
                  phone: a.phone,
                  role: a.admin_role || 'SUPER_ADMIN',
                  status: a.admin_status || 'ACTIVE',
                });
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteAdmin(a)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const adminUserColumns: ColumnsType<AdminUser> = [
    {
      title: 'Name',
      key: 'name',
      render: (_: any, u: AdminUser) => (
        <Space>
          <Avatar
            size={28}
            style={{ background: '#eef2ff', color: '#4f46e5', fontWeight: 700, fontSize: 11 }}
          >
            {u.name.charAt(0).toUpperCase()}
          </Avatar>
          <Text strong style={{ fontSize: 13 }}>
            {u.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => <Text style={{ fontSize: 13, color: '#64748b' }}>{v}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => (
        <Tag color="purple" style={{ fontSize: 11, fontWeight: 600 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, u: AdminUser) => (
        <Tag
          color={u.status === 'ACTIVE' ? 'green' : 'red'}
          style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          onClick={() => toggleAdminUserStatus(u)}
        >
          {u.status}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(v).toLocaleDateString()}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: any, u: AdminUser) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditAdminUser(u)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteAdminUser(u)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const masterName = localStorage.getItem('hms_master_name') || 'Administrator';
  const masterRole = localStorage.getItem('hms_master_role') || 'Super Admin';

  const navItems = [
    { key: 'hospitals' as const, icon: <BankOutlined />, label: 'Hospitals & DBs' },
    { key: 'admins' as const, icon: <LockOutlined />, label: 'Admin Logins' },
    { key: 'admin_users' as const, icon: <TeamOutlined />, label: 'Master Users' },
  ];

  const activeData =
    activeTab === 'hospitals'
      ? filteredTenants
      : activeTab === 'admins'
        ? filteredAdmins
        : filteredAdminUsers;
  const activeColumns =
    activeTab === 'hospitals'
      ? hospitalColumns
      : activeTab === 'admins'
        ? (adminColumns as any)
        : (adminUserColumns as any);
  const paginatedData = (activeData as any[]).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const btnStyle = {
    background: '#0891b2',
    border: 'none',
    boxShadow: '0 4px 14px rgba(8,145,178,0.35)',
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8FAFC', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: isSidebarOpen ? 256 : 80,
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          transition: 'width 0.25s',
          zIndex: 20,
          boxShadow: '1px 0 6px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              padding: '0 16px',
              justifyContent: isSidebarOpen ? 'space-between' : 'center',
            }}
          >
            {isSidebarOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: '#0891b2',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  H
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>HMS Master</span>
              </div>
            )}
            <Button
              type="text"
              size="small"
              icon={<MenuOutlined style={{ color: '#94a3b8' }} />}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
          <div style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: isSidebarOpen ? '10px 14px' : '10px 0',
                    justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                    border: 'none',
                    borderRight: isActive ? '2px solid #0891b2' : '2px solid transparent',
                    borderRadius: 0,
                    background: isActive ? '#ecfeff' : 'transparent',
                    color: isActive ? '#0891b2' : '#64748b',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    width: '100%',
                    outline: 'none',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #f1f5f9' }}>
          {isSidebarOpen ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                padding: '0 4px',
              }}
            >
              <Avatar
                style={{ background: '#cffafe', color: '#0891b2', fontWeight: 700, flexShrink: 0 }}
              >
                {masterName.substring(0, 2).toUpperCase()}
              </Avatar>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {masterName}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{masterRole}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Tooltip title={`${masterName} (${masterRole})`}>
                <Avatar style={{ background: '#cffafe', color: '#0891b2', fontWeight: 700 }}>
                  {masterName.substring(0, 2).toUpperCase()}
                </Avatar>
              </Tooltip>
            </div>
          )}
          <Button
            type="text"
            icon={<LogoutOutlined style={{ color: '#f43f5e' }} />}
            onClick={handleLogout}
            style={{
              width: '100%',
              color: '#f43f5e',
              fontWeight: 600,
              fontSize: 13,
              justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isSidebarOpen && 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* HEADER */}
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            height: 56,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
              {activeTab === 'hospitals'
                ? 'Hospitals & DBs'
                : activeTab === 'admins'
                  ? 'Admin Logins'
                  : 'Master Users'}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {activeTab === 'hospitals'
                ? 'Manage all provisioned hospital instances.'
                : activeTab === 'admins'
                  ? 'Manage Master Admin credentials for hospitals.'
                  : 'Manage platform-level master user accounts.'}
            </span>
          </div>
          <Space size={12}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 14 }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="middle"
              style={{ width: 280, fontSize: 14 }}
            />
            {activeTab === 'hospitals' && (
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                onClick={() => {
                  provisionForm.resetFields();
                  provisionForm.setFieldsValue({ status: 'ACTIVE' });
                  setIsProvisionModalOpen(true);
                }}
                style={btnStyle}
              >
                New Hospital
              </Button>
            )}
            {activeTab === 'admins' && (
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                onClick={() => {
                  createAdminForm.resetFields();

                  setIsCreateAdminModalOpen(true);
                }}
                style={btnStyle}
              >
                New Admin
              </Button>
            )}
            {activeTab === 'admin_users' && (
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                onClick={openCreateAdminUser}
                style={btnStyle}
              >
                New Member
              </Button>
            )}
          </Space>
        </header>

        {/* FILTER BAR */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <Select
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            size="middle"
            style={{ width: 160, fontSize: 13 }}
          >
            <Option value="ALL">All Statuses</Option>
            <Option value="ACTIVE">Active</Option>
            <Option value="INACTIVE">Inactive</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button
            type="text"
            size="middle"
            style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('ALL');
            }}
          >
            Reset
          </Button>
        </div>

        {/* TABLE */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#F8FAFC' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <Table
              columns={activeColumns}
              dataSource={paginatedData}
              rowKey={activeTab === 'admins' ? 'admin_id' : 'id'}
              loading={loading || adminUsersLoading}
              size="small"
              pagination={false}
              rowSelection={{ type: 'checkbox' }}
            />
          </div>
        </div>

        {/* PAGINATION */}
        <div
          style={{
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.04)',
          }}
        >
          <Text style={{ fontSize: 11, color: '#94a3b8' }}>
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </Text>
          <Space size={4}>
            <Button
              size="small"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{ fontSize: 11 }}
            >
              « First
            </Button>
            <Button
              size="small"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ fontSize: 11 }}
            >
              ‹ Prev
            </Button>
            <span style={{ fontSize: 11, color: '#64748b', padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="small"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{ fontSize: 11 }}
            >
              Next ›
            </Button>
            <Button
              size="small"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              style={{ fontSize: 11 }}
            >
              Last »
            </Button>
          </Space>
        </div>
      </main>

      {/* MODALS */}

      <Modal
        title="🏥 Provision Hospital"
        open={isProvisionModalOpen}
        onCancel={() => setIsProvisionModalOpen(false)}
        footer={null}
        width={460}
      >
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          Create a new tenant and initialize their isolated database.
        </p>
        <Form form={provisionForm} layout="vertical" onFinish={handleCreateTenant}>
          <Form.Item label="Hospital Name" name="tenantName" rules={[{ required: true }]}>
            <Input placeholder="e.g. Cauvery Hospital" />
          </Form.Item>
          <Form.Item
            label="Database Name"
            name="databaseName"
            rules={[
              { required: true },
              { pattern: /^[a-zA-Z0-9_]+$/, message: 'Only alphanumeric and underscores allowed' },
            ]}
          >
            <Input placeholder="e.g. hms_cauvery" />
          </Form.Item>
          <Form.Item label="Status" name="status" initialValue="ACTIVE">
            <Select>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isProvisioning}
              style={{ ...btnStyle, height: 42, fontWeight: 700 }}
            >
              {isProvisioning ? 'Provisioning DB...' : 'Create Hospital & DB'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="🔐 Create New Admin Login"
        open={isCreateAdminModalOpen}
        onCancel={() => setIsCreateAdminModalOpen(false)}
        footer={null}
        width={480}
      >
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          Assign master admin credentials to a hospital.
        </p>
        <Form form={createAdminForm} layout="vertical" onFinish={handleCreateAdmin}>
          <Form.Item
            label="Hospital / Tenant"
            name="tenantId"
            rules={[{ required: true, message: 'Please select a hospital' }]}
          >
            <Select
              placeholder="-- Select a hospital --"

            >
              {tenantsWithoutAdmin.map((t) => (
                <Option key={t.tenant_id} value={t.tenant_id}>
                  {t.tenant_name} ({t.tenant_code})
                </Option>
              ))}
            </Select>
          </Form.Item>
          {tenantsWithoutAdmin.length === 0 && (
            <p style={{ color: '#10b981', fontSize: 12, marginBottom: 12 }}>
              All hospitals already have an Admin Login assigned.
            </p>
          )}
          <Form.Item label="Username" name="username" rules={[{ required: true }]}>
            <Input placeholder="e.g. cauvery_admin" autoComplete="off" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password placeholder="Enter a new password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Phone Number" name="phone">
            <Input placeholder="Optional: +1234567890" />
          </Form.Item>
          <Form.Item label="Role" name="role" initialValue="SUPER_ADMIN">
            <Select>
              <Option value="SUPER_ADMIN">SUPER_ADMIN</Option>
              <Option value="ADMIN">ADMIN</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Status" name="status" initialValue="ACTIVE">
            <Select>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isCreating}
              style={{ ...btnStyle, height: 42, fontWeight: 700 }}
            >
              Create Admin Login
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="✏️ Edit Admin Login"
        open={!!editingAdmin}
        onCancel={() => setEditingAdmin(null)}
        footer={null}
        width={480}
      >
        {editingAdmin && (
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
            Updating credentials for{' '}
            <strong style={{ color: '#334155' }}>{editingAdmin.tenant_name}</strong>
          </p>
        )}
        <Form form={editAdminForm} layout="vertical" onFinish={handleUpdateAdmin}>
          <Form.Item label="Hospital / Tenant">
            <Input
              value={
                editingAdmin ? `${editingAdmin.tenant_name} (${editingAdmin.tenant_code})` : ''
              }
              disabled
            />
          </Form.Item>
          <Form.Item label="Username" name="username" rules={[{ required: true }]}>
            <Input placeholder="e.g. admin_user" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={
              <span>
                Password{' '}
                <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                  (Leave blank to keep current)
                </span>
              </span>
            }
            name="password"
          >
            <Input.Password placeholder="Leave blank to keep current" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Phone Number" name="phone">
            <Input placeholder="Optional: +1234567890" />
          </Form.Item>
          <Form.Item label="Role" name="role">
            <Select>
              <Option value="SUPER_ADMIN">SUPER_ADMIN</Option>
              <Option value="ADMIN">ADMIN</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isEditing}
              style={{ ...btnStyle, height: 42, fontWeight: 700 }}
            >
              Update Admin Login
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Hospital"
        open={!!editingTenant}
        onCancel={() => setEditingTenant(null)}
        footer={null}
        width={400}
      >
        <Form
          form={editTenantForm}
          layout="vertical"
          onFinish={handleUpdateTenant}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="Hospital Name" name="tenantName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%' }}>
              <Button onClick={() => setEditingTenant(null)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isEditing}
                style={{ ...btnStyle, flex: 1, fontWeight: 700 }}
              >
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAdminUser ? '✏️ Edit Master User' : '👥 New Master User'}
        open={isAdminUserModalOpen}
        onCancel={() => setIsAdminUserModalOpen(false)}
        footer={null}
        width={480}
      >
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          {editingAdminUser ? 'Update master user details.' : 'Create a new platform master user.'}
        </p>
        <Form form={adminUserForm} layout="vertical" onFinish={handleSaveAdminUser}>
          <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. John Smith" />
          </Form.Item>
          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="e.g. john@hospital.com" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={
              <span>
                Password{' '}
                {editingAdminUser && (
                  <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                    (Leave blank to keep current)
                  </span>
                )}
              </span>
            }
            name="password"
            rules={editingAdminUser ? [] : [{ required: true }, { min: 6 }]}
          >
            <Input.Password placeholder="Enter a secure password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Role" name="role" initialValue="Viewer">
            <Select>
              <Option value="Super Admin">Super Admin</Option>
              <Option value="Admin">Admin</Option>
              <Option value="Manager">Manager</Option>
              <Option value="Viewer">Viewer</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Status" name="status" initialValue="ACTIVE">
            <Select>
              <Option value="ACTIVE">ACTIVE</Option>
              <Option value="INACTIVE">INACTIVE</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%' }}>
              <Button onClick={() => setIsAdminUserModalOpen(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={auSaving}
                style={{ ...btnStyle, flex: 1, fontWeight: 700 }}
              >
                {auSaving ? 'Saving...' : editingAdminUser ? 'Save Changes' : 'Create User'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
