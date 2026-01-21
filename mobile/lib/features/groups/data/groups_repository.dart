import 'package:dio/dio.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/groups/data/dto/group_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'groups_repository.g.dart';

@riverpod
GroupsRepository groupsRepository(Ref ref) {
  return GroupsRepository(ref.watch(apiClientProvider));
}

class GroupsRepository {
  final Dio _dio;

  GroupsRepository(this._dio);

  Future<List<GroupDto>> getGroups(String workspaceId) async {
    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/groups',
      queryParameters: {'workspaceId': workspaceId},
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => GroupDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch groups');
  }

  Future<GroupDto> createGroup(CreateGroupRequest request) async {
    final response = await _dio.post(
      '${AppConstants.clientApiPrefix}/groups',
      data: request.toJson(),
    );

    if (response.data['success'] == true) {
      return GroupDto.fromJson(response.data['data']);
    }

    throw Exception(response.data['error'] ?? 'Failed to create group');
  }

  Future<void> updateGroup(UpdateGroupRequest request) async {
    final response = await _dio.put(
      '${AppConstants.clientApiPrefix}/groups',
      data: request.toJson(),
    );

    if (response.data['success'] != true) {
      throw Exception(response.data['error'] ?? 'Failed to update group');
    }
  }

  Future<void> leaveGroup(String groupId) async {
    final response = await _dio.delete(
      '${AppConstants.clientApiPrefix}/groups',
      queryParameters: {'groupId': groupId},
    );

    if (response.data['success'] != true) {
      throw Exception(response.data['error'] ?? 'Failed to leave group');
    }
  }
}
