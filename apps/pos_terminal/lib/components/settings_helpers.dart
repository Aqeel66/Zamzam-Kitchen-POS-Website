import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../localization_service.dart';

class SettingsHeader extends StatelessWidget {
  final String title;
  final String subtitle;

  const SettingsHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withValues(alpha: 0.6);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(color: themeText, fontSize: 32, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(subtitle, style: TextStyle(color: themeHint, fontSize: 16)),
      ],
    );
  }
}

class SettingsGridCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const SettingsGridCard({
    super.key,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeCard = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeBorder = themeText.withValues(alpha: 0.15);

    return Container(
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
            child: Text(title, style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 8),
          Divider(color: themeBorder),
          ...children,
        ],
      ),
    );
  }
}

class SettingInput extends StatefulWidget {
  final String label;
  final String description;
  final String initialValue;
  final Function(String) onChanged;
  final bool isNumeric;

  const SettingInput({
    super.key,
    required this.label,
    required this.description,
    required this.initialValue,
    required this.onChanged,
    this.isNumeric = false,
  });

  @override
  State<SettingInput> createState() => _SettingInputState();
}

class _SettingInputState extends State<SettingInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(SettingInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue && _controller.text != widget.initialValue) {
      _controller.text = widget.initialValue;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withValues(alpha: 0.6);
    final themePrimary = theme.primaryColor;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(widget.label, style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
      subtitle: widget.description.isNotEmpty ? Text(widget.description, style: TextStyle(color: themeHint, fontSize: 13)) : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: widget.isNumeric ? 100 : 350,
            child: TextField(
              controller: _controller,
              textAlign: widget.isNumeric ? TextAlign.end : TextAlign.start,
              keyboardType: widget.isNumeric ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
              decoration: InputDecoration(
                border: widget.isNumeric ? InputBorder.none : const OutlineInputBorder(),
                hintText: widget.isNumeric ? null : 'Enter ${widget.label.toLowerCase()}...',
                contentPadding: widget.isNumeric ? null : const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              style: TextStyle(
                color: widget.isNumeric ? themePrimary : themeText, 
                fontWeight: widget.isNumeric ? FontWeight.bold : FontWeight.normal,
                fontSize: 14,
              ),
              onSubmitted: widget.onChanged,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 22),
            onPressed: () => widget.onChanged(_controller.text),
            tooltip: LocalizationService().translate('save'),
          ),
        ],
      ),
    );
  }
}

class SettingToggle extends StatelessWidget {
  final String label;
  final String description;
  final bool value;
  final Function(bool) onChanged;

  const SettingToggle({
    super.key,
    required this.label,
    required this.description,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withValues(alpha: 0.6);
    final themePrimary = theme.primaryColor;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(label, style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
      subtitle: Text(description, style: TextStyle(color: themeHint, fontSize: 13)),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeThumbColor: themePrimary,
        activeTrackColor: themePrimary.withValues(alpha: 0.3),
      ),
    );
  }
}

class SettingDropdown extends StatelessWidget {
  final String label;
  final String description;
  final String value;
  final List<String> items;
  final Function(String?) onChanged;

  const SettingDropdown({
    super.key,
    required this.label,
    required this.description,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeCard = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withValues(alpha: 0.6);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(label, style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
      subtitle: Text(description, style: TextStyle(color: themeHint, fontSize: 13)),
      trailing: DropdownButton<String>(
        value: items.contains(value) ? value : (items.isNotEmpty ? items.first : null),
        underline: const SizedBox.shrink(),
        dropdownColor: themeCard,
        items: items.map((opt) => DropdownMenuItem(value: opt, child: Text(opt, style: TextStyle(color: themeText)))).toList(),
        onChanged: onChanged,
      ),
    );
  }
}
