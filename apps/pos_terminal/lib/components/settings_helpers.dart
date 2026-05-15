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
    final themeHint = themeText.withOpacity(0.6);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: themeText,
            fontSize: 32,
            fontWeight: FontWeight.bold,
          ),
        ),
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
    final themeBorder = themeText.withOpacity(0.15);

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
            child: Text(
              title,
              style: TextStyle(
                color: themeText,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
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
  final bool isObscure;

  const SettingInput({
    super.key,
    required this.label,
    required this.description,
    required this.initialValue,
    required this.onChanged,
    this.isNumeric = false,
    this.isObscure = false,
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
    if (oldWidget.initialValue != widget.initialValue &&
        _controller.text != widget.initialValue) {
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
    final themeHint = themeText.withOpacity(0.6);
    final themePrimary = theme.primaryColor;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(
        widget.label,
        style: TextStyle(color: themeText, fontWeight: FontWeight.w600),
      ),
      subtitle: widget.description.isNotEmpty
          ? Text(
              widget.description,
              style: TextStyle(color: themeHint, fontSize: 13),
            )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: widget.isNumeric ? 100 : 350,
            child: TextField(
              controller: _controller,
              obscureText: widget.isObscure,
              textAlign: widget.isNumeric ? TextAlign.end : TextAlign.start,
              keyboardType: widget.isNumeric
                  ? const TextInputType.numberWithOptions(decimal: true)
                  : TextInputType.text,
              decoration: InputDecoration(
                border: widget.isNumeric
                    ? InputBorder.none
                    : const OutlineInputBorder(),
                hintText: widget.isNumeric
                    ? null
                    : 'Enter ${widget.label.toLowerCase()}...',
                contentPadding: widget.isNumeric
                    ? null
                    : const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              style: TextStyle(
                color: widget.isNumeric ? themePrimary : themeText,
                fontWeight: widget.isNumeric
                    ? FontWeight.bold
                    : FontWeight.normal,
                fontSize: 14,
              ),
              onSubmitted: widget.onChanged,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(
              Icons.check_circle_outline,
              color: Colors.green,
              size: 22,
            ),
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
    final themeHint = themeText.withOpacity(0.6);
    final themePrimary = theme.primaryColor;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(
        label,
        style: TextStyle(color: themeText, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        description,
        style: TextStyle(color: themeHint, fontSize: 13),
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeThumbColor: themePrimary,
        activeTrackColor: themePrimary.withOpacity(0.3),
      ),
    );
  }
}

class SettingDropdown extends StatelessWidget {
  final String label;
  final String description;
  final String value;
  final List<String> items;
  final Map<String, String>? labels;
  final Function(String?) onChanged;

  const SettingDropdown({
    super.key,
    required this.label,
    required this.description,
    required this.value,
    required this.items,
    this.labels,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeCard = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      title: Text(
        label,
        style: TextStyle(color: themeText, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        description,
        style: TextStyle(color: themeHint, fontSize: 13),
      ),
      trailing: DropdownButton<String>(
        value: items.contains(value)
            ? value
            : (items.isNotEmpty ? items.first : null),
        underline: const SizedBox.shrink(),
        dropdownColor: themeCard,
        items: items.map((opt) {
          final displayLabel = labels?[opt] ?? opt;
          return DropdownMenuItem(
            value: opt,
            child: Text(displayLabel, style: TextStyle(color: themeText)),
          );
        }).toList(),
        onChanged: onChanged,
      ),
    );
  }
}

class SettingColorPicker extends StatelessWidget {
  final String label;
  final String description;
  final String? value;
  final Function(String) onChanged;

  const SettingColorPicker({
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
    final themeHint = themeText.withOpacity(0.6);

    final presets = [
      {
        'name': 'Pulse Orange',
        'color': const Color(0xFFF15A24),
        'hex': '#F15A24',
      },
      {'name': 'Navy Blue', 'color': const Color(0xFF1E3A8A), 'hex': '#1E3A8A'},
      {
        'name': 'Ocean Blue',
        'color': const Color(0xFF0EA5E9),
        'hex': '#0EA5E9',
      },
      {'name': 'Emerald', 'color': const Color(0xFF10B981), 'hex': '#10B981'},
      {
        'name': 'Royal Purple',
        'color': const Color(0xFF8B5CF6),
        'hex': '#8B5CF6',
      },
      {'name': 'Crimson', 'color': const Color(0xFFEF4444), 'hex': '#EF4444'},
      {'name': 'Amber', 'color': const Color(0xFFF59E0B), 'hex': '#F59E0B'},
    ];

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      title: Text(
        label,
        style: TextStyle(color: themeText, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        description,
        style: TextStyle(color: themeHint, fontSize: 13),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Presets
          ...presets.map((p) {
            final isSelected = value?.toUpperCase() == p['hex'];
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () => onChanged(p['hex'] as String),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: p['color'] as Color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: 2,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: (p['color'] as Color).withOpacity(0.4),
                              blurRadius: 8,
                              spreadRadius: 2,
                            ),
                          ]
                        : [],
                  ),
                  child: isSelected
                      ? const Icon(Icons.check, color: Colors.white, size: 16)
                      : null,
                ),
              ),
            );
          }),
          const SizedBox(width: 16),
          // Custom Hex Input
          SizedBox(
            width: 120,
            child: TextField(
              decoration: InputDecoration(
                hintText: '#HEX',
                prefixText: '#',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                border: const OutlineInputBorder(),
              ),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              controller: TextEditingController(
                text: value?.replaceFirst('#', ''),
              ),
              onSubmitted: (val) {
                if (val.isNotEmpty) {
                  onChanged('#${val.replaceFirst('#', '')}');
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}

class SettingActionRow extends StatelessWidget {
  final String label;
  final String description;
  final String buttonLabel;
  final Color buttonColor;
  final VoidCallback onPressed;

  const SettingActionRow({
    super.key,
    required this.label,
    required this.description,
    required this.buttonLabel,
    required this.buttonColor,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withOpacity(0.6);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      title: Text(
        label,
        style: TextStyle(color: themeText, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        description,
        style: TextStyle(color: themeHint, fontSize: 13),
      ),
      trailing: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: buttonColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(
          buttonLabel,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

