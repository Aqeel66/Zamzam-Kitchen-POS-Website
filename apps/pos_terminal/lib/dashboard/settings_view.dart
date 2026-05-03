import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../localization_service.dart';
import '../components/settings_helpers.dart';

class SettingsView extends StatefulWidget {
  final Map<String, dynamic> settings;
  final bool isLoading;
  final Function(String, Map<String, dynamic>) onUpdateSetting;
  final Function(String, Map<String, dynamic>) onSaveGatewaySettings;
  final Function(String, Map<String, dynamic>) onSaveMessagingSettings;
  final Function(String, Map<String, dynamic>) onSaveEmailSettings;
  final Function(String, Map<String, dynamic>) onTestMessagingConnection;
  final Function(String, Map<String, dynamic>) onTestEmailConnection;
  final VoidCallback onFetchSettings;
  final Future<String?> Function() onPickImage;
  final VoidCallback onResetTransactions;
  final List<dynamic> userPermissions;
  final int initialCategory;

  const SettingsView({
    super.key,
    required this.settings,
    required this.isLoading,
    required this.onUpdateSetting,
    required this.onSaveGatewaySettings,
    required this.onSaveMessagingSettings,
    required this.onSaveEmailSettings,
    required this.onTestMessagingConnection,
    required this.onTestEmailConnection,
    required this.onFetchSettings,
    required this.onPickImage,
    required this.onResetTransactions,
    this.userPermissions = const [],
    this.initialCategory = 0,
  });

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  late int _selectedCategory;

  bool _hasPermission(String permission) {
    if (widget.userPermissions.isEmpty) return true; // Default for dev/unauthenticated
    return widget.userPermissions.contains(permission);
  }

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory;
    
    // Ensure the initial category is permitted, otherwise find the first permitted one
    final categories = {
      0: 'manage_settings_general',
      1: 'manage_settings_operations',
      2: 'manage_settings_branding',
      3: 'manage_settings_payments',
      4: 'manage_settings_communications',
      5: 'manage_settings_reset',
    };

    if (!_hasPermission(categories[_selectedCategory]!)) {
      for (var entry in categories.entries) {
        if (_hasPermission(entry.value)) {
          _selectedCategory = entry.key;
          break;
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final bool isDark = ThemeService().isDarkMode;
        final Color themeText = Theme.of(context).textTheme.bodyLarge?.color ?? (isDark ? Colors.white : const Color(0xFF0F172A));
        final Color themeCard = Theme.of(context).cardColor;
        final Color themeBorder = Theme.of(context).dividerColor;
        final Color themePrimary = Theme.of(context).primaryColor;
        final Color themeHint = themeText.withValues(alpha: 0.6);
        final themeBg = Theme.of(context).scaffoldBackgroundColor;

        if (widget.isLoading && widget.settings.isEmpty) {
          return Center(child: CircularProgressIndicator(color: themePrimary));
        }

        if (widget.settings.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.settings_suggest_outlined, size: 64, color: themeHint),
                const SizedBox(height: 16),
                Text(LocalizationService().translate('settings_not_loaded'), style: TextStyle(color: themeText, fontSize: 18)),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: widget.onFetchSettings, child: Text(LocalizationService().translate('retry'))),
              ],
            ),
          );
        }

        return Container(
          color: themeBg,
          child: Row(
            children: [
              // Sidebar
              Container(
                width: 240,
                decoration: BoxDecoration(
                  color: themeCard.withValues(alpha: 0.5),
                  border: Border(right: BorderSide(color: themeBorder)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        LocalizationService().translate('configuration').toUpperCase(), 
                        style: TextStyle(color: themeHint, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)
                      ),
                    ),
                    if (_hasPermission('manage_settings_general'))
                      _buildSidebarTab(0, LocalizationService().translate('general'), Icons.tune_rounded, themePrimary, themeText, themeHint),
                    if (_hasPermission('manage_settings_operations'))
                      _buildSidebarTab(1, LocalizationService().translate('operations'), Icons.restaurant_menu_rounded, themePrimary, themeText, themeHint),
                    if (_hasPermission('manage_settings_branding'))
                      _buildSidebarTab(2, LocalizationService().translate('branding'), Icons.auto_awesome_mosaic_rounded, themePrimary, themeText, themeHint),
                    if (_hasPermission('manage_settings_payments'))
                      _buildSidebarTab(3, LocalizationService().translate('payments'), Icons.payments_outlined, themePrimary, themeText, themeHint),
                    if (_hasPermission('manage_settings_communications'))
                      _buildSidebarTab(4, LocalizationService().translate('communications'), Icons.contact_mail_outlined, themePrimary, themeText, themeHint),
                    if (_hasPermission('manage_settings_reset'))
                      _buildSidebarTab(5, LocalizationService().translate('system_reset'), Icons.restart_alt_rounded, themePrimary, themeText, themeHint),
                    const Spacer(),
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text('Version 2.4.0', style: TextStyle(color: themeHint, fontSize: 10)),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: _getContent(themeText, themeCard, themeBorder, themePrimary, themeHint),
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _buildSidebarTab(int index, String label, IconData icon, Color primary, Color text, Color hint) {
    final isSelected = _selectedCategory == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = index),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? primary : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isSelected ? Colors.white : hint),
            const SizedBox(width: 16),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : text,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _getContent(Color text, Color card, Color border, Color primary, Color hint) {
    switch (_selectedCategory) {
      case 0: return _buildGeneralSettings(text, card, border, primary, hint);
      case 1: return _buildOperationalSettings(text, card, border, primary, hint);
      case 2: return _buildBrandingSettings(text, card, border, primary, hint);
      case 3: return _buildPaymentGateways(text, card, border, primary, hint);
      case 4: return _buildCommunicationSettings(text, card, border, primary, hint);
      case 5: return _buildResetView(text, card, border, primary, hint);
      default: return _buildGeneralSettings(text, card, border, primary, hint);
    }
  }

  Widget _buildGeneralSettings(Color text, Color card, Color border, Color primary, Color hint) {
    final tenant = widget.settings['tenant'] ?? {};
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: LocalizationService().translate('general_settings'),
            subtitle: LocalizationService().translate('general_settings_desc'),
          ),
          const SizedBox(height: 32),
          SettingsGridCard(
            title: LocalizationService().translate('restaurant_info'),
            children: [
              SettingDropdown(
                label: LocalizationService().translate('primary_currency'),
                description: LocalizationService().translate('primary_currency_desc'),
                value: tenant['currency'] ?? 'USD',
                items: const ['USD', 'AUD', 'GBP', 'EUR', 'AED', 'SAR'],
                onChanged: (val) => widget.onUpdateSetting('tenant', {'currency': val}),
              ),
              SettingDropdown(
                label: LocalizationService().translate('ui_theme'),
                description: 'Select your preferred visual style',
                value: tenant['theme_mode'] ?? 'Dark',
                items: const ['Light', 'Dark', 'System', 'Midnight Blue', 'Emerald Green', 'Aura Purple'],
                onChanged: (val) {
                  if (val != null) {
                    widget.onUpdateSetting('tenant', {'theme_mode': val});
                    // Apply theme immediately
                    ThemeService().setFlavorFromString(val);
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOperationalSettings(Color text, Color card, Color border, Color primary, Color hint) {
    final branch = widget.settings['branch'] ?? {};
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: LocalizationService().translate('operations_settings'),
            subtitle: 'Configure your restaurant floor and kitchen rules.',
          ),
          const SizedBox(height: 32),
          SettingsGridCard(
            title: 'Taxes & Fees',
            children: [
              SettingToggle(
                label: LocalizationService().translate('enable_tax'),
                description: 'Apply tax to all orders',
                value: (branch['is_tax_enabled'] == 1 || branch['is_tax_enabled'] == true),
                onChanged: (val) => widget.onUpdateSetting('branch', {'is_tax_enabled': val ? 1 : 0}),
              ),
              SettingInput(
                label: 'Tax Rate (%)',
                description: 'Percentage to charge',
                initialValue: branch['tax_rate']?.toString() ?? '0',
                onChanged: (val) => widget.onUpdateSetting('branch', {'tax_rate': double.tryParse(val) ?? 0.0}),
                isNumeric: true,
              ),
              SettingInput(
                label: 'Service Charge (%)',
                description: 'Optional gratuity fee',
                initialValue: branch['gratuity_percentage']?.toString() ?? '0',
                onChanged: (val) => widget.onUpdateSetting('branch', {'gratuity_percentage': double.tryParse(val) ?? 0.0}),
                isNumeric: true,
              ),
            ],
          ),
          const SizedBox(height: 24),
          SettingsGridCard(
            title: 'Kitchen & Floor',
            children: [
              SettingInput(
                label: 'KDS Timer (Minutes)',
                description: 'Warning threshold for orders',
                initialValue: branch['kds_timer_minutes']?.toString() ?? '15',
                onChanged: (val) => widget.onUpdateSetting('branch', {'kds_timer_minutes': int.tryParse(val) ?? 15}),
                isNumeric: true,
              ),
              SettingToggle(
                label: 'QR Table Ordering',
                description: 'Allow customers to order from table',
                value: (branch['allow_qr_pay'] == 1 || branch['allow_qr_pay'] == true),
                onChanged: (val) => widget.onUpdateSetting('branch', {'allow_qr_pay': val ? 1 : 0}),
              ),
              SettingDropdown(
                label: 'Payment Policy',
                description: 'Determine when payment is collected (Pay First for Counter, Pay Last for Tables)',
                value: branch['payment_policy'] ?? 'Pay Last',
                items: const ['Pay First', 'Pay Last'],
                onChanged: (val) => widget.onUpdateSetting('branch', {'payment_policy': val}),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBrandingSettings(Color text, Color card, Color border, Color primary, Color hint) {
    final tenant = widget.settings['tenant'] ?? {};
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: LocalizationService().translate('branding_settings'),
            subtitle: 'Upload logos and customize your presence.',
          ),
          const SizedBox(height: 32),
          SettingsGridCard(
            title: 'Visual Identity',
            children: [
              _buildImagePickerSetting('Primary Logo', 'Appears on login and headers', tenant['logo_url'] ?? '', 'logo_url', primary, card, border),
              _buildImagePickerSetting('Secondary Logo', 'Used for dark themes/footers', tenant['secondary_logo_url'] ?? '', 'secondary_logo_url', primary, card, border),
            ],
          ),
          const SizedBox(height: 24),
          SettingsGridCard(
            title: 'Business Contact Details',
            children: [
              SettingInput(
                label: 'Business Legal Name',
                description: 'Full name for official documents',
                initialValue: tenant['business_name'] ?? tenant['restaurant_name'] ?? '',
                onChanged: (val) => widget.onUpdateSetting('tenant', {'business_name': val, 'restaurant_name': val}),
              ),
              SettingInput(
                label: 'Business Email',
                description: 'Support/Contact email for customers',
                initialValue: tenant['business_email'] ?? '',
                onChanged: (val) => widget.onUpdateSetting('tenant', {'business_email': val}),
              ),
              SettingInput(
                label: 'Business Phone #',
                description: 'Contact number for orders/queries',
                initialValue: tenant['business_phone'] ?? '',
                onChanged: (val) => widget.onUpdateSetting('tenant', {'business_phone': val}),
              ),
              SettingInput(
                label: 'Business Address',
                description: 'Full physical address',
                initialValue: tenant['business_address'] ?? '',
                onChanged: (val) => widget.onUpdateSetting('tenant', {'business_address': val}),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildImagePickerSetting(String label, String desc, String path, String key, Color primary, Color card, Color border) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        Text(desc, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(8), border: Border.all(color: border)),
                child: Text(path.isEmpty ? 'No image selected' : path, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: () async {
                final newPath = await widget.onPickImage();
                if (newPath != null) {
                  widget.onUpdateSetting('tenant', {key: newPath});
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: primary, padding: const EdgeInsets.symmetric(horizontal: 16)),
              child: const Icon(Icons.upload_file_rounded, size: 18, color: Colors.white),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPaymentGateways(Color text, Color card, Color border, Color primary, Color hint) {
    final gateways = widget.settings['payment_gateways'] as List? ?? [];
    
    Map<String, dynamic> getGateway(String name) {
      final gateway = gateways.firstWhere((g) => g != null && g is Map && g['gateway_name'] == name, orElse: () => null);
      return gateway != null ? Map<String, dynamic>.from(gateway) : {};
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: 'Payment Gateways',
            subtitle: 'Configure Stripe and PayPal integrations.',
          ),
          const SizedBox(height: 32),
          _buildGatewayCard('Stripe', Icons.credit_card_rounded, getGateway('Stripe'), [
            {'label': 'Public Key', 'key': 'stripe_public'},
            {'label': 'Secret Key', 'key': 'stripe_secret'},
            {'label': 'Webhook Secret', 'key': 'stripe_webhook'},
          ], primary, card, text, border, hint),
          const SizedBox(height: 32),
          _buildGatewayCard('PayPal', Icons.account_balance_wallet_outlined, getGateway('PayPal'), [
            {'label': 'Client ID', 'key': 'paypal_public'},
            {'label': 'Secret Key', 'key': 'paypal_secret'},
          ], primary, card, text, border, hint),
        ],
      ),
    );
  }

  Widget _buildGatewayCard(String name, IconData icon, Map<String, dynamic> data, List<Map<String, String>> fields, Color primary, Color card, Color text, Color border, Color hint) {
    final dynamic activeVal = data['is_active'];
    final bool isActive = activeVal == 1 || activeVal == true || activeVal.toString() == '1';
    String env = data['environment']?.toString() ?? 'sandbox';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(20), border: Border.all(color: border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: primary, size: 28),
              const SizedBox(width: 16),
              Text(name, style: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.bold)),
              const Spacer(),
              Switch(
                value: isActive,
                onChanged: (val) => widget.onSaveGatewaySettings(name, {'is_active': val ? 1 : 0}),
                activeThumbColor: primary,
              ),
            ],
          ),
          const Divider(height: 32),
          Row(
            children: [
              Text('Environment:', style: TextStyle(color: text, fontWeight: FontWeight.w600)),
              const SizedBox(width: 16),
              _buildEnvChip(name, 'sandbox', env == 'sandbox', primary, card, text, border),
              const SizedBox(width: 8),
              _buildEnvChip(name, 'production', env == 'production', primary, card, text, border),
            ],
          ),
          const SizedBox(height: 24),
          ...fields.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SettingInput(
              label: f['label']!,
              description: '',
              initialValue: name == 'Stripe' 
                  ? (f['key'] == 'stripe_public' ? (data['public_key']?.toString() ?? '') : f['key'] == 'stripe_secret' ? (data['secret_key']?.toString() ?? '') : (data['webhook_secret']?.toString() ?? ''))
                  : (f['key'] == 'paypal_public' ? (data['public_key']?.toString() ?? '') : (data['secret_key']?.toString() ?? '')),
              onChanged: (val) {
                final dbKey = f['key']!.contains('public') ? 'public_key' : (f['key']!.contains('secret') ? 'secret_key' : 'webhook_secret');
                widget.onSaveGatewaySettings(name, {dbKey: val});
              },
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildEnvChip(String gateway, String value, bool isSelected, Color primary, Color card, Color text, Color border) {
    return GestureDetector(
      onTap: () => widget.onSaveGatewaySettings(gateway, {'environment': value}),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? primary : border),
        ),
        child: Text(value.toUpperCase(), style: TextStyle(color: isSelected ? Colors.white : text, fontSize: 11, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildCommunicationSettings(Color text, Color card, Color border, Color primary, Color hint) {
    final tenant = widget.settings['tenant'] ?? {};
    final messaging = widget.settings['messaging'] as List? ?? [];
    final emails = widget.settings['email'] as List? ?? [];
    
    Map<String, dynamic> getMessagingProvider(String name) {
      final provider = messaging.firstWhere((p) => p != null && p is Map && p['provider_name'] == name, orElse: () => null);
      return provider != null ? Map<String, dynamic>.from(provider) : {};
    }

    Map<String, dynamic> getEmailProvider(String name) {
      final provider = emails.firstWhere((p) => p != null && p is Map && p['provider_name'] == name, orElse: () => null);
      return provider != null ? Map<String, dynamic>.from(provider) : {};
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: LocalizationService().translate('communications_settings'),
            subtitle: 'Configure notifications and gateway integrations.',
          ),
          const SizedBox(height: 32),
          
          // Basic Notifications
          SettingsGridCard(
            title: 'In-App Notifications',
            children: [
              SettingToggle(
                label: 'Enable Sound',
                description: 'Play alert sound on new orders',
                value: (tenant['notification_sound'] == 1 || tenant['notification_sound'] == true),
                onChanged: (val) => widget.onUpdateSetting('tenant', {'notification_sound': val}),
              ),
              SettingInput(
                label: 'Volume',
                description: 'Notification sound volume (0-100)',
                initialValue: tenant['notification_volume']?.toString() ?? '80',
                onChanged: (val) => widget.onUpdateSetting('tenant', {'notification_volume': int.tryParse(val) ?? 80}),
                isNumeric: true,
              ),
            ],
          ),
          const SizedBox(height: 40),

          // Messaging Gateways
          Text('Messaging Integrations', style: TextStyle(color: text, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildMessagingCard('Twilio', Icons.sms_outlined, getMessagingProvider('Twilio'), [
            {'label': 'Account SID', 'key': 'account_sid'},
            {'label': 'Auth Token', 'key': 'auth_token'},
            {'label': 'Sender Number', 'key': 'sender_number'},
          ], primary, card, text, border, hint),
          const SizedBox(height: 24),
          _buildMessagingCard('WhatsApp Direct', Icons.chat_outlined, getMessagingProvider('WhatsApp Direct'), [
            {'label': 'Account SID', 'key': 'account_sid'},
            {'label': 'Auth Token', 'key': 'auth_token'},
            {'label': 'WABA ID', 'key': 'sender_number'},
          ], primary, card, text, border, hint),

          const SizedBox(height: 40),

          // Email Gateways
          Text('Email Gateways', style: TextStyle(color: text, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildEmailCard('SMTP', Icons.mail_rounded, getEmailProvider('SMTP'), [
            {'label': 'SMTP Host', 'key': 'smtp_host'},
            {'label': 'SMTP Port', 'key': 'smtp_port'},
            {'label': 'Username', 'key': 'smtp_user'},
            {'label': 'Password', 'key': 'smtp_pass'},
            {'label': 'From Email', 'key': 'from_email'},
            {'label': 'From Name', 'key': 'from_name'},
          ], primary, card, text, border, hint),
        ],
      ),
    );
  }

  Widget _buildMessagingCard(String name, IconData icon, Map<String, dynamic> data, List<Map<String, String>> fields, Color primary, Color card, Color text, Color border, Color hint) {
    final dynamic activeVal = data['is_active'];
    final bool isActive = activeVal == 1 || activeVal == true || activeVal.toString() == '1';
    String env = data['environment']?.toString() ?? 'sandbox';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(20), border: Border.all(color: border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: primary, size: 28),
              const SizedBox(width: 16),
              Text(name, style: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.bold)),
              const Spacer(),
              Switch(
                value: isActive,
                onChanged: (val) => widget.onSaveMessagingSettings(name, {'is_active': val ? 1 : 0}),
                activeThumbColor: primary,
              ),
            ],
          ),
          const Divider(height: 32),
          Row(
            children: [
              Text('Environment:', style: TextStyle(color: text, fontWeight: FontWeight.w600)),
              const SizedBox(width: 16),
              _buildSimpleChip(name, 'sandbox', env == 'sandbox', (v) => widget.onSaveMessagingSettings(name, {'environment': v}), primary, card, text, border),
              const SizedBox(width: 8),
              _buildSimpleChip(name, 'production', env == 'production', (v) => widget.onSaveMessagingSettings(name, {'environment': v}), primary, card, text, border),
            ],
          ),
          const SizedBox(height: 24),
          ...fields.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SettingInput(
              label: f['label']!,
              description: '',
              initialValue: data[f['key']]?.toString() ?? '',
              onChanged: (val) => widget.onSaveMessagingSettings(name, {f['key']!: val}),
            ),
          )),
          const SizedBox(height: 16),
          Row(
            children: [
              const Spacer(),
              TextButton.icon(
                onPressed: () => widget.onTestMessagingConnection(name, data),
                icon: const Icon(Icons.send_rounded, size: 18),
                label: Text(LocalizationService().translate('test_connection')),
                style: TextButton.styleFrom(foregroundColor: primary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmailCard(String name, IconData icon, Map<String, dynamic> data, List<Map<String, String>> fields, Color primary, Color card, Color text, Color border, Color hint) {
    final dynamic activeVal = data['is_active'];
    final bool isActive = activeVal == 1 || activeVal == true || activeVal.toString() == '1';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(20), border: Border.all(color: border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: primary, size: 28),
              const SizedBox(width: 16),
              Text(name, style: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.bold)),
              const Spacer(),
              Switch(
                value: isActive,
                onChanged: (val) => widget.onSaveEmailSettings(name, {'is_active': val ? 1 : 0}),
                activeThumbColor: primary,
              ),
            ],
          ),
          const Divider(height: 32),
          ...fields.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SettingInput(
              label: f['label']!,
              description: '',
              initialValue: data[f['key']]?.toString() ?? '',
              onChanged: (val) => widget.onSaveEmailSettings(name, {f['key']!: val}),
            ),
          )),
          const SizedBox(height: 16),
          Row(
            children: [
              const Spacer(),
              TextButton.icon(
                onPressed: () => widget.onTestEmailConnection(name, data),
                icon: const Icon(Icons.send_rounded, size: 18),
                label: Text(LocalizationService().translate('test_connection')),
                style: TextButton.styleFrom(foregroundColor: primary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleChip(String provider, String value, bool isSelected, Function(String) onTap, Color primary, Color card, Color text, Color border) {
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? primary : border),
        ),
        child: Text(value.toUpperCase(), style: TextStyle(color: isSelected ? Colors.white : text, fontSize: 11, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildResetView(Color text, Color card, Color border, Color primary, Color hint) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SettingsHeader(
            title: LocalizationService().translate('system_maintenance'),
            subtitle: LocalizationService().translate('reset_transactional_data_desc'),
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 32),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            LocalizationService().translate('danger_zone'),
                            style: TextStyle(color: Colors.red, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            LocalizationService().translate('reset_warning_text'),
                            style: TextStyle(color: hint, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                Divider(color: border),
                const SizedBox(height: 32),
                Text(
                  LocalizationService().translate('data_impact_analysis'),
                  style: TextStyle(color: text, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildImpactRow(Icons.check_circle_outline, LocalizationService().translate('orders_payments_reservations'), true, hint),
                _buildImpactRow(Icons.check_circle_outline, LocalizationService().translate('expenses_purchases'), true, hint),
                _buildImpactRow(Icons.cancel_outlined, LocalizationService().translate('menu_items_categories'), false, hint),
                _buildImpactRow(Icons.cancel_outlined, LocalizationService().translate('users_roles_permissions'), false, hint),
                _buildImpactRow(Icons.cancel_outlined, LocalizationService().translate('table_layouts_settings'), false, hint),
                const SizedBox(height: 48),
                SizedBox(
                  width: double.infinity,
                  height: 60,
                  child: ElevatedButton.icon(
                    onPressed: () => _confirmReset(context),
                    icon: const Icon(Icons.delete_sweep_rounded, color: Colors.white),
                    label: Text(
                      LocalizationService().translate('reset_transactional_data').toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImpactRow(IconData icon, String label, bool isDeleted, Color hint) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: isDeleted ? Colors.red : Colors.green),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: hint, fontSize: 14)),
          const Spacer(),
          Text(
            isDeleted ? LocalizationService().translate('will_be_deleted') : LocalizationService().translate('will_be_preserved'),
            style: TextStyle(color: isDeleted ? Colors.red.withValues(alpha: 0.7) : Colors.green.withValues(alpha: 0.7), fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  void _confirmReset(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(LocalizationService().translate('are_you_sure')),
        content: Text(LocalizationService().translate('reset_confirmation_detailed')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocalizationService().translate('cancel'), style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color?.withValues(alpha: 0.5))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              widget.onResetTransactions();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text(LocalizationService().translate('confirm_reset'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
