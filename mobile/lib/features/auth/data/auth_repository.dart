import 'package:dio/dio.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/auth/data/dto/auth_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_repository.g.dart';

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) {
  return AuthRepository(ref.watch(apiClientProvider));
}

class AuthRepository {
  final Dio _dio;

  AuthRepository(this._dio);

  Future<AuthResponse> hostLogin(LoginRequest request) async {
    try {
      final response = await _dio.post(
        '${AppConstants.hostApiPrefix}/login',
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
        // Handle error gracefully, maybe return AuthResponse with error
      if (e.response != null) {
          return AuthResponse.fromJson(e.response!.data);
      }
      rethrow;
    }
  }

   Future<AuthResponse> clientLogin(LoginRequest request) async {
    try {
      final response = await _dio.post(
        '${AppConstants.clientApiPrefix}/login',
        data: request.toJson(),
      );
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response != null) {
          return AuthResponse.fromJson(e.response!.data);
      }
      rethrow;
    }
  }

  // Register methods would be similar...
}
