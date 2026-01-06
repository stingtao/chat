import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/features/auth/presentation/auth_controller.dart';
import 'package:mobile/features/auth/presentation/auth_screen.dart';
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
          return '/client';
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
        path: '/client',
        builder: (context, state) => const Scaffold(body: Center(child: Text('Client Dashboard'))),
      ),
    ],
  );
}
