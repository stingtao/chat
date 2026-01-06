// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) =>
    _LoginRequest(
      email: json['email'] as String,
      password: json['password'] as String,
    );

Map<String, dynamic> _$LoginRequestToJson(_LoginRequest instance) =>
    <String, dynamic>{'email': instance.email, 'password': instance.password};

_RegisterRequest _$RegisterRequestFromJson(Map<String, dynamic> json) =>
    _RegisterRequest(
      email: json['email'] as String,
      password: json['password'] as String,
      name: json['name'] as String,
    );

Map<String, dynamic> _$RegisterRequestToJson(_RegisterRequest instance) =>
    <String, dynamic>{
      'email': instance.email,
      'password': instance.password,
      'name': instance.name,
    };

_AuthResponse _$AuthResponseFromJson(Map<String, dynamic> json) =>
    _AuthResponse(
      success: json['success'] as bool,
      token: json['token'] as String?,
      data: json['data'] as Map<String, dynamic>?,
      error: json['error'] as String?,
    );

Map<String, dynamic> _$AuthResponseToJson(_AuthResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'token': instance.token,
      'data': instance.data,
      'error': instance.error,
    };
