import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:restaurant_management_system/main.dart';

void main() {
  testWidgets('Platform smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ZamamKitchenApp());

    // Verify that the AuthGate login screen is rendered
    expect(find.text('Zamam Kitchen'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });
}
