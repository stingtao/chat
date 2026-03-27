'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceRealtime } from '@/hooks/useWorkspaceRealtime';
import { getTranslations } from '@/lib/i18n';
import { useLang, useLangHref } from '@/hooks/useLang';
import { BlockedUser, HostUser, SpamReport, Workspace, WorkspaceMember } from '@/lib/types';
import ClientImage from '@/components/ui/ClientImage';

export default function HostDashboardPage() {
  const router = useRouter();
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<HostUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [spamReports, setSpamReports] = useState<SpamReport[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState({ messages: 0, groups: 0 });
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'spam' | 'settings'>('overview');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    logo: '',
    welcomeMessage: '',
    allowGroupChat: true,
    maxGroupSize: 100,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [moderationError, setModerationError] = useState('');
  const [pendingMemberActionUserId, setPendingMemberActionUserId] = useState<string | null>(null);
  const [pendingSpamActionId, setPendingSpamActionId] = useState<string | null>(null);
  const selectedWorkspaceId = selectedWorkspace?.id || null;

  // Initialize auth from cookie-backed session
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      setLoading(true);
      setAuthReady(false);

      try {
        const response = await fetch('/api/host/session');
        const data = (await response.json()) as {
          success: boolean;
          data?: HostUser;
        };

        if (cancelled) {
          return;
        }

        if (data.success && data.data) {
          setUser(data.data);
          setAuthReady(true);
          return;
        }

        setUser(null);
        setAuthReady(true);
        router.push(withLang('/host/login'));
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          setAuthReady(true);
          router.push(withLang('/host/login'));
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [router, withLang]);

  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/host/session');
        const data = (await response.json()) as {
          success: boolean;
          data?: HostUser;
        };

        if (cancelled || data.success) {
          return;
        }

        setUser(null);
        router.push(withLang('/host/login'));
      } catch {
        if (!cancelled) {
          setUser(null);
          router.push(withLang('/host/login'));
        }
      }
    };

    void verifySession();
    const interval = setInterval(() => {
      void verifySession();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authReady, router, user, withLang]);

  // Load workspaces
  useEffect(() => {
    if (!authReady || !user) return;

    const loadWorkspaces = async () => {
      try {
        const response = await fetch('/api/host/workspace');
        const data = (await response.json()) as {
          success: boolean;
          data?: Workspace[];
        };

        if (data.success && data.data) {
          const workspaceList = data.data;
          setWorkspaces(workspaceList);
          setSelectedWorkspace((currentWorkspace) => {
            if (workspaceList.length === 0) {
              return null;
            }

            if (!currentWorkspace) {
              return workspaceList[0];
            }

            return (
              workspaceList.find((workspace) => workspace.id === currentWorkspace.id) || workspaceList[0]
            );
          });
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadWorkspaces();
  }, [authReady, user]);

  // Load workspace data when selected workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId || !user) return;

    let cancelled = false;
    const loadWorkspaceData = async () => {
      setWorkspaceStats({ messages: 0, groups: 0 });
      setMembers([]);
      setSpamReports([]);
      setBlockedUsers([]);
      setModerationError('');
      setPendingMemberActionUserId(null);
      setPendingSpamActionId(null);

      try {
        const [detailRes, membersRes, spamRes, blockedRes] = await Promise.all([
          fetch(`/api/host/workspace/${selectedWorkspaceId}`),
          fetch(`/api/host/workspace/${selectedWorkspaceId}/members`),
          fetch(`/api/host/workspace/${selectedWorkspaceId}/spam-reports`),
          fetch(`/api/host/workspace/${selectedWorkspaceId}/block`),
        ]);

        const [detailData, membersData, spamData, blockedData] = await Promise.all([
          detailRes.json() as Promise<{
            success: boolean;
            data?: Workspace & { _count?: { messages?: number; groups?: number } };
          }>,
          membersRes.json() as Promise<{
            success: boolean;
            data?: WorkspaceMember[];
          }>,
          spamRes.json() as Promise<{
            success: boolean;
            data?: SpamReport[];
          }>,
          blockedRes.json() as Promise<{
            success: boolean;
            data?: BlockedUser[];
          }>,
        ]);

        if (cancelled) {
          return;
        }

        if (detailData.success && detailData.data?._count) {
          setWorkspaceStats({
            messages: detailData.data._count.messages || 0,
            groups: detailData.data._count.groups || 0,
          });
        }

        if (membersData.success) {
          setMembers(membersData.data || []);
        }

        if (spamData.success) {
          setSpamReports(spamData.data || []);
        }

        if (blockedData.success) {
          setBlockedUsers(blockedData.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load workspace data:', error);
        }
      }
    };

    void loadWorkspaceData();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, user]);

  useEffect(() => {
    if (!selectedWorkspace) return;

    setSettingsForm({
      name: selectedWorkspace.name,
      primaryColor: selectedWorkspace.settings?.primaryColor || '#3b82f6',
      secondaryColor: selectedWorkspace.settings?.secondaryColor || '#10b981',
      logo: selectedWorkspace.settings?.logo || '',
      welcomeMessage: selectedWorkspace.settings?.welcomeMessage || '',
      allowGroupChat: selectedWorkspace.settings?.allowGroupChat ?? true,
      maxGroupSize: selectedWorkspace.settings?.maxGroupSize ?? 100,
    });
    setSettingsError('');
    setSettingsSuccess('');
  }, [selectedWorkspace]);

  const upsertMember = (member: WorkspaceMember) => {
    setMembers((previousMembers) => {
      const nextMembers = previousMembers.filter(
        (currentMember) => currentMember.userId !== member.userId
      );
      nextMembers.push(member);
      nextMembers.sort(
        (left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime()
      );
      return nextMembers;
    });
  };

  const removeMember = (userId: string) => {
    setMembers((previousMembers) =>
      previousMembers.filter((member) => member.userId !== userId)
    );
  };

  const upsertSpamReport = (report: SpamReport) => {
    setSpamReports((previousReports) => {
      const nextReports = previousReports.filter((currentReport) => currentReport.id !== report.id);
      nextReports.push(report);
      nextReports.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      return nextReports;
    });
  };

  const upsertBlockedUser = (blockedUser: BlockedUser) => {
    setBlockedUsers((previousBlockedUsers) => {
      const nextBlockedUsers = previousBlockedUsers.filter(
        (currentBlockedUser) => currentBlockedUser.userId !== blockedUser.userId
      );
      nextBlockedUsers.push(blockedUser);
      nextBlockedUsers.sort(
        (left, right) =>
          new Date(right.blockedAt).getTime() - new Date(left.blockedAt).getTime()
      );
      return nextBlockedUsers;
    });
  };

  const removeBlockedUser = (userId: string) => {
    setBlockedUsers((previousBlockedUsers) =>
      previousBlockedUsers.filter((blockedUser) => blockedUser.userId !== userId)
    );
  };

  const { connected: workspaceRealtimeConnected } = useWorkspaceRealtime({
    enabled: Boolean(authReady && user && selectedWorkspaceId),
    workspaceId: selectedWorkspaceId,
    token: 'cookie-session',
    authType: 'host',
    onWorkspaceMemberJoined: ({ member }) => {
      upsertMember(member);
    },
    onWorkspaceMemberRemoved: ({ userId }) => {
      removeMember(userId);
    },
    onWorkspaceMemberUpdated: ({ member }) => {
      upsertMember(member);
    },
    onSpamReportCreated: ({ report }) => {
      upsertSpamReport(report);
    },
    onSpamReportUpdated: ({ report }) => {
      upsertSpamReport(report);
    },
    onWorkspaceMemberBlocked: ({ blockedUser }) => {
      removeMember(blockedUser.userId);
      upsertBlockedUser(blockedUser);
    },
    onWorkspaceMemberUnblocked: ({ userId }) => {
      removeBlockedUser(userId);
    },
  });

  const handleLogout = async () => {
    await fetch('/api/host/logout', { method: 'POST' });
    router.push(withLang('/host/login'));
  };

  const handleBlockMember = async (member: WorkspaceMember) => {
    if (!selectedWorkspaceId) return;

    setModerationError('');
    setPendingMemberActionUserId(member.userId);

    try {
      const response = await fetch(`/api/host/workspace/${selectedWorkspaceId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: member.userId }),
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: BlockedUser;
        error?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.error || t.hostDashboard.errors.blockFailed);
      }

      removeMember(member.userId);
      upsertBlockedUser(data.data);
    } catch (error) {
      setModerationError(
        error instanceof Error ? error.message : t.hostDashboard.errors.blockFailed
      );
    } finally {
      setPendingMemberActionUserId((currentUserId) =>
        currentUserId === member.userId ? null : currentUserId
      );
    }
  };

  const handleUnblockMember = async (userId: string) => {
    if (!selectedWorkspaceId) return;

    setModerationError('');
    setPendingMemberActionUserId(userId);

    try {
      const response = await fetch(`/api/host/workspace/${selectedWorkspaceId}/block`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: { userId?: string };
        error?: string;
      };

      if (!data.success || data.data?.userId !== userId) {
        throw new Error(data.error || t.hostDashboard.errors.unblockFailed);
      }

      removeBlockedUser(userId);
    } catch (error) {
      setModerationError(
        error instanceof Error ? error.message : t.hostDashboard.errors.unblockFailed
      );
    } finally {
      setPendingMemberActionUserId((currentUserId) =>
        currentUserId === userId ? null : currentUserId
      );
    }
  };

  const handleUpdateSpamStatus = async (
    reportId: string,
    status: Extract<SpamReport['status'], 'reviewed' | 'resolved'>
  ) => {
    if (!selectedWorkspaceId) return;

    setModerationError('');
    setPendingSpamActionId(reportId);

    try {
      const response = await fetch(`/api/host/workspace/${selectedWorkspaceId}/spam-reports`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId, status }),
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: SpamReport;
        error?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.error || t.hostDashboard.errors.updateSpamFailed);
      }

      upsertSpamReport(data.data);
    } catch (error) {
      setModerationError(
        error instanceof Error ? error.message : t.hostDashboard.errors.updateSpamFailed
      );
    } finally {
      setPendingSpamActionId((currentReportId) =>
        currentReportId === reportId ? null : currentReportId
      );
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newWorkspaceName.trim()) {
      setCreateError(t.hostDashboard.errors.workspaceNameRequired);
      return;
    }

    setCreateLoading(true);

    try {
      const response = await fetch('/api/host/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: Workspace;
        error?: string;
      };

      if (data.success && data.data) {
        const createdWorkspace = data.data;
        // Add new workspace to list
        setWorkspaces((previousWorkspaces) => [createdWorkspace, ...previousWorkspaces]);
        setSelectedWorkspace(createdWorkspace);
        setNewWorkspaceName('');
        setShowCreateWorkspace(false);
      } else {
        setCreateError(data.error || t.hostDashboard.errors.createFailed);
      }
    } catch (error) {
      setCreateError(t.hostDashboard.errors.networkError);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;

    const trimmedName = settingsForm.name.trim();
    if (!trimmedName) {
      setSettingsError(t.hostDashboard.errors.workspaceNameRequired);
      return;
    }

    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');

    try {
      if (trimmedName !== selectedWorkspace.name) {
        const nameResponse = await fetch(`/api/host/workspace/${selectedWorkspace.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: trimmedName }),
        });

        const nameData = (await nameResponse.json()) as {
          success: boolean;
          error?: string;
        };
        if (!nameData.success) {
          throw new Error(nameData.error || 'Failed to update workspace name');
        }
      }

      const settingsResponse = await fetch(`/api/host/workspace/${selectedWorkspace.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor: settingsForm.primaryColor,
          secondaryColor: settingsForm.secondaryColor,
          logo: settingsForm.logo || null,
          welcomeMessage: settingsForm.welcomeMessage || null,
          allowGroupChat: settingsForm.allowGroupChat,
          maxGroupSize: Number(settingsForm.maxGroupSize) || 100,
        }),
      });

      const settingsData = (await settingsResponse.json()) as {
        success: boolean;
        data?: Workspace['settings'];
        error?: string;
      };
      if (!settingsData.success) {
        throw new Error(settingsData.error || 'Failed to update settings');
      }

      const updatedWorkspace = {
        ...selectedWorkspace,
        name: trimmedName,
        settings: settingsData.data,
      };

      setSelectedWorkspace(updatedWorkspace);
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
        )
      );
      setSettingsSuccess(t.hostDashboard.settings.saved);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : t.hostDashboard.errors.saveFailed);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSettingsError(t.hostDashboard.errors.logoImageOnly);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      return;
    }

    setLogoUploading(true);
    setSettingsError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { url?: string };
        error?: string;
      };
      if (!data.success || !data.data?.url) {
        throw new Error(data.error || t.hostDashboard.errors.logoUploadFailed);
      }

      const uploadedLogoUrl = data.data.url;

      setSettingsForm((prev) => ({
        ...prev,
        logo: uploadedLogoUrl,
      }));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : t.hostDashboard.errors.logoUploadFailed);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!authReady) {
    return null;
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
              <h1 className="text-xl font-bold text-gray-900">{t.hostDashboard.title}</h1>
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
                {t.hostDashboard.createWorkspace}
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
              <h2 className="font-semibold text-gray-900 mb-4">{t.hostDashboard.workspacesTitle}</h2>
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
                    {t.hostDashboard.noWorkspaces}
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
                        {t.hostDashboard.tabs.overview}
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
                        {t.hostDashboard.tabs.members} ({members.length})
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
                        {t.hostDashboard.tabs.spam} ({spamReports.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`pb-3 px-1 font-medium transition-colors ${
                          activeTab === 'settings'
                            ? 'text-green-600 border-b-2 border-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t.hostDashboard.tabs.settings}
                      </button>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        workspaceRealtimeConnected
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {workspaceRealtimeConnected
                        ? t.hostDashboard.realtime.connected
                        : t.hostDashboard.realtime.disconnected}
                    </span>
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
                          {t.hostDashboard.overview.slugLabel}:{' '}
                          <span className="font-mono">{selectedWorkspace.slug}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">
                            {t.hostDashboard.overview.totalMembers}
                          </div>
                          <div className="text-3xl font-bold text-blue-900 mt-1">
                            {members.length}
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <div className="text-sm text-indigo-600 font-medium">
                            {t.hostDashboard.overview.totalMessages}
                          </div>
                          <div className="text-3xl font-bold text-indigo-900 mt-1">
                            {workspaceStats.messages}
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg">
                          <div className="text-sm text-emerald-600 font-medium">
                            {t.hostDashboard.overview.totalGroups}
                          </div>
                          <div className="text-3xl font-bold text-emerald-900 mt-1">
                            {workspaceStats.groups}
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-600 font-medium">
                            {t.hostDashboard.overview.spamReports}
                          </div>
                          <div className="text-3xl font-bold text-red-900 mt-1">
                            {spamReports.filter(r => r.status === 'pending').length}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {t.hostDashboard.overview.inviteCode}
                        </h3>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg">
                            {selectedWorkspace.inviteCode}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedWorkspace.inviteCode);
                              alert(t.hostDashboard.overview.copied);
                            }}
                            className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            {t.hostDashboard.overview.copy}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'members' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {t.hostDashboard.members.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {t.hostDashboard.members.subtitle(blockedUsers.length)}
                        </p>
                      </div>

                      {moderationError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {moderationError}
                        </div>
                      )}

                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-4 rounded-lg border p-4"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {member.user?.username || t.common.unknown}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.user?.email || t.common.noEmail}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-500">
                                {t.hostDashboard.members.joined(
                                  new Date(member.joinedAt).toLocaleDateString()
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleBlockMember(member)}
                                disabled={pendingMemberActionUserId === member.userId}
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingMemberActionUserId === member.userId
                                  ? t.hostDashboard.members.blocking
                                  : t.hostDashboard.members.block}
                              </button>
                            </div>
                          </div>
                        ))}

                        {members.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            {t.hostDashboard.members.empty}
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-6">
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900">
                            {t.hostDashboard.members.blockedTitle} ({blockedUsers.length})
                          </h4>
                          <p className="text-sm text-gray-500">
                            {t.hostDashboard.members.blockedSubtitle}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {blockedUsers.map((blockedUser) => (
                            <div
                              key={blockedUser.id}
                              className="flex items-center justify-between gap-4 rounded-lg border border-red-100 bg-red-50/40 p-4"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900">
                                  {blockedUser.user?.username || t.common.unknown}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {blockedUser.user?.email || t.common.noEmail}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {t.hostDashboard.members.blockedAt(
                                    new Date(blockedUser.blockedAt).toLocaleString()
                                  )}
                                </div>
                                {blockedUser.reason && (
                                  <div className="mt-1 text-sm text-gray-600">
                                    {t.hostDashboard.members.reason(blockedUser.reason)}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleUnblockMember(blockedUser.userId)}
                                disabled={pendingMemberActionUserId === blockedUser.userId}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingMemberActionUserId === blockedUser.userId
                                  ? t.hostDashboard.members.unblocking
                                  : t.hostDashboard.members.unblock}
                              </button>
                            </div>
                          ))}

                          {blockedUsers.length === 0 && (
                            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-gray-500">
                              {t.hostDashboard.members.blockedEmpty}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'spam' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {t.hostDashboard.spam.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {t.hostDashboard.spam.subtitle}
                        </p>
                      </div>

                      {moderationError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {moderationError}
                        </div>
                      )}

                      <div className="space-y-2">
                        {spamReports.map((report) => (
                          <div
                            key={report.id}
                            className="rounded-lg border p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium text-gray-900">
                                {t.hostDashboard.spam.reportedBy(
                                  report.reporter?.username || t.common.unknown
                                )}
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
                                {t.hostDashboard.spam.status[report.status] || report.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {report.reason}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(report.createdAt).toLocaleString()}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleUpdateSpamStatus(report.id, 'reviewed')}
                                disabled={
                                  pendingSpamActionId === report.id ||
                                  report.status === 'reviewed' ||
                                  report.status === 'resolved'
                                }
                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingSpamActionId === report.id
                                  ? t.hostDashboard.spam.updating
                                  : t.hostDashboard.spam.markReviewed}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleUpdateSpamStatus(report.id, 'resolved')}
                                disabled={
                                  pendingSpamActionId === report.id ||
                                  report.status === 'resolved'
                                }
                                className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {pendingSpamActionId === report.id
                                  ? t.hostDashboard.spam.updating
                                  : t.hostDashboard.spam.markResolved}
                              </button>
                            </div>
                          </div>
                        ))}

                        {spamReports.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            {t.hostDashboard.spam.empty}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {t.hostDashboard.settings.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {t.hostDashboard.settings.subtitle}
                        </p>
                      </div>

                      {settingsError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                          {settingsError}
                        </div>
                      )}

                      {settingsSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                          {settingsSuccess}
                        </div>
                      )}

                      <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t.hostDashboard.settings.workspaceNameLabel}
                          </label>
                          <input
                            type="text"
                            value={settingsForm.name}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                            placeholder={t.hostDashboard.settings.workspaceNameLabel}
                            maxLength={60}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t.hostDashboard.settings.primaryColor}
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={settingsForm.primaryColor}
                                onChange={(e) =>
                                  setSettingsForm((prev) => ({
                                    ...prev,
                                    primaryColor: e.target.value,
                                  }))
                                }
                                className="h-12 w-12 rounded-lg border border-gray-200"
                              />
                              <input
                                type="text"
                                value={settingsForm.primaryColor}
                                onChange={(e) =>
                                  setSettingsForm((prev) => ({
                                    ...prev,
                                    primaryColor: e.target.value,
                                  }))
                                }
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                placeholder="#3b82f6"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t.hostDashboard.settings.secondaryColor}
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={settingsForm.secondaryColor}
                                onChange={(e) =>
                                  setSettingsForm((prev) => ({
                                    ...prev,
                                    secondaryColor: e.target.value,
                                  }))
                                }
                                className="h-12 w-12 rounded-lg border border-gray-200"
                              />
                              <input
                                type="text"
                                value={settingsForm.secondaryColor}
                                onChange={(e) =>
                                  setSettingsForm((prev) => ({
                                    ...prev,
                                    secondaryColor: e.target.value,
                                  }))
                                }
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                placeholder="#10b981"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-center">
                          <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden relative">
                            {settingsForm.logo ? (
                              <ClientImage
                                src={settingsForm.logo}
                                alt={t.hostDashboard.settings.logoLabel}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm text-gray-500">{t.hostDashboard.settings.logoFallback}</span>
                            )}
                          </div>
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              {t.hostDashboard.settings.logoLabel}
                            </label>
                            <input
                              type="text"
                              value={settingsForm.logo}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, logo: e.target.value }))
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              placeholder={t.hostDashboard.settings.logoPlaceholder}
                            />
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                              disabled={logoUploading}
                            >
                              {logoUploading ? t.hostDashboard.settings.uploading : t.hostDashboard.settings.uploadImage}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t.hostDashboard.settings.welcomeMessageLabel}
                          </label>
                          <textarea
                            value={settingsForm.welcomeMessage}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...prev,
                                welcomeMessage: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                            rows={3}
                            maxLength={200}
                            placeholder={t.hostDashboard.settings.welcomeMessageLabel}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 p-4 border rounded-lg">
                            <input
                              type="checkbox"
                              checked={settingsForm.allowGroupChat}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({
                                  ...prev,
                                  allowGroupChat: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 text-green-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{t.hostDashboard.settings.enableGroupChat}</span>
                          </label>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t.hostDashboard.settings.maxGroupSize}
                            </label>
                            <input
                              type="number"
                              min={2}
                              max={500}
                              value={settingsForm.maxGroupSize}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({
                                  ...prev,
                                  maxGroupSize: Number(e.target.value),
                                }))
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              disabled={!settingsForm.allowGroupChat}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            disabled={settingsLoading}
                          >
                            {settingsLoading ? t.hostDashboard.settings.saving : t.hostDashboard.settings.save}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsForm((prev) => ({
                                ...prev,
                                primaryColor: '#3b82f6',
                                secondaryColor: '#10b981',
                                welcomeMessage: '',
                                logo: '',
                                allowGroupChat: true,
                                maxGroupSize: 100,
                              }))
                            }
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            disabled={settingsLoading}
                          >
                            {t.hostDashboard.settings.resetDefaults}
                          </button>
                        </div>
                      </form>
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
                  {t.hostDashboard.noWorkspace.title}
                </h3>
                <p className="text-gray-600">
                  {t.hostDashboard.noWorkspace.subtitle}
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
                {t.hostDashboard.modal.title}
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
                  {t.hostDashboard.modal.workspaceNameLabel}
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                  placeholder={t.hostDashboard.modal.workspaceNamePlaceholder}
                  disabled={createLoading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t.hostDashboard.modal.workspaceNameHelper}
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
                  {t.hostDashboard.modal.cancel}
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {createLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{t.hostDashboard.modal.creating}</span>
                    </div>
                  ) : (
                    t.hostDashboard.modal.create
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
