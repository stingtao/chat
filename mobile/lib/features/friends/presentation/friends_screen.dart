import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/friends/data/dto/friend_dto.dart';
import 'package:mobile/features/friends/data/friends_repository.dart';
import 'package:mobile/features/workspace/data/dto/workspace_dto.dart';
import 'package:mobile/features/workspace/presentation/workspace_controller.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  final bool showAddDialog;

  const FriendsScreen({super.key, this.showAddDialog = false});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    if (widget.showAddDialog) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showAddFriendDialog(context);
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final workspaceState = ref.watch(workspaceControllerProvider);
    final currentWorkspace = workspaceState.currentWorkspace;

    if (currentWorkspace == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Friends')),
        body: const Center(child: Text('Please select a workspace first')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Friends'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All Members'),
            Tab(text: 'Requests'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _AllMembersTab(workspace: currentWorkspace),
          _FriendRequestsTab(workspace: currentWorkspace),
        ],
      ),
    );
  }

  void _showAddFriendDialog(BuildContext context) {
    final workspaceState = ref.read(workspaceControllerProvider);
    final members = workspaceState.members;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Add Friend',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: members.length,
                itemBuilder: (context, index) {
                  final member = members[index];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundImage: member.avatar != null
                          ? NetworkImage(member.avatar!)
                          : null,
                      child: member.avatar == null
                          ? Text(member.username.substring(0, 1).toUpperCase())
                          : null,
                    ),
                    title: Text(member.username),
                    subtitle: Text('#${member.memberTag}'),
                    trailing: ElevatedButton(
                      onPressed: () => _sendFriendRequest(member),
                      child: const Text('Add'),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendFriendRequest(WorkspaceMemberDto member) async {
    final workspaceState = ref.read(workspaceControllerProvider);
    final currentWorkspace = workspaceState.currentWorkspace;
    if (currentWorkspace == null) return;

    try {
      await ref.read(friendsRepositoryProvider).sendFriendRequest(
        workspaceId: currentWorkspace.id,
        receiverId: member.userId,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Friend request sent to ${member.username}')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _AllMembersTab extends ConsumerWidget {
  final WorkspaceDto workspace;

  const _AllMembersTab({required this.workspace});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersFuture = ref.watch(
      FutureProvider((ref) =>
          ref.read(workspaceControllerProvider.notifier).loadMembers()),
    );
    final workspaceState = ref.watch(workspaceControllerProvider);

    return membersFuture.when(
      data: (_) {
        final members = workspaceState.members;
        if (members.isEmpty) {
          return const Center(child: Text('No members yet'));
        }
        return ListView.builder(
          itemCount: members.length,
          itemBuilder: (context, index) {
            final member = members[index];
            return ListTile(
              leading: CircleAvatar(
                backgroundImage:
                    member.avatar != null ? NetworkImage(member.avatar!) : null,
                child: member.avatar == null
                    ? Text(member.username.substring(0, 1).toUpperCase())
                    : null,
              ),
              title: Text(member.username),
              subtitle: Text('#${member.memberTag}'),
              trailing: IconButton(
                icon: const Icon(Icons.person_add),
                onPressed: () => _sendFriendRequest(context, ref, member),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
    );
  }

  Future<void> _sendFriendRequest(
    BuildContext context,
    WidgetRef ref,
    WorkspaceMemberDto member,
  ) async {
    try {
      await ref.read(friendsRepositoryProvider).sendFriendRequest(
        workspaceId: workspace.id,
        receiverId: member.userId,
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Friend request sent to ${member.username}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class _FriendRequestsTab extends ConsumerWidget {
  final WorkspaceDto workspace;

  const _FriendRequestsTab({required this.workspace});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsFuture = ref.watch(
      FutureProvider((ref) =>
          ref.read(friendsRepositoryProvider).getPendingRequests(workspace.id)),
    );

    return requestsFuture.when(
      data: (requests) {
        if (requests.isEmpty) {
          return const Center(child: Text('No pending requests'));
        }
        return ListView.builder(
          itemCount: requests.length,
          itemBuilder: (context, index) {
            final request = requests[index];
            return _FriendRequestTile(
              request: request,
              workspaceId: workspace.id,
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
    );
  }
}

class _FriendRequestTile extends ConsumerWidget {
  final FriendRequestDto request;
  final String workspaceId;

  const _FriendRequestTile({
    required this.request,
    required this.workspaceId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: CircleAvatar(
        backgroundImage: request.senderAvatar != null
            ? NetworkImage(request.senderAvatar!)
            : null,
        child: request.senderAvatar == null
            ? Text(request.senderName.substring(0, 1).toUpperCase())
            : null,
      ),
      title: Text(request.senderName),
      subtitle: Text('#${request.senderMemberTag}'),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.check, color: Colors.green),
            onPressed: () => _respond(context, ref, 'accept'),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.red),
            onPressed: () => _respond(context, ref, 'reject'),
          ),
        ],
      ),
    );
  }

  Future<void> _respond(BuildContext context, WidgetRef ref, String action) async {
    try {
      await ref.read(friendsRepositoryProvider).respondToFriendRequest(
        workspaceId: workspaceId,
        friendshipId: request.id,
        action: action,
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              action == 'accept'
                  ? 'Friend request accepted!'
                  : 'Friend request rejected',
            ),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}
