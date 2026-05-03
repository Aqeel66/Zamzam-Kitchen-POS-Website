import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AdminSettingsPanel extends StatefulWidget {
  const AdminSettingsPanel({super.key});

  @override
  State<AdminSettingsPanel> createState() => _AdminSettingsPanelState();
}

class _AdminSettingsPanelState extends State<AdminSettingsPanel> {
  String _selectedCategory = 'Design & UI';
  
  // Design Settings
  bool _isDarkMode = false;
  String _themeFlavor = 'System';
  String _primaryAccentHex = '#F15A24';
  
  final String _baseUrl = 'http://localhost:5000/api';
  
  // Operational Settings
  bool _allowQRPay = true;
  bool _flexibleBillSplitting = true;
  double _kdsTimer = 15.0;

  // Payment Gateway Settings
  final TextEditingController _stripePublicKey = TextEditingController();
  final TextEditingController _stripeSecretKey = TextEditingController();
  final TextEditingController _stripeWebhookSecret = TextEditingController();
  bool _stripeEnabled = false;
  String _stripeEnv = 'sandbox';

  final TextEditingController _paypalClientId = TextEditingController();
  final TextEditingController _paypalSecretKey = TextEditingController();
  bool _paypalEnabled = false;
  String _paypalEnv = 'sandbox';
  
  // Messaging Settings
  final TextEditingController _twilioSid = TextEditingController();
  final TextEditingController _twilioToken = TextEditingController();
  final TextEditingController _twilioNumber = TextEditingController();
  bool _twilioEnabled = false;
  String _twilioEnv = 'sandbox';

  // WhatsApp Direct (Meta) Settings
  final TextEditingController _wabaPhoneId = TextEditingController();
  final TextEditingController _wabaAccessToken = TextEditingController();
  final TextEditingController _wabaId = TextEditingController();
  bool _wabaEnabled = false;
  String _wabaEnv = 'sandbox';

  // Email (SMTP) Settings
  final TextEditingController _smtpHost = TextEditingController();
  final TextEditingController _smtpPort = TextEditingController();
  final TextEditingController _smtpUser = TextEditingController();
  final TextEditingController _smtpPass = TextEditingController();
  final TextEditingController _smtpFromEmail = TextEditingController();
  final TextEditingController _smtpFromName = TextEditingController();
  bool _smtpEnabled = false;
  String _smtpEnv = 'sandbox';
  
  // Branding Settings
  final TextEditingController _businessName = TextEditingController();
  final TextEditingController _businessEmail = TextEditingController();
  final TextEditingController _businessPhone = TextEditingController();
  final TextEditingController _businessAddress = TextEditingController();
  final TextEditingController _logoUrl = TextEditingController();
  final TextEditingController _secondaryLogoUrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchGlobalSettings();
    _fetchIntegrationSettings();
  }

  Future<void> _fetchGlobalSettings() async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/settings'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final tenant = data['tenant'] ?? {};
        final branch = data['branch'] ?? {};

        setState(() {
          _isDarkMode = tenant['theme_mode'] == 'Dark';
          _themeFlavor = tenant['theme_mode'] ?? 'System';
          _primaryAccentHex = tenant['primary_accent_color'] ?? '#F15A24';
          
          _businessName.text = tenant['business_name'] ?? tenant['restaurant_name'] ?? '';
          _businessEmail.text = tenant['business_email'] ?? '';
          _businessPhone.text = tenant['business_phone'] ?? '';
          _businessAddress.text = tenant['business_address'] ?? '';
          _logoUrl.text = tenant['logo_url'] ?? '';
          _secondaryLogoUrl.text = tenant['secondary_logo_url'] ?? '';
          
          _allowQRPay = (branch['allow_qr_pay'] == 1 || branch['allow_qr_pay'] == true);
          _kdsTimer = double.tryParse(branch['kds_timer_minutes']?.toString() ?? '15') ?? 15.0;
        });
      }
    } catch (e) {
      debugPrint('Error fetching global settings: $e');
    }
  }

  Future<void> _fetchIntegrationSettings() async {
    await _fetchGatewaySettings();
    await _fetchMessagingSettings();
    await _fetchEmailSettings();
  }

  Future<void> _saveTenantSettings() async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/settings/tenant'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'theme_mode': _themeFlavor,
          'primary_accent_color': _primaryAccentHex,
          'business_name': _businessName.text,
          'restaurant_name': _businessName.text,
          'business_email': _businessEmail.text,
          'business_phone': _businessPhone.text,
          'business_address': _businessAddress.text,
          'logo_url': _logoUrl.text,
          'secondary_logo_url': _secondaryLogoUrl.text,
        }),
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Design settings saved!'), backgroundColor: Colors.green));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save design settings'), backgroundColor: Colors.red));
    }
  }

  Future<void> _saveBranchSettings() async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/settings/branch'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'allow_qr_pay': _allowQRPay ? 1 : 0,
          'kds_timer_minutes': _kdsTimer.round(),
        }),
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Operational settings saved!'), backgroundColor: Colors.green));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save operational settings'), backgroundColor: Colors.red));
    }
  }

  Future<void> _fetchGatewaySettings() async {
    try {
      final response = await http.get(Uri.parse('http://localhost:5000/api/payment-gateways'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        for (var gateway in data) {
          if (gateway['gateway_name'] == 'Stripe') {
            setState(() {
              _stripePublicKey.text = gateway['public_key'] ?? '';
              _stripeSecretKey.text = gateway['secret_key'] ?? '';
              _stripeWebhookSecret.text = gateway['webhook_secret'] ?? '';
              _stripeEnabled = gateway['is_active'] == 1;
              _stripeEnv = gateway['environment'] ?? 'sandbox';
            });
          } else if (gateway['gateway_name'] == 'PayPal') {
            setState(() {
              _paypalClientId.text = gateway['public_key'] ?? '';
              _paypalSecretKey.text = gateway['secret_key'] ?? '';
              _paypalEnabled = gateway['is_active'] == 1;
              _paypalEnv = gateway['environment'] ?? 'sandbox';
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching settings: $e');
    }
  }

  Future<void> _saveGatewaySettings(String name) async {
    final body = {
      'gateway_name': name,
      'public_key': name == 'Stripe' ? _stripePublicKey.text : _paypalClientId.text,
      'secret_key': name == 'Stripe' ? _stripeSecretKey.text : _paypalSecretKey.text,
      'webhook_secret': name == 'Stripe' ? _stripeWebhookSecret.text : '',
      'is_active': name == 'Stripe' ? _stripeEnabled : _paypalEnabled,
      'environment': name == 'Stripe' ? _stripeEnv : _paypalEnv,
    };

    try {
      final response = await http.post(
        Uri.parse('http://localhost:5000/api/payment-gateways'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name settings saved!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save settings')),
      );
    }
  }

  Future<void> _fetchMessagingSettings() async {
    try {
      final response = await http.get(Uri.parse('http://localhost:5000/api/messaging-settings'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        for (var provider in data) {
          if (provider['provider_name'] == 'Twilio') {
            setState(() {
              _twilioSid.text = provider['account_sid'] ?? '';
              _twilioToken.text = provider['auth_token'] ?? '';
              _twilioNumber.text = provider['sender_number'] ?? '';
              _twilioEnabled = provider['is_active'] == 1;
              _twilioEnv = provider['environment'] ?? 'sandbox';
            });
          } else if (provider['provider_name'] == 'WhatsApp Direct') {
            setState(() {
              _wabaPhoneId.text = provider['account_sid'] ?? '';
              _wabaAccessToken.text = provider['auth_token'] ?? '';
              _wabaId.text = provider['sender_number'] ?? '';
              _wabaEnabled = provider['is_active'] == 1;
              _wabaEnv = provider['environment'] ?? 'sandbox';
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching messaging settings: $e');
    }
  }

  Future<void> _saveMessagingSettings(String name) async {
    final body = {
      'provider_name': name,
      'account_sid': name == 'Twilio' ? _twilioSid.text : _wabaPhoneId.text,
      'auth_token': name == 'Twilio' ? _twilioToken.text : _wabaAccessToken.text,
      'sender_number': name == 'Twilio' ? _twilioNumber.text : _wabaId.text,
      'is_active': name == 'Twilio' ? _twilioEnabled : _wabaEnabled,
      'environment': name == 'Twilio' ? _twilioEnv : _wabaEnv,
    };

    try {
      final response = await http.post(
        Uri.parse('http://localhost:5000/api/messaging-settings'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name messaging settings saved!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save messaging settings')),
      );
    }
  }

  Future<void> _fetchEmailSettings() async {
    try {
      final response = await http.get(Uri.parse('http://localhost:5000/api/email-settings'));
      if (response.statusCode == 200) {
        final List settings = json.decode(response.body);
        for (var provider in settings) {
          if (provider['provider_name'] == 'SMTP') {
            setState(() {
              _smtpHost.text = provider['smtp_host'] ?? '';
              _smtpPort.text = (provider['smtp_port'] ?? '').toString();
              _smtpUser.text = provider['smtp_user'] ?? '';
              _smtpPass.text = provider['smtp_pass'] ?? '';
              _smtpFromEmail.text = provider['from_email'] ?? '';
              _smtpFromName.text = provider['from_name'] ?? '';
              _smtpEnabled = provider['is_active'] == 1;
              _smtpEnv = provider['environment'] ?? 'sandbox';
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching email settings: $e');
    }
  }

  Future<void> _saveEmailSettings(String name) async {
    final body = {
      'provider_name': name,
      'smtp_host': _smtpHost.text,
      'smtp_port': int.tryParse(_smtpPort.text) ?? 587,
      'smtp_user': _smtpUser.text,
      'smtp_pass': _smtpPass.text,
      'from_email': _smtpFromEmail.text,
      'from_name': _smtpFromName.text,
      'is_active': _smtpEnabled ? 1 : 0,
      'environment': _smtpEnv,
    };

    try {
      final response = await http.post(
        Uri.parse('http://localhost:5000/api/email-settings'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name settings saved!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save email settings')),
      );
    }
  }

  Future<void> _testMessagingConnection(String provider, Map<String, TextEditingController> controllers) async {
    final TextEditingController testNumberController = TextEditingController(text: '+');
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Test $provider Connection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter a phone number to send a test message.'),
            const SizedBox(height: 16),
            TextField(
              controller: testNumberController,
              decoration: const InputDecoration(labelText: 'Test Phone Number', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final number = testNumberController.text;
              Navigator.pop(context);
              
              try {
                final response = await http.post(
                  Uri.parse('http://localhost:5000/api/messaging-settings/test'),
                  headers: {'Content-Type': 'application/json'},
                  body: json.encode({
                    'provider_name': provider,
                    'account_sid': controllers.values.first.text, // Account SID / Phone ID
                    'auth_token': controllers.values.elementAt(1).text, // Token
                    'sender_number': controllers.values.elementAt(2).text, // Sender / WABA ID
                    'test_number': number,
                  }),
                );

                if (response.statusCode == 200) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Test message sent!'), backgroundColor: Colors.green));
                } else {
                  throw Exception('Failed to send test message');
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
              }
            },
            child: const Text('Send Test Message'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Global Settings & Customization',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: Row(
        children: [
          // SideNav
          Container(
            width: 250,
            color: Theme.of(context).cardColor,
            child: ListView(
              children: [
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('CORE SETTINGS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                ),
                _buildMenuTile(Icons.format_paint, 'Design & UI'),
                _buildMenuTile(Icons.branding_watermark, 'Branding & Identity'),
                _buildMenuTile(Icons.settings_applications, 'Operational Configs'),
                const Divider(),
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('INTEGRATIONS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                ),
                _buildMenuTile(Icons.payments, 'Payment Gateways'),
                _buildMenuTile(Icons.chat, 'WhatsApp & SMS'),
                _buildMenuTile(Icons.mail, 'Email & Notifications'),
                const Divider(),
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('ADMINISTRATION', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                ),
                _buildMenuTile(Icons.security, 'Roles & Permissions'),
                _buildMenuTile(Icons.card_giftcard, 'Loyalty & Campaigns'),
              ],
            ),
          ),
          // Settings Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32.0),
              child: _buildContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    switch (_selectedCategory) {
      case 'Design & UI':
        return _buildDesignUI();
      case 'Branding & Identity':
        return _buildBranding();
      case 'Operational Configs':
        return _buildOperationalConfigs();
      case 'Payment Gateways':
        return _buildPaymentGateways();
      case 'WhatsApp & SMS':
        return _buildWhatsAppSMS();
      case 'Email & Notifications':
        return _buildEmailNotifications();
      case 'Roles & Permissions':
        return const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.security_rounded, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text('Roles & Permissions Management', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              Text('Access this module via the POS Manager Dashboard for granular control.', style: TextStyle(color: Colors.grey)),
            ],
          ),
        );
      default:
        return const Center(child: Text('Coming Soon'));
    }
  }

  Widget _buildWhatsAppSMS() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('WhatsApp & SMS Integrations', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const Text('Configure your Twilio account to send automated messages.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        
        _buildIntegrationCard(
          name: 'Twilio',
          icon: Icons.chat_bubble,
          color: Colors.blue,
          enabled: _twilioEnabled,
          onToggle: (val) => setState(() => _twilioEnabled = val),
          env: _twilioEnv,
          onEnvChange: (val) => setState(() => _twilioEnv = val!),
          controllers: {
            'Account SID': _twilioSid,
            'Auth Token': _twilioToken,
            'Sender Number / WhatsApp Number': _twilioNumber,
          },
          onSave: () => _saveMessagingSettings('Twilio'),
          onTest: () => _testMessagingConnection('Twilio', {
            'Account SID': _twilioSid,
            'Auth Token': _twilioToken,
            'Sender Number / WhatsApp Number': _twilioNumber,
          }),
        ),
        
        const SizedBox(height: 24),
        
        _buildIntegrationCard(
          name: 'WhatsApp Direct (Meta)',
          icon: Icons.chat,
          color: Colors.green,
          enabled: _wabaEnabled,
          onToggle: (val) => setState(() => _wabaEnabled = val),
          env: _wabaEnv,
          onEnvChange: (val) => setState(() => _wabaEnv = val!),
          controllers: {
            'Phone Number ID': _wabaPhoneId,
            'Permanent Access Token': _wabaAccessToken,
            'WABA ID (Business Account ID)': _wabaId,
          },
          onSave: () => _saveMessagingSettings('WhatsApp Direct'),
          onTest: () => _testMessagingConnection('WhatsApp Direct', {
            'Phone Number ID': _wabaPhoneId,
            'Permanent Access Token': _wabaAccessToken,
            'WABA ID (Business Account ID)': _wabaId,
          }),
        ),
      ],
    );
  }

  Widget _buildIntegrationCard({
    required String name,
    required IconData icon,
    required Color color,
    required bool enabled,
    required Function(bool) onToggle,
    required String env,
    required Function(String?) onEnvChange,
    required Map<String, TextEditingController> controllers,
    required VoidCallback onSave,
    VoidCallback? onTest,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 32),
                const SizedBox(width: 16),
                Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const Spacer(),
                Switch(
                  value: enabled,
                  activeColor: color,
                  onChanged: onToggle,
                ),
                Text(enabled ? 'Enabled' : 'Disabled', style: TextStyle(color: enabled ? Colors.green : Colors.grey)),
              ],
            ),
            const Divider(height: 32),
            Row(
              children: [
                const Text('Environment: ', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(width: 16),
                ChoiceChip(
                  label: const Text('Sandbox'),
                  selected: env == 'sandbox',
                  onSelected: (val) => onEnvChange('sandbox'),
                  selectedColor: color.withOpacity(0.2),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Production'),
                  selected: env == 'production',
                  onSelected: (val) => onEnvChange('production'),
                  selectedColor: color.withOpacity(0.2),
                ),
              ],
            ),
            const SizedBox(height: 24),
            ...controllers.entries.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: TextFormField(
                controller: e.value,
                obscureText: e.key.contains('Token') || e.key.contains('Secret'),
                decoration: InputDecoration(
                  labelText: e.key,
                  border: const OutlineInputBorder(),
                  prefixIcon: Icon(e.key.contains('Token') ? Icons.lock : Icons.vpn_key),
                ),
              ),
            )),
            const SizedBox(height: 16),
            Row(
              children: [
                if (onTest != null)
                  TextButton.icon(
                    onPressed: onTest,
                    icon: const Icon(Icons.send, size: 18),
                    label: const Text('Test Connection'),
                    style: TextButton.styleFrom(foregroundColor: color),
                  ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: onSave,
                  icon: const Icon(Icons.save),
                  label: const Text('Save Settings'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: color,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(48.0),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.construction, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('This integration module is coming soon.', style: TextStyle(fontSize: 18, color: Colors.grey)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDesignUI() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Design & UI Customization', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Theme Engine', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _themeFlavor,
                  decoration: const InputDecoration(labelText: 'Theme Flavor', border: OutlineInputBorder()),
                  items: ['Light', 'Dark', 'System', 'Midnight Blue', 'Emerald Green', 'Aura Purple'].map((flavor) {
                    return DropdownMenuItem(value: flavor, child: Text(flavor));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _themeFlavor = val);
                  },
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Legacy: Force Dark Mode Override'),
                  subtitle: const Text('Only recommended if System theme is used.'),
                  value: _isDarkMode,
                  activeThumbColor: const Color(0xFFF15A24),
                  onChanged: (val) => setState(() => _isDarkMode = val),
                ),
                const Divider(),
                const Text('Primary Accent Color', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(width: 40, height: 40, decoration: BoxDecoration(color: Color(int.parse(_primaryAccentHex.replaceAll('#', '0xFF'))), shape: BoxShape.circle, border: Border.all(color: Colors.grey))),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        initialValue: _primaryAccentHex,
                        decoration: const InputDecoration(labelText: 'Hex Code (e.g. #F15A24)', border: OutlineInputBorder()),
                        onChanged: (val) => _primaryAccentHex = val,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    onPressed: _saveTenantSettings,
                    icon: const Icon(Icons.save),
                    label: const Text('Save Design Settings'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF15A24),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOperationalConfigs() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Operational Configurations', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SwitchListTile(
                  title: const Text('Allow QR Pay'),
                  value: _allowQRPay,
                  activeThumbColor: const Color(0xFFF15A24),
                  onChanged: (val) => setState(() => _allowQRPay = val),
                ),
                SwitchListTile(
                  title: const Text('Flexible Bill Splitting'),
                  value: _flexibleBillSplitting,
                  activeThumbColor: const Color(0xFFF15A24),
                  onChanged: (val) => setState(() => _flexibleBillSplitting = val),
                ),
                const Divider(),
                const Text('KDS Ticket Timer (minutes)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                Slider(
                  value: _kdsTimer,
                  min: 5,
                  max: 60,
                  divisions: 11,
                  label: _kdsTimer.round().toString(),
                  activeColor: const Color(0xFFF15A24),
                  onChanged: (val) => setState(() => _kdsTimer = val),
                ),
                const SizedBox(height: 24),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    onPressed: _saveBranchSettings,
                    icon: const Icon(Icons.save),
                    label: const Text('Save Operational Configs'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF15A24),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentGateways() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Payment Gateway Integrations', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const Text('Manage your API credentials for payment processing.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        
        // Stripe Section
        _buildGatewayCard(
          name: 'Stripe',
          icon: Icons.credit_card,
          enabled: _stripeEnabled,
          onToggle: (val) => setState(() => _stripeEnabled = val),
          env: _stripeEnv,
          onEnvChange: (val) => setState(() => _stripeEnv = val!),
          controllers: {
            'Public Key (Publishable Key)': _stripePublicKey,
            'Secret Key': _stripeSecretKey,
            'Webhook Secret': _stripeWebhookSecret,
          },
          onSave: () => _saveGatewaySettings('Stripe'),
        ),
        
        const SizedBox(height: 24),

        // PayPal Section
        _buildGatewayCard(
          name: 'PayPal',
          icon: Icons.account_balance_wallet,
          enabled: _paypalEnabled,
          onToggle: (val) => setState(() => _paypalEnabled = val),
          env: _paypalEnv,
          onEnvChange: (val) => setState(() => _paypalEnv = val!),
          controllers: {
            'Client ID': _paypalClientId,
            'Secret Key': _paypalSecretKey,
          },
          onSave: () => _saveGatewaySettings('PayPal'),
        ),
      ],
    );
  }

  Widget _buildGatewayCard({
    required String name,
    required IconData icon,
    required bool enabled,
    required Function(bool) onToggle,
    required String env,
    required Function(String?) onEnvChange,
    required Map<String, TextEditingController> controllers,
    required VoidCallback onSave,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFFF15A24), size: 32),
                const SizedBox(width: 16),
                Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const Spacer(),
                Switch(
                  value: enabled,
                  activeColor: const Color(0xFFF15A24),
                  onChanged: onToggle,
                ),
                Text(enabled ? 'Enabled' : 'Disabled', style: TextStyle(color: enabled ? Colors.green : Colors.grey)),
              ],
            ),
            const Divider(height: 32),
            Row(
              children: [
                const Text('Environment: ', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(width: 16),
                ChoiceChip(
                  label: const Text('Sandbox'),
                  selected: env == 'sandbox',
                  onSelected: (val) => onEnvChange('sandbox'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Production'),
                  selected: env == 'production',
                  onSelected: (val) => onEnvChange('production'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            ...controllers.entries.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: TextFormField(
                controller: e.value,
                obscureText: e.key.contains('Secret'),
                decoration: InputDecoration(
                  labelText: e.key,
                  border: const OutlineInputBorder(),
                  prefixIcon: Icon(e.key.contains('Secret') ? Icons.lock : Icons.vpn_key),
                ),
              ),
            )),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton.icon(
                onPressed: onSave,
                icon: const Icon(Icons.save),
                label: const Text('Save Credentials'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF15A24),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuTile(IconData icon, String title) {
    bool isSelected = _selectedCategory == title;
    return ListTile(
      leading: Icon(icon, color: isSelected ? const Color(0xFFF15A24) : Colors.grey),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? const Color(0xFFF15A24) : null,
        ),
      ),
      selected: isSelected,
      onTap: () => setState(() => _selectedCategory = title),
    );
  }

  Widget _buildEmailNotifications() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Email & Notifications', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const Text('Configure SMTP settings for system-wide email notifications.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        
        _buildIntegrationCard(
          name: 'SMTP',
          icon: Icons.mail,
          color: Colors.purple,
          enabled: _smtpEnabled,
          onToggle: (val) => setState(() => _smtpEnabled = val),
          env: _smtpEnv,
          onEnvChange: (val) => setState(() => _smtpEnv = val!),
          controllers: {
            'SMTP Host': _smtpHost,
            'SMTP Port': _smtpPort,
            'Username': _smtpUser,
            'Password': _smtpPass,
            'From Email': _smtpFromEmail,
            'From Name': _smtpFromName,
          },
          onSave: () => _saveEmailSettings('SMTP'),
          onTest: () => _testEmailSettings('SMTP'),
        ),
      ],
    );
  }

  Future<void> _testEmailSettings(String provider) async {
    final TextEditingController testEmailController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Test SMTP Connection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter an email address to send a test message.'),
            const SizedBox(height: 16),
            TextField(
              controller: testEmailController,
              decoration: const InputDecoration(labelText: 'Test Email Address', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final email = testEmailController.text;
              Navigator.pop(context);
              
              try {
                final response = await http.post(
                  Uri.parse('http://localhost:5000/api/email-settings/test'),
                  headers: {'Content-Type': 'application/json'},
                  body: json.encode({
                    'provider_name': provider,
                    'smtp_host': _smtpHost.text,
                    'smtp_port': int.tryParse(_smtpPort.text) ?? 587,
                    'smtp_user': _smtpUser.text,
                    'smtp_pass': _smtpPass.text,
                    'from_email': _smtpFromEmail.text,
                    'from_name': _smtpFromName.text,
                    'test_email': email,
                  }),
                );

                if (response.statusCode == 200) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Test email sent!'), backgroundColor: Colors.green));
                } else {
                  throw Exception('Failed to send test email');
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
              }
            },
            child: const Text('Send Test Email'),
          ),
        ],
      ),
    );
  }
  Widget _buildBranding() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Branding & Identity', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
        const Text('Manage your restaurant branding, logos and official business details.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Business Identity', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                _buildTextField('Business Legal Name', _businessName, Icons.business),
                const SizedBox(height: 16),
                _buildTextField('Business Email', _businessEmail, Icons.email),
                const SizedBox(height: 16),
                _buildTextField('Business Phone', _businessPhone, Icons.phone),
                const SizedBox(height: 16),
                _buildTextField('Business Address', _businessAddress, Icons.location_on, maxLines: 3),
                const Divider(height: 48),
                const Text('Visual Assets (Logo URLs)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                _buildTextField('Primary Logo URL', _logoUrl, Icons.image),
                const SizedBox(height: 16),
                _buildTextField('Secondary Logo URL', _secondaryLogoUrl, Icons.image_aspect_ratio),
                const SizedBox(height: 32),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    onPressed: _saveTenantSettings,
                    icon: const Icon(Icons.save),
                    label: const Text('Save Branding Details'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF15A24),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        prefixIcon: Icon(icon),
      ),
    );
  }
}
