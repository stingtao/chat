import { ApiResponse } from './types';

export class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string = '', token: string | null = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  // Workspace APIs
  async getWorkspaces() {
    return this.request('/api/client/workspaces', { method: 'GET' });
  }

  async joinWorkspace(inviteCode: string) {
    return this.request('/api/client/workspace/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.request(`/api/client/workspace/${workspaceId}/members`, {
      method: 'GET',
    });
  }

  // Message APIs
  async getMessages(workspaceId: string, receiverId?: string, groupId?: string) {
    const params = new URLSearchParams({ workspaceId });
    if (receiverId) params.append('receiverId', receiverId);
    if (groupId) params.append('groupId', groupId);

    return this.request(`/api/client/messages?${params}`, { method: 'GET' });
  }

  async sendMessage(data: {
    workspaceId: string;
    content: string;
    receiverId?: string;
    groupId?: string;
    type?: string;
    fileUrl?: string;
  }) {
    return this.request('/api/client/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Friend APIs
  async getFriends(workspaceId: string) {
    return this.request(`/api/client/friends?workspaceId=${workspaceId}`, {
      method: 'GET',
    });
  }

  async sendFriendRequest(workspaceId: string, receiverId: string) {
    return this.request('/api/client/friends', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, receiverId }),
    });
  }

  async respondToFriendRequest(friendshipId: string, status: 'accepted' | 'rejected') {
    return this.request('/api/client/friends', {
      method: 'PUT',
      body: JSON.stringify({ friendshipId, status }),
    });
  }

  async getFriendRequests(workspaceId: string) {
    return this.request(`/api/client/friends/requests?workspaceId=${workspaceId}`, {
      method: 'GET',
    });
  }

  // Group APIs
  async getGroups(workspaceId: string) {
    return this.request(`/api/client/groups?workspaceId=${workspaceId}`, {
      method: 'GET',
    });
  }

  async createGroup(data: {
    workspaceId: string;
    name: string;
    memberIds: string[];
  }) {
    return this.request('/api/client/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroup(data: { workspaceId: string; groupId: string; name: string }) {
    return this.request('/api/client/groups', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async leaveGroup(data: { workspaceId: string; groupId: string }) {
    return this.request('/api/client/groups', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  // Status APIs
  async updateStatus(workspaceId: string) {
    return this.request('/api/client/status', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
  }

  // Profile APIs
  async updateProfile(data: { username?: string; avatar?: string | null }) {
    return this.request('/api/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Upload APIs
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }
}

export const api = new ApiClient();
