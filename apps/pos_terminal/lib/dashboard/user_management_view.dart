import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../localization_service.dart';

class UserManagementView extends StatefulWidget {
  final List<dynamic> users;
  final List<dynamic> roles;
  final List<dynamic> permissions;
  final bool isUsersLoading;
  final bool isRolesLoading;
  final Function(Map<String, dynamic>) onCreateUser;
  final Function(dynamic, Map<String, dynamic>) onUpdateUser;
  final Function(dynamic) onDeleteUser;
  final Function(Map<String, dynamic>) onCreateRole;
  final Function(dynamic, Map<String, dynamic>) onUpdateRole;
  final Function(dynamic) onDeleteRole;
  final Function(dynamic, List<int>) onUpdateRolePermissions;

  final int initialSubTab;

  const UserManagementView({
    super.key,
    required this.users,
    required this.roles,
    required this.permissions,
    required this.isUsersLoading,
    required this.isRolesLoading,
    required this.onCreateUser,
    required this.onUpdateUser,
    required this.onDeleteUser,
    required this.onCreateRole,
    required this.onUpdateRole,
    required this.onDeleteRole,
    required this.onUpdateRolePermissions,
    this.initialSubTab = 0,
  });

  @override
  State<UserManagementView> createState() => _UserManagementViewState();
}

class _UserManagementViewState extends State<UserManagementView> {
  late int _selectedSubTab;

  @override
  void initState() {
    super.initState();
    _selectedSubTab = widget.initialSubTab;
  }

  @override
  void didUpdateWidget(UserManagementView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSubTab != widget.initialSubTab) {
      setState(() {
        _selectedSubTab = widget.initialSubTab;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final theme = ThemeService().themeData;
        final themeBg = theme.scaffoldBackgroundColor;
        final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
        final themePrimary = theme.primaryColor;

        return Container(
          color: themeBg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sub-navigation Tabs
              Container(
                padding: const EdgeInsets.fromLTRB(32, 32, 32, 0),
                child: Row(
                  children: [
                    _buildSubTab(
                      LocalizationService().translate('user_management'),
                      0,
                      themePrimary,
                      themeText,
                    ),
                    const SizedBox(width: 24),
                    _buildSubTab(
                      LocalizationService().translate('role_permissions'),
                      1,
                      themePrimary,
                      themeText,
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Divider(),
              ),
              Expanded(
                child: _selectedSubTab == 0
                    ? _buildUsersList(theme)
                    : _buildRolesList(theme),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSubTab(String label, int index, Color primary, Color text) {
    final isSelected = _selectedSubTab == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedSubTab = index),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              color: isSelected ? primary : text.withOpacity(0.6),
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 3,
            width: 40,
            decoration: BoxDecoration(
              color: isSelected ? primary : Colors.transparent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUsersList(ThemeData theme) {
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);
    final themeCard = theme.cardColor;
    final themeBorder = themeText.withOpacity(0.15);
    final themePrimary = theme.primaryColor;

    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    LocalizationService().translate('staff_management'),
                    style: TextStyle(
                      color: themeText,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    LocalizationService().translate('staff_mgmt_desc'),
                    style: TextStyle(color: themeHint, fontSize: 14),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _showUserDialog(theme),
                icon: const Icon(
                  Icons.person_add_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                label: Text(
                  LocalizationService().translate('add_new_staff'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Expanded(
            child: widget.isUsersLoading
                ? Center(child: CircularProgressIndicator(color: themePrimary))
                : widget.users.isEmpty
                ? Center(
                    child: Text(
                      LocalizationService().translate('no_users_found'),
                      style: TextStyle(color: themeHint),
                    ),
                  )
                : Container(
                    decoration: BoxDecoration(
                      color: themeCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: themeBorder),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.vertical,
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowColor: WidgetStateProperty.all(
                              themePrimary.withOpacity(0.05),
                            ),
                            dataRowMinHeight: 70,
                            dataRowMaxHeight: 70,
                            columns: [
                              DataColumn(
                                label: Text(
                                  'STAFF MEMBER',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'USERNAME',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'ROLES',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'CONTACT INFO',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'ACTIONS',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                            rows: widget.users.map((user) {
                              return DataRow(
                                cells: [
                                  DataCell(
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        CircleAvatar(
                                          radius: 18,
                                          backgroundColor: themePrimary
                                              .withOpacity(0.1),
                                          child: Text(
                                            (user['first_name'] ?? 'U')[0]
                                                .toUpperCase(),
                                            style: TextStyle(
                                              color: themePrimary,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(
                                          '${user['first_name']} ${user['last_name']}',
                                          style: TextStyle(
                                            color: themeText,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    Text(
                                      '@${user['username']}',
                                      style: TextStyle(color: themeHint),
                                    ),
                                  ),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: themePrimary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        (user['roles'] ?? 'No Role')
                                            .toUpperCase(),
                                        style: TextStyle(
                                          color: themePrimary,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          user['email'] ?? '',
                                          style: TextStyle(
                                            color: themeText,
                                            fontSize: 13,
                                          ),
                                        ),
                                        Text(
                                          user['phone'] ?? '',
                                          style: TextStyle(
                                            color: themeHint,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: Icon(
                                            Icons.edit_outlined,
                                            color: themeHint,
                                            size: 20,
                                          ),
                                          onPressed: () => _showUserDialog(
                                            theme,
                                            user: user,
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(
                                            Icons.delete_outline_rounded,
                                            color: Colors.redAccent,
                                            size: 20,
                                          ),
                                          onPressed: () =>
                                              _showDeleteUserConfirm(
                                                user,
                                                themeCard,
                                                themeText,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildRolesList(ThemeData theme) {
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);
    final themeCard = theme.cardColor;
    final themeBorder = themeText.withOpacity(0.15);
    final themePrimary = theme.primaryColor;

    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    LocalizationService().translate('roles_permissions_title'),
                    style: TextStyle(
                      color: themeText,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    LocalizationService().translate('roles_desc'),
                    style: TextStyle(color: themeHint, fontSize: 14),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _showRoleDialog(theme),
                icon: const Icon(
                  Icons.add_moderator_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                label: Text(
                  LocalizationService().translate('add_new_role'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Expanded(
            child: widget.isRolesLoading
                ? Center(child: CircularProgressIndicator(color: themePrimary))
                : widget.roles.isEmpty
                ? Center(
                    child: Text(
                      LocalizationService().translate('no_data'),
                      style: TextStyle(color: themeHint),
                    ),
                  )
                : Container(
                    decoration: BoxDecoration(
                      color: themeCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: themeBorder),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.vertical,
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowColor: WidgetStateProperty.all(
                              themePrimary.withOpacity(0.05),
                            ),
                            dataRowMinHeight: 70,
                            dataRowMaxHeight: 70,
                            columns: [
                              DataColumn(
                                label: Text(
                                  'ROLE NAME',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'DESCRIPTION',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'PERMISSIONS',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              DataColumn(
                                label: Text(
                                  'ACTIONS',
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                            rows: widget.roles.map((role) {
                              final permissions =
                                  (role['permissions']?.toString().split(',') ??
                                          [])
                                      .where((p) => p.isNotEmpty)
                                      .toList();
                              final permissionCount = permissions.length;
                              final isSystemRole = [
                                'admin',
                                'manager',
                                'cashier',
                                'chef',
                                'waiter',
                              ].contains(role['name'].toString().toLowerCase());

                              return DataRow(
                                cells: [
                                  DataCell(
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        CircleAvatar(
                                          radius: 18,
                                          backgroundColor: themePrimary
                                              .withOpacity(0.1),
                                          child: Icon(
                                            Icons.admin_panel_settings_rounded,
                                            color: themePrimary,
                                            size: 18,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(
                                          role['name'] ?? 'Unnamed',
                                          style: TextStyle(
                                            color: themeText,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  DataCell(
                                    SizedBox(
                                      width: 250,
                                      child: Text(
                                        role['description'] ?? 'No description',
                                        style: TextStyle(
                                          color: themeHint,
                                          fontSize: 13,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: themePrimary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '$permissionCount Permissions',
                                        style: TextStyle(
                                          color: themePrimary,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: Icon(
                                            Icons.security_rounded,
                                            color: themePrimary,
                                            size: 20,
                                          ),
                                          tooltip: 'Edit Permissions',
                                          onPressed: () =>
                                              _showPermissionsDialog(
                                                role,
                                                themeCard,
                                                themeText,
                                                themePrimary,
                                                themeHint,
                                              ),
                                        ),
                                        IconButton(
                                          icon: Icon(
                                            Icons.edit_outlined,
                                            color: themeHint,
                                            size: 20,
                                          ),
                                          onPressed: () => _showRoleDialog(
                                            theme,
                                            role: role,
                                          ),
                                        ),
                                        if (!isSystemRole)
                                          IconButton(
                                            icon: const Icon(
                                              Icons.delete_outline_rounded,
                                              color: Colors.redAccent,
                                              size: 20,
                                            ),
                                            onPressed: () =>
                                                _showDeleteRoleConfirm(
                                                  role,
                                                  themeCard,
                                                  themeText,
                                                ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  void _showUserDialog(ThemeData theme, {dynamic user}) {
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);
    final themeCard = theme.cardColor;
    final themePrimary = theme.primaryColor;

    final fnController = TextEditingController(text: user?['first_name'] ?? '');
    final lnController = TextEditingController(text: user?['last_name'] ?? '');
    final unController = TextEditingController(text: user?['username'] ?? '');
    final emailController = TextEditingController(text: user?['email'] ?? '');
    final phoneController = TextEditingController(text: user?['phone'] ?? '');
    final pwController = TextEditingController();

    List<int> selectedRoles = [];
    if (user != null && user['role_ids'] != null) {
      selectedRoles = user['role_ids']
          .toString()
          .split(',')
          .map((id) => int.parse(id))
          .toList();
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            user == null
                ? LocalizationService().translate('add_new_staff')
                : LocalizationService().translate('edit_staff_details'),
            style: TextStyle(color: themeText),
          ),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: fnController,
                          style: TextStyle(color: themeText),
                          decoration: InputDecoration(
                            labelText: LocalizationService().translate(
                              'first_name',
                            ),
                            labelStyle: TextStyle(color: themeHint),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextField(
                          controller: lnController,
                          style: TextStyle(color: themeText),
                          decoration: InputDecoration(
                            labelText: LocalizationService().translate(
                              'last_name',
                            ),
                            labelStyle: TextStyle(color: themeHint),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: unController,
                    style: TextStyle(color: themeText),
                    enabled: user == null,
                    decoration: InputDecoration(
                      labelText: LocalizationService().translate('username'),
                      labelStyle: TextStyle(color: themeHint),
                    ),
                  ),
                  if (user == null) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: pwController,
                      style: TextStyle(color: themeText),
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: LocalizationService().translate('password'),
                        labelStyle: TextStyle(color: themeHint),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  TextField(
                    controller: emailController,
                    style: TextStyle(color: themeText),
                    decoration: InputDecoration(
                      labelText: LocalizationService().translate('email'),
                      labelStyle: TextStyle(color: themeHint),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: phoneController,
                    style: TextStyle(color: themeText),
                    decoration: InputDecoration(
                      labelText: LocalizationService().translate('phone'),
                      labelStyle: TextStyle(color: themeHint),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      LocalizationService().translate('assign_roles'),
                      style: TextStyle(
                        color: themeText,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: widget.roles.map((role) {
                      final isSelected = selectedRoles.contains(role['id']);
                      return FilterChip(
                        label: Text(
                          role['name'],
                          style: TextStyle(
                            color: isSelected ? Colors.white : themeText,
                            fontSize: 12,
                          ),
                        ),
                        selected: isSelected,
                        onSelected: (val) {
                          setDialogState(() {
                            if (val) {
                              selectedRoles.add(role['id']);
                            } else {
                              selectedRoles.remove(role['id']);
                            }
                          });
                        },
                        selectedColor: themePrimary,
                        checkmarkColor: Colors.white,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                LocalizationService().translate('cancel_btn'),
                style: TextStyle(color: themeHint),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                final userData = {
                  'first_name': fnController.text,
                  'last_name': lnController.text,
                  'username': unController.text,
                  'email': emailController.text,
                  'phone': phoneController.text,
                  'role_ids': selectedRoles,
                };
                if (user == null) {
                  userData['password'] = pwController.text;
                  widget.onCreateUser(userData);
                } else {
                  widget.onUpdateUser(user['id'], userData);
                }
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: Text(
                LocalizationService().translate('save_btn'),
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRoleDialog(ThemeData theme, {dynamic role}) {
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);
    final themeCard = theme.cardColor;
    final themePrimary = theme.primaryColor;

    final nameController = TextEditingController(text: role?['name'] ?? '');
    final descController = TextEditingController(
      text: role?['description'] ?? '',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          role == null
              ? LocalizationService().translate('add_new_role')
              : 'Edit Role Details',
          style: TextStyle(color: themeText),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              style: TextStyle(color: themeText),
              decoration: InputDecoration(
                labelText: 'Role Name',
                labelStyle: TextStyle(color: themeHint),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              maxLines: 3,
              style: TextStyle(color: themeText),
              decoration: InputDecoration(
                labelText: 'Description',
                labelStyle: TextStyle(color: themeHint),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              LocalizationService().translate('cancel_btn'),
              style: TextStyle(color: themeHint),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final roleData = {
                'name': nameController.text,
                'description': descController.text,
              };
              if (role == null) {
                widget.onCreateRole(roleData);
              } else {
                widget.onUpdateRole(role['id'], roleData);
              }
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
            child: Text(
              LocalizationService().translate('save_btn'),
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteUserConfirm(dynamic user, Color themeCard, Color themeText) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text('Delete Staff Member?', style: TextStyle(color: themeText)),
        content: Text(
          'Are you sure you want to delete ${user['first_name']}? This action cannot be undone.',
          style: TextStyle(color: themeText.withOpacity(0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              widget.onDeleteUser(user['id']);
              Navigator.pop(ctx);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showDeleteRoleConfirm(dynamic role, Color themeCard, Color themeText) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text('Delete Role?', style: TextStyle(color: themeText)),
        content: Text(
          'Are you sure you want to delete the "${role['name']}" role? Staff members assigned to this role will lose their permissions.',
          style: TextStyle(color: themeText.withOpacity(0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              widget.onDeleteRole(role['id']);
              Navigator.pop(ctx);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showPermissionsDialog(
    dynamic role,
    Color themeCard,
    Color themeText,
    Color themePrimary,
    Color themeHint,
  ) {
    List<int> currentPermissions = [];
    if (role['permissions'] != null) {
      final names = role['permissions'].toString().split(',');
      for (var p in widget.permissions) {
        if (names.contains(p['name'])) {
          currentPermissions.add(p['id']);
        }
      }
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Edit Permissions: ${role['name']}',
            style: TextStyle(color: themeText),
          ),
          content: SizedBox(
            width: 400,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: widget.permissions.length,
              itemBuilder: (context, index) {
                final p = widget.permissions[index];
                final isEnabled = currentPermissions.contains(p['id']);
                return CheckboxListTile(
                  title: Text(
                    p['name'].toString().replaceAll('_', ' ').toUpperCase(),
                    style: TextStyle(
                      color: themeText,
                      fontSize: 13,
                      fontWeight: isEnabled
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  value: isEnabled,
                  onChanged: (val) {
                    setDialogState(() {
                      if (val!) {
                        currentPermissions.add(p['id']);
                      } else {
                        currentPermissions.remove(p['id']);
                      }
                    });
                  },
                  activeColor: themePrimary,
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('CANCEL', style: TextStyle(color: themeHint)),
            ),
            ElevatedButton(
              onPressed: () {
                widget.onUpdateRolePermissions(role['id'], currentPermissions);
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: const Text(
                'SAVE CHANGES',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

