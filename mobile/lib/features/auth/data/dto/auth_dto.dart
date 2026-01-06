import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_dto.freezed.dart';
part 'auth_dto.g.dart';

@freezed
abstract class LoginRequest with _$LoginRequest {
  const factory LoginRequest({
    required String email,
    required String password,
  }) = _LoginRequest;

  factory LoginRequest.fromJson(Map<String, dynamic> json) => _$LoginRequestFromJson(json);
}

@freezed
abstract class RegisterRequest with _$RegisterRequest {
  const factory RegisterRequest({
    required String email,
    required String password,
    required String name, // For host 'name', for client 'username'
  }) = _RegisterRequest;

  factory RegisterRequest.fromJson(Map<String, dynamic> json) => _$RegisterRequestFromJson(json);
}

@freezed
abstract class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required bool success,
    String? token, // Usually in data.token, flattening for simplicity if possible or adapt
    Map<String, dynamic>? data,
    String? error,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
}
