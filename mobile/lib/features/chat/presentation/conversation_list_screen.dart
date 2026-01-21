import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/features/friends/data/dto/friend_dto.dart';
import 'package:mobile/features/friends/data/friends_repository.dart';
import 'package:mobile/features/groups/data/dto/group_dto.dart';
import 'package:mobile/features/groups/data/groups_repository.dart';
import 'package:mobile/features/workspace/presentation/workspace_controller.dart';

class ConversationListScreen extends ConsumerStatefulWidget {
  const ConversationListScreen({super.key});

  @override
  ConsumerState<ConversationListScreen> createState() => _ConversationListScreenState();
}

class _ConversationListScreenState extends ConsumerState<ConversationListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(workspaceControllerProvider.notifier).loadWorkspaces();
    });
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

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => _showWorkspaceSwitcher(context),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (currentWorkspace?.settings?.logo != null)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: CircleAvatar(
                    radius: 16,
                    backgroundImage: NetworkImage(currentWorkspace!.settings!.logo!),
                  ),
                ),
              Text(currentWorkspace?.name ?? 'Select Workspace'),
              const Icon(Icons.arrow_drop_down),
            ],
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Chats'),
            Tab(text: 'Groups'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: () => context.push('/friends'),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: workspaceState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : currentWorkspace == null
              ? _buildNoWorkspace(context)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _FriendsList(workspaceId: currentWorkspace.id),
                    _GroupsList(workspaceId: currentWorkspace.id),
                  ],
                ),
      floatingActionButton: currentWorkspace != null
          ? FloatingActionButton(
              onPressed: () {
                if (_tabController.index == 0) {
                  context.push('/friends/add');
                } else {
                  context.push('/groups/create');
                }
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildNoWorkspace(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No workspace joined yet',
            style: TextStyle(fontSize: 18, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showJoinWorkspaceDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('Join Workspace'),
          ),
        ],
      ),
    );
  }

  void _showWorkspaceSwitcher(BuildContext context) {
    final workspaceState = ref.read(workspaceControllerProvider);

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Switch Workspace',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(height: 1),
            ...workspaceState.workspaces.map((workspace) => ListTile(
              leading: CircleAvatar(
                backgroundImage: workspace.settings?.logo != null
                    ? NetworkImage(workspace.settings!.logo!)
                    : null,
                child: workspace.settings?.logo == null
                    ? Text(workspace.name.substring(0, 1).toUpperCase())
                    : null,
              ),
              title: Text(workspace.name),
              trailing: workspace.id == workspaceState.currentWorkspace?.id
                  ? const Icon(Icons.check, color: Colors.green)
                  : null,
              onTap: () {
                ref.read(workspaceControllerProvider.notifier).selectWorkspace(workspace);
                Navigator.pop(context);
              },
            )),
            const Divider(height: 1),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.add)),
              title: const Text('Join New Workspace'),
              onTap: () {
                Navigator.pop(context);
                _showJoinWorkspaceDialog(context);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showJoinWorkspaceDialog(BuildContext context) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Join Workspace'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Invite Code',
            hintText: 'Enter invite code',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final code = controller.text.trim();
              if (code.isNotEmpty) {
                ref.read(workspaceControllerProvider.notifier).joinWorkspace(code);
                Navigator.pop(context);
              }
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }
}

class _FriendsList extends ConsumerWidget {
  final String workspaceId;

  const _FriendsList({required this.workspaceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final friendsFuture = ref.watch(
      FutureProvider((ref) => ref.read(friendsRepositoryProvider).getFriends(workspaceId)),
    );

    return friendsFuture.when(
      data: (friends) => friends.isEmpty
          ? const Center(
              child: Text(
                'No friends yet.\nAdd friends to start chatting!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            )
          : ListView.builder(
              itemCount: friends.length,
              itemBuilder: (context, index) {
                final friend = friends[index];
                return _FriendTile(friend: friend, workspaceId: workspaceId);
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Text('Error: $error', style: const TextStyle(color: Colors.red)),
      ),
    );
  }
}

class _FriendTile extends StatelessWidget {
  final FriendDto friend;
  final String workspaceId;

  const _FriendTile({required this.friend, required this.workspaceId});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Stack(
        children: [
          CircleAvatar(
            backgroundImage:
                friend.avatar != null ? NetworkImage(friend.avatar!) : null,
            child: friend.avatar == null
                ? Text(friend.username.substring(0, 1).toUpperCase())
                : null,
          ),
          if (friend.isOnline)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      ),
      title: Text(friend.username),
      subtitle: Text(
        friend.isOnline ? 'Online' : _formatLastSeen(friend.lastSeenAt),
        style: TextStyle(
          color: friend.isOnline ? Colors.green : Colors.grey,
          fontSize: 12,
        ),
      ),
      onTap: () => context.push(
        '/chat',
        extra: {
          'workspaceId': workspaceId,
          'receiverId': friend.id,
          'title': friend.username,
        },
      ),
    );
  }

  String _formatLastSeen(DateTime? lastSeen) {
    if (lastSeen == null) return 'Offline';

    final diff = DateTime.now().difference(lastSeen);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _GroupsList extends ConsumerWidget {
  final String workspaceId;

  const _GroupsList({required this.workspaceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsFuture = ref.watch(
      FutureProvider((ref) => ref.read(groupsRepositoryProvider).getGroups(workspaceId)),
    );

    return groupsFuture.when(
      data: (groups) => groups.isEmpty
          ? const Center(
              child: Text(
                'No groups yet.\nCreate a group to chat with multiple friends!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            )
          : ListView.builder(
              itemCount: groups.length,
              itemBuilder: (context, index) {
                final group = groups[index];
                return _GroupTile(group: group, workspaceId: workspaceId);
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Text('Error: $error', style: const TextStyle(color: Colors.red)),
      ),
    );
  }
}

class _GroupTile extends StatelessWidget {
  final GroupDto group;
  final String workspaceId;

  const _GroupTile({required this.group, required this.workspaceId});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundImage:
            group.avatar != null ? NetworkImage(group.avatar!) : null,
        child: group.avatar == null
            ? Text(group.name.substring(0, 1).toUpperCase())
            : null,
      ),
      title: Text(group.name),
      subtitle: Text(
        '${group.memberCount ?? 0} members',
        style: const TextStyle(fontSize: 12, color: Colors.grey),
      ),
      onTap: () => context.push(
        '/chat',
        extra: {
          'workspaceId': workspaceId,
          'groupId': group.id,
          'title': group.name,
        },
      ),
    );
  }
}
