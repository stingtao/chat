import 'package:dio/dio.dart';
import 'package:mobile/core/auth/token_storage.dart';
import 'package:mobile/core/constants.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'api_client.g.dart';

@Riverpod(keepAlive: true)
Dio apiClient(Ref ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await tokenStorage.getToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
  ));

  return dio;
}
