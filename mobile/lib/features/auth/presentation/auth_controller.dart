import 'package:mobile/core/auth/token_storage.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/data/dto/auth_dto.dart';
import 'package:mobile/features/auth/domain/auth_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_controller.g.dart';

@Riverpod(keepAlive: true)
class AuthController extends _$AuthController {
  @override
  AuthState build() {
    return const AuthState();
  }

  Future<void> checkAuthStatus() async {
    final token = await ref.read(tokenStorageProvider).getToken();
    if (token != null) {
      // Ideally verify token validity or fetch user profile
      // For now, assume authenticated if token exists
      // We might need to store userType in secured storage too to know which API to call
      state = state.copyWith(isAuthenticated: true);
    }
  }

  Future<void> loginHost(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repository = ref.read(authRepositoryProvider);
      final response = await repository.hostLogin(LoginRequest(email: email, password: password));
      
      if (response.success && response.data != null && response.data!['token'] != null) {
        final token = response.data!['token'] as String;
        await ref.read(tokenStorageProvider).saveToken(token);
        state = state.copyWith(isAuthenticated: true, userType: 'host', isLoading: false);
      } else {
        state = state.copyWith(error: response.error ?? 'Login failed', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

   Future<void> loginClient(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repository = ref.read(authRepositoryProvider);
      final response = await repository.clientLogin(LoginRequest(email: email, password: password));
      
      if (response.success && response.data != null && response.data!['token'] != null) {
        final token = response.data!['token'] as String;
        await ref.read(tokenStorageProvider).saveToken(token);
        state = state.copyWith(isAuthenticated: true, userType: 'client', isLoading: false);
      } else {
        state = state.copyWith(error: response.error ?? 'Login failed', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> logout() async {
    await ref.read(tokenStorageProvider).deleteToken();
    state = const AuthState();
  }
}
