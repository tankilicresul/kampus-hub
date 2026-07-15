import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kampushub/features/auth/di/auth_dependencies.dart';
import '../domain/repositories/workspace_repository.dart';
import '../data/repositories/supabase_workspace_repository.dart';

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return SupabaseWorkspaceRepository(supabase);
});
