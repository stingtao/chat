import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/features/friends/data/dto/friend_dto.dart';
import 'package:mobile/features/friends/data/friends_repository.dart';
import 'package:mobile/features/groups/data/dto/group_dto.dart';
import 'package:mobile/features/groups/data/groups_repository.dart';
import 'package:mobile/features/workspace/presentation/workspace_controller.dart';

class CreateGroupScreen extends ConsumerStatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  ConsumerState<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends ConsumerState<CreateGroupScreen> {
  final _nameController = TextEditingController();
  final _selectedMembers = <String>{};
  bool _isCreating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final workspaceState = ref.watch(workspaceControllerProvider);
    final currentWorkspace = workspaceState.currentWorkspace;

    if (currentWorkspace == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Create Group')),
        body: const Center(child: Text('Please select a workspace first')),
      );
    }

    final friendsFuture = ref.watch(
      FutureProvider((ref) =>
          ref.read(friendsRepositoryProvider).getFriends(currentWorkspace.id)),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Group'),
        actions: [
          TextButton(
            onPressed: _canCreate() ? _createGroup : null,
            child: _isCreating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Group Name',
                hintText: 'Enter group name',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  'Select Members',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (_selectedMembers.isNotEmpty)
            Container(
              height: 80,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: _selectedMembers.map((id) {
                  return friendsFuture.maybeWhen(
                    data: (friends) {
                      final friend = friends.firstWhere(
                        (f) => f.id == id,
                        orElse: () => FriendDto(
                          id: id,
                          username: 'Unknown',
                          memberTag: '',
                        ),
                      );
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Column(
                          children: [
                            Stack(
                              children: [
                                CircleAvatar(
                                  radius: 24,
                                  backgroundImage: friend.avatar != null
                                      ? NetworkImage(friend.avatar!)
                                      : null,
                                  child: friend.avatar == null
                                      ? Text(friend.username
                                          .substring(0, 1)
                                          .toUpperCase())
                                      : null,
                                ),
                                Positioned(
                                  right: 0,
                                  top: 0,
                                  child: GestureDetector(
                                    onTap: () => _toggleMember(id),
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.close,
                                        size: 14,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            SizedBox(
                              width: 60,
                              child: Text(
                                friend.username,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    orElse: () => const SizedBox.shrink(),
                  );
                }).toList(),
              ),
            ),
          const Divider(),
          Expanded(
            child: friendsFuture.when(
              data: (friends) {
                if (friends.isEmpty) {
                  return const Center(
                    child: Text('Add friends first to create a group'),
                  );
                }
                return ListView.builder(
                  itemCount: friends.length,
                  itemBuilder: (context, index) {
                    final friend = friends[index];
                    final isSelected = _selectedMembers.contains(friend.id);
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: friend.avatar != null
                            ? NetworkImage(friend.avatar!)
                            : null,
                        child: friend.avatar == null
                            ? Text(friend.username.substring(0, 1).toUpperCase())
                            : null,
                      ),
                      title: Text(friend.username),
                      subtitle: Text('#${friend.memberTag}'),
                      trailing: Checkbox(
                        value: isSelected,
                        onChanged: (_) => _toggleMember(friend.id),
                      ),
                      onTap: () => _toggleMember(friend.id),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('Error: $error')),
            ),
          ),
        ],
      ),
    );
  }

  bool _canCreate() {
    return _nameController.text.trim().isNotEmpty &&
        _selectedMembers.isNotEmpty &&
        !_isCreating;
  }

  void _toggleMember(String id) {
    setState(() {
      if (_selectedMembers.contains(id)) {
        _selectedMembers.remove(id);
      } else {
        _selectedMembers.add(id);
      }
    });
  }

  Future<void> _createGroup() async {
    final workspaceState = ref.read(workspaceControllerProvider);
    final currentWorkspace = workspaceState.currentWorkspace;
    if (currentWorkspace == null) return;

    setState(() => _isCreating = true);

    try {
      final group = await ref.read(groupsRepositoryProvider).createGroup(
        CreateGroupRequest(
          workspaceId: currentWorkspace.id,
          name: _nameController.text.trim(),
          memberIds: _selectedMembers.toList(),
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Group "${group.name}" created!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreating = false);
      }
    }
  }
}
