import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../workspace/presentation/workspace_state_notifier.dart';
import '../../domain/models/task_model.dart';
import '../task_state_notifier.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  String _searchQuery = '';
  String? _selectedPriority;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final activeWorkspace = ref.read(workspaceStateProvider).activeWorkspace;
      if (activeWorkspace != null) {
        ref.read(taskStateProvider.notifier).loadWorkspaceTasks(activeWorkspace.id);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final taskState = ref.watch(taskStateProvider);
    final activeWorkspace = ref.watch(workspaceStateProvider).activeWorkspace;

    final filteredTasks = taskState.tasks.where((task) {
      final matchesSearch = _searchQuery.isEmpty ||
          task.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (task.description ?? '').toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesPriority = _selectedPriority == null || task.priority == _selectedPriority;
      return matchesSearch && matchesPriority;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Görev Yönetimi'),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            icon: Icon(
              taskState.viewMode == TaskViewMode.kanban
                  ? Icons.format_list_bulleted_rounded
                  : Icons.view_kanban_rounded,
            ),
            tooltip: taskState.viewMode == TaskViewMode.kanban
                ? 'Liste Görünümü'
                : 'Kanban Görünümü',
            onPressed: () => ref.read(taskStateProvider.notifier).toggleViewMode(),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              if (activeWorkspace != null) {
                ref.read(taskStateProvider.notifier).loadWorkspaceTasks(activeWorkspace.id);
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Yeni Görev', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showCreateTaskDialog(context),
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.all(12),
            color: const Color(0xFF1E293B),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Görevlerde ara...',
                    hintStyle: const TextStyle(color: Color(0xFF64748B)),
                    prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, color: Color(0xFF64748B)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildPriorityChip('Tümü', null),
                      const SizedBox(width: 6),
                      _buildPriorityChip('Kritik', 'critical'),
                      const SizedBox(width: 6),
                      _buildPriorityChip('Yüksek', 'high'),
                      const SizedBox(width: 6),
                      _buildPriorityChip('Normal', 'normal'),
                      const SizedBox(width: 6),
                      _buildPriorityChip('Düşük', 'low'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: taskState.isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                : filteredTasks.isEmpty
                    ? _buildEmptyState()
                    : taskState.viewMode == TaskViewMode.kanban
                        ? _buildKanbanView(filteredTasks)
                        : _buildListView(filteredTasks),
          ),
        ],
      ),
    );
  }

  Widget _buildPriorityChip(String label, String? priority) {
    final isSelected = _selectedPriority == priority;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : const Color(0xFF94A3B8),
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      selectedColor: const Color(0xFF6366F1),
      backgroundColor: const Color(0xFF0F172A),
      side: BorderSide(
        color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF334155),
      ),
      onSelected: (_) {
        setState(() {
          _selectedPriority = isSelected ? null : priority;
        });
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.assignment_outlined, size: 64, color: Color(0xFF64748B)),
          const SizedBox(height: 16),
          const Text(
            'Henüz görev bulunmuyor',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Workspace için ilk görevi oluşturun veya filtreyi değiştirin.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Görev Ekle', style: TextStyle(color: Colors.white)),
            onPressed: () => _showCreateTaskDialog(context),
          ),
        ],
      ),
    );
  }

  Widget _buildKanbanView(List<TaskModel> tasks) {
    final columns = [
      {'key': 'todo', 'title': 'Yapılacak', 'color': Colors.blue},
      {'key': 'in_progress', 'title': 'Devam Ediyor', 'color': Colors.amber},
      {'key': 'waiting', 'title': 'Beklemede', 'color': Colors.orange},
      {'key': 'completed', 'title': 'Tamamlandı', 'color': Colors.green},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: columns.map((col) {
          final statusKey = col['key'] as String;
          final title = col['title'] as String;
          final color = col['color'] as Color;
          final columnTasks = tasks.where((t) => t.status == statusKey).toList();

          return Container(
            width: 200,
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${columnTasks.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 520),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: columnTasks.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final task = columnTasks[index];
                      return _buildTaskCard(task);
                    },
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildListView(List<TaskModel> tasks) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: tasks.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final task = tasks[index];
        return _buildTaskCard(task, isFullWidth: true);
      },
    );
  }

  Widget _buildTaskCard(TaskModel task, {bool isFullWidth = false}) {
    final priorityColor = task.priority == 'critical'
        ? Colors.red
        : task.priority == 'high'
            ? Colors.orange
            : Colors.blue;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  task.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF94A3B8), size: 18),
                color: const Color(0xFF1E293B),
                onSelected: (newStatus) => _handleStatusChange(task, newStatus),
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'todo', child: Text('Yapılacak', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'in_progress', child: Text('Devam Ediyor', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'waiting', child: Text('Beklemede', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'completed', child: Text('Tamamlandı', style: TextStyle(color: Colors.white))),
                ],
              ),
            ],
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              task.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
          if (task.status == 'waiting' && task.waitingReason != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF451A03),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Neden: ${task.waitingReason}',
                style: const TextStyle(color: Color(0xFFFDBA74), fontSize: 11),
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  task.priority.toUpperCase(),
                  style: TextStyle(color: priorityColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
              const Spacer(),
              if (task.dueDate != null)
                Text(
                  '${task.dueDate!.day}.${task.dueDate!.month}.${task.dueDate!.year}',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleStatusChange(TaskModel task, String newStatus) {
    if (newStatus == 'waiting') {
      final controller = TextEditingController();
      showDialog(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Bekleme Nedeni Girin', style: TextStyle(color: Colors.white)),
          content: TextField(
            controller: controller,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              hintText: 'Örn: İşletmeden yanıt bekleniyor',
              hintStyle: TextStyle(color: Color(0xFF64748B)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
              onPressed: () {
                if (controller.text.trim().isNotEmpty) {
                  Navigator.pop(dialogCtx);
                  ref.read(taskStateProvider.notifier).updateStatus(
                    taskId: task.id,
                    newStatus: newStatus,
                    waitingReason: controller.text.trim(),
                  );
                }
              },
              child: const Text('Kaydet', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    } else {
      ref.read(taskStateProvider.notifier).updateStatus(
        taskId: task.id,
        newStatus: newStatus,
      );
    }
  }

  void _showCreateTaskDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String priority = 'normal';

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Yeni Görev Oluştur', style: TextStyle(color: Colors.white)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Görev Başlığı',
                    labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Açıklama',
                    labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: priority,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Öncelik',
                    labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Düşük')),
                    DropdownMenuItem(value: 'normal', child: Text('Normal')),
                    DropdownMenuItem(value: 'high', child: Text('Yüksek')),
                    DropdownMenuItem(value: 'critical', child: Text('Kritik')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => priority = val);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
              onPressed: () {
                if (titleController.text.trim().isNotEmpty) {
                  final activeWs = ref.read(workspaceStateProvider).activeWorkspace;
                  final newTask = TaskModel(
                    id: '',
                    workspaceId: activeWs?.id,
                    title: titleController.text.trim(),
                    description: descController.text.trim().isEmpty ? null : descController.text.trim(),
                    priority: priority,
                    status: 'todo',
                    createdAt: DateTime.now(),
                  );
                  Navigator.pop(dialogCtx);
                  ref.read(taskStateProvider.notifier).createNewTask(newTask);
                }
              },
              child: const Text('Oluştur', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
