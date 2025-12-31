'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Workspace, WorkspaceMember, SpamReport } from '@/lib/types';

export default function HostDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [spamReports, setSpamReports] = useState<SpamReport[]>([]);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'spam'>('overview');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Initialize auth
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const userType = localStorage.getItem('userType');

    if (!storedToken || !storedUser || userType !== 'host') {
      router.push('/host/login');
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Load workspaces
  useEffect(() => {
    if (!token) return;

    const loadWorkspaces = async () => {
      try {
        const response = await fetch('/api/host/workspace', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.data) {
          setWorkspaces(data.data);
          if (data.data.length > 0 && !selectedWorkspace) {
            setSelectedWorkspace(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [token]);

  // Load workspace data when selected workspace changes
  useEffect(() => {
    if (!selectedWorkspace || !token) return;

    const loadWorkspaceData = async () => {
      // Load members
      const membersRes = await fetch(
        `/api/host/workspace/${selectedWorkspace.id}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const membersData = await membersRes.json();
      if (membersData.success) {
        setMembers(membersData.data || []);
      }

      // Load spam reports
      const spamRes = await fetch(
        `/api/host/workspace/${selectedWorkspace.id}/spam-reports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const spamData = await spamRes.json();
      if (spamData.success) {
        setSpamReports(spamData.data || []);
      }
    };

    loadWorkspaceData();
  }, [selectedWorkspace, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    router.push('/host/login');
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newWorkspaceName.trim()) {
      setCreateError('Workspace name is required');
      return;
    }

    if (!token) {
      setCreateError('No authentication token found. Please login again.');
      return;
    }

    setCreateLoading(true);

    console.log('Token:', token);
    console.log('Creating workspace with name:', newWorkspaceName);

    try {
      const response = await fetch('/api/host/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.data) {
        // Add new workspace to list
        setWorkspaces([data.data, ...workspaces]);
        setSelectedWorkspace(data.data);
        setNewWorkspaceName('');
        setShowCreateWorkspace(false);
      } else {
        setCreateError(data.error || 'Failed to create workspace');
      }
    } catch (error) {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Host Dashboard</h1>
              <p className="text-sm text-gray-600">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateWorkspace(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Workspace Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Workspaces</h2>
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <button
                    type="button"
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedWorkspace?.id === workspace.id
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-900 truncate">
                      {workspace.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {workspace.slug}
                    </div>
                  </button>
                ))}

                {workspaces.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No workspaces yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Details */}
          <div className="lg:col-span-3">
            {selectedWorkspace ? (
              <div className="bg-white rounded-lg shadow-sm">
                {/* Tabs */}
                <div className="border-b px-6 pt-6">
                  <div className="flex gap-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        activeTab === 'overview'
                          ? 'text-green-600 border-b-2 border-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('members')}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        activeTab === 'members'
                          ? 'text-green-600 border-b-2 border-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Members ({members.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('spam')}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        activeTab === 'spam'
                          ? 'text-green-600 border-b-2 border-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Spam Reports ({spamReports.length})
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedWorkspace.name}
                        </h2>
                        <p className="text-gray-600">
                          Slug: <span className="font-mono">{selectedWorkspace.slug}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">
                            Total Members
                          </div>
                          <div className="text-3xl font-bold text-blue-900 mt-1">
                            {members.length}
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-600 font-medium">
                            Spam Reports
                          </div>
                          <div className="text-3xl font-bold text-red-900 mt-1">
                            {spamReports.filter(r => r.status === 'pending').length}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Invite Code
                        </h3>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg">
                            {selectedWorkspace.inviteCode}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedWorkspace.inviteCode);
                              alert('Invite code copied!');
                            }}
                            className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'members' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Workspace Members
                      </h3>
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="p-4 border rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {member.user?.username || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.user?.email || 'No email'}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}

                        {members.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No members yet
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'spam' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Spam Reports
                      </h3>
                      <div className="space-y-2">
                        {spamReports.map((report) => (
                          <div
                            key={report.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium text-gray-900">
                                Reported by {report.reporter?.username || 'Unknown'}
                              </div>
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  report.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : report.status === 'reviewed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {report.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {report.reason}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(report.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}

                        {spamReports.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No spam reports
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No workspace selected
                </h3>
                <p className="text-gray-600">
                  Create a workspace to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Workspace
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateWorkspace(false);
                  setNewWorkspaceName('');
                  setCreateError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                  placeholder="My Awesome Community"
                  disabled={createLoading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  Choose a unique name for your chat community
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateWorkspace(false);
                    setNewWorkspaceName('');
                    setCreateError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {createLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
