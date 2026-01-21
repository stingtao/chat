import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/features/auth/presentation/auth_controller.dart';
import 'package:mobile/features/auth/presentation/auth_screen.dart';
import 'package:mobile/features/chat/presentation/chat_screen.dart';
import 'package:mobile/features/chat/presentation/conversation_list_screen.dart';
import 'package:mobile/features/friends/presentation/friends_screen.dart';
import 'package:mobile/features/groups/presentation/create_group_screen.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app_router.g.dart';

final _key = GlobalKey<NavigatorState>();

@Riverpod(keepAlive: true)
GoRouter appRouter(Ref ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    navigatorKey: _key,
    initialLocation: '/auth',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isLoggingIn = state.uri.toString() == '/auth';

      if (!isAuth) return '/auth';

      if (isLoggingIn && isAuth) {
        if (authState.userType == 'host') {
          return '/host';
        } else {
          return '/conversations';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/auth',
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: '/host',
        builder: (context, state) => const Scaffold(body: Center(child: Text('Host Dashboard'))),
      ),
      GoRoute(
        path: '/conversations',
        builder: (context, state) => const ConversationListScreen(),
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ChatScreen(
            workspaceId: extra['workspaceId'] ?? '',
            receiverId: extra['receiverId'],
            groupId: extra['groupId'],
            title: extra['title'] ?? 'Chat',
          );
        },
      ),
      GoRoute(
        path: '/friends',
        builder: (context, state) => const FriendsScreen(),
      ),
      GoRoute(
        path: '/friends/add',
        builder: (context, state) => const FriendsScreen(showAddDialog: true),
      ),
      GoRoute(
        path: '/groups/create',
        builder: (context, state) => const CreateGroupScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const Scaffold(body: Center(child: Text('Settings'))),
      ),
    ],
  );
}
