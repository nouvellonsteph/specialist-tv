'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { User, AuthorizedDomain, AuditLogEntry, AVAILABLE_PERMISSIONS, ROLE_PERMISSIONS } from '@/services/user-manager';
import { getProxiedAvatarUrl } from '@/utils/avatar';

interface UserManagementProps {
  onClose?: () => void;
}

export function UserManagement({ onClose }: UserManagementProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'domains' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [domains, setDomains] = useState<AuthorizedDomain[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Form states
  const [userForm, setUserForm] = useState({
    role: 'viewer' as 'admin' | 'creator' | 'viewer',
    permissions: [] as string[],
  });
  const [domainForm, setDomainForm] = useState({
    domain: '',
    defaultRole: 'viewer' as 'admin' | 'creator' | 'viewer',
    defaultPermissions: [] as string[],
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as 'admin' | 'creator' | 'viewer',
    permissions: [] as string[],
    expiresInDays: 7,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to load users');
        const data = await response.json() as { users: User[] };
        setUsers(data.users);
      } else if (activeTab === 'domains') {
        const response = await fetch('/api/admin/domains');
        if (!response.ok) throw new Error('Failed to load domains');
        const data = await response.json() as { domains: AuthorizedDomain[] };
        setDomains(data.domains);
      } else if (activeTab === 'audit') {
        const response = await fetch('/api/admin/audit');
        if (!response.ok) throw new Error('Failed to load audit log');
        const data = await response.json() as { auditLog: AuditLogEntry[] };
        setAuditLog(data.auditLog);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUserAction = async (action: string, userId: string, data?: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...data }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Action failed');
      }
      
      await loadData();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleDomainAction = async (action: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Action failed');
      }
      
      await loadData();
      setShowDomainModal(false);
      setDomainForm({ domain: '', defaultRole: 'viewer', defaultPermissions: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleInviteUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_invitation', ...inviteForm }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Invitation failed');
      }
      
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer', permissions: [], expiresInDays: 7 });
      alert('Invitation created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation failed');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete_user', 
          userId: userToDelete.id 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Delete failed');
      }
      
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      await loadData(); // Refresh the user list
      alert('User deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      role: user.role,
      permissions: user.permissions,
    });
    setShowUserModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'creator': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'users', label: 'Users', count: users.length },
            { id: 'domains', label: 'Authorized Domains', count: domains.length },
            { id: 'audit', label: 'Audit Log', count: auditLog.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'users' | 'domains' | 'audit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Invite User
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map(user => (
                <li key={user.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {user.image ? (
                          <Image 
                            className="h-10 w-10 rounded-full" 
                            src={getProxiedAvatarUrl(user.image) || user.image} 
                            alt="User avatar" 
                            width={40} 
                            height={40}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openUserModal(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {session?.user?.id !== user.id && (
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Domains Tab */}
      {activeTab === 'domains' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Authorized Domains</h2>
            <button
              onClick={() => setShowDomainModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Domain
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {domains.map(domain => (
                <li key={domain.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{domain.domain}</div>
                      <div className="text-sm text-gray-600">
                        Default role: {domain.default_role} | 
                        Permissions: {domain.default_permissions.length}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(domain.default_role)}`}>
                        {domain.default_role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        domain.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {domain.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleDomainAction('remove_domain', { domainId: domain.id })}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h2>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {auditLog.map(entry => (
                <li key={entry.id}>
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{entry.action}</div>
                      <div className="text-sm text-gray-600">{formatDate(entry.created_at)}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-900">
                      {entry.target_user_id && (
                        <span>Target: {entry.target_user_id} | </span>
                      )}
                      Performed by: {entry.performed_by || 'System'}
                    </div>
                    {entry.ip_address && (
                      <div className="mt-1 text-xs text-gray-600">IP: {entry.ip_address}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit User: {selectedUser.name || selectedUser.email}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value as 'admin' | 'creator' | 'viewer';
                    setUserForm({
                      role: newRole,
                      permissions: ROLE_PERMISSIONS[newRole] || [],
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="viewer">Viewer</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Permissions</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={userForm.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission],
                            }));
                          } else {
                            setUserForm(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission),
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between space-x-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUserAction('update_role', selectedUser.id, { role: userForm.role })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Update Role
                  </button>
                  <button
                    onClick={() => handleUserAction('update_permissions', selectedUser.id, { permissions: userForm.permissions })}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Update Permissions
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  {selectedUser.is_active ? (
                    <button
                      onClick={() => handleUserAction('deactivate_user', selectedUser.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction('activate_user', selectedUser.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Add Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Authorized Domain</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Domain</label>
                <input
                  type="text"
                  placeholder="example.com"
                  value={domainForm.domain}
                  onChange={(e) => setDomainForm(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Default Role</label>
                <select
                  value={domainForm.defaultRole}
                  onChange={(e) => {
                    const newRole = e.target.value as 'admin' | 'creator' | 'viewer';
                    setDomainForm(prev => ({
                      ...prev,
                      defaultRole: newRole,
                      defaultPermissions: ROLE_PERMISSIONS[newRole] || [],
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="viewer">Viewer</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => handleDomainAction('add_domain', domainForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Domain
                </button>
                <button
                  onClick={() => setShowDomainModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite User</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value as 'admin' | 'creator' | 'viewer';
                    setInviteForm(prev => ({
                      ...prev,
                      role: newRole,
                      permissions: ROLE_PERMISSIONS[newRole] || [],
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="viewer">Viewer</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Expires in (days)</label>
                <input
                  type="number"
                  value={inviteForm.expiresInDays}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleInviteUser}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Send Invitation
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete User Account</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{userToDelete.name || userToDelete.email}</strong>? 
              This action cannot be undone and will permanently remove the user account and all associated data.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
