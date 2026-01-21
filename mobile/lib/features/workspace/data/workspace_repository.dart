import 'package:dio/dio.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/workspace/data/dto/workspace_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'workspace_repository.g.dart';

@riverpod
WorkspaceRepository workspaceRepository(Ref ref) {
  return WorkspaceRepository(ref.watch(apiClientProvider));
}

class WorkspaceRepository {
  final Dio _dio;

  WorkspaceRepository(this._dio);

  Future<List<WorkspaceDto>> getWorkspaces() async {
    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/workspaces',
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => WorkspaceDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch workspaces');
  }

  Future<WorkspaceDto> joinWorkspace(String inviteCode) async {
    final response = await _dio.post(
      '${AppConstants.clientApiPrefix}/workspace/join',
      data: {'inviteCode': inviteCode},
    );

    if (response.data['success'] == true) {
      return WorkspaceDto.fromJson(response.data['data']);
    }

    throw Exception(response.data['error'] ?? 'Failed to join workspace');
  }

  Future<List<WorkspaceMemberDto>> getWorkspaceMembers(String workspaceId) async {
    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/workspace/$workspaceId/members',
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => WorkspaceMemberDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch members');
  }
}
