import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:pos_terminal/theme_service.dart';
import 'package:flutter/foundation.dart';

class ReceiptService {
  static final Map<String, Uint8List> _logoCache = {};
  static Future<Uint8List> generateReceiptPdf({
    required Map<String, dynamic> order,
    required Map<String, dynamic> settings,
  }) async {
    final pdf = pw.Document();
    final items = order['items'] as List? ?? [];
    final tenant = settings['tenant'] ?? {};
    final restaurantName = tenant['business_name'] ?? tenant['restaurant_name'] ?? tenant['name'] ?? 'Zamzam Kitchen';
    final address = tenant['business_address'] ?? tenant['address'] ?? '';
    final phone = tenant['business_phone'] ?? tenant['phone'] ?? '';
    final email = tenant['business_email'] ?? tenant['email'] ?? '';
    final currency = tenant['currency'] ?? '\$';
    final orderTime = DateTime.tryParse(order['order_time']?.toString() ?? '') ?? DateTime.now();

    final String logoUrl = tenant['logo_url'] ?? '';
    final String secondaryLogoUrl = tenant['secondary_logo_url'] ?? '';
    pw.ImageProvider? logo;
    pw.ImageProvider? secondaryLogo;

    try {
      if (logoUrl.isNotEmpty) {
        final url = ThemeService.resolveImageUrl(logoUrl);
        if (_logoCache.containsKey(url)) {
          logo = pw.MemoryImage(_logoCache[url]!);
        } else {
          final resp = await http.get(Uri.parse(url));
          if (resp.statusCode == 200) {
            _logoCache[url] = resp.bodyBytes;
            logo = pw.MemoryImage(resp.bodyBytes);
          }
        }
      }
      if (secondaryLogoUrl.isNotEmpty) {
        final url = ThemeService.resolveImageUrl(secondaryLogoUrl);
        if (_logoCache.containsKey(url)) {
          secondaryLogo = pw.MemoryImage(_logoCache[url]!);
        } else {
          final resp = await http.get(Uri.parse(url));
          if (resp.statusCode == 200) {
            _logoCache[url] = resp.bodyBytes;
            secondaryLogo = pw.MemoryImage(resp.bodyBytes);
          }
        }
      }
    } catch (_) {}

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        margin: const pw.EdgeInsets.all(10),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (logo != null || secondaryLogo != null)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.center,
                  children: [
                    if (logo != null)
                      pw.Container(
                        height: 35,
                        child: pw.Image(logo, fit: pw.BoxFit.contain),
                      ),
                    if (logo != null && secondaryLogo != null) pw.SizedBox(width: 15),
                    if (secondaryLogo != null)
                      pw.Container(
                        height: 35,
                        child: pw.Image(secondaryLogo, fit: pw.BoxFit.contain),
                      ),
                  ],
                )
              else
                pw.Text(restaurantName, style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              
              if (logo != null || secondaryLogo != null) pw.SizedBox(height: 4),
              if (logo != null || secondaryLogo != null) pw.Text(restaurantName, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
              
              if (address.isNotEmpty) pw.Text(address, style: const pw.TextStyle(fontSize: 9), textAlign: pw.TextAlign.center),
              if (phone.isNotEmpty || email.isNotEmpty) 
                pw.Text('${phone.isNotEmpty ? "Tel: $phone" : ""} ${email.isNotEmpty ? " | $email" : ""}', 
                  style: const pw.TextStyle(fontSize: 8), textAlign: pw.TextAlign.center),
              pw.SizedBox(height: 8),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Order #${order['order_number'] ?? order['id']}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(DateFormat('dd/MM/yyyy HH:mm').format(orderTime)),
                ],
              ),
              if (order['split_info'] != null) ...[
                pw.SizedBox(height: 2),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                  decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('SPLIT BILL', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      pw.Text('Part ${order['split_info']['index']} of ${order['split_info']['total_splits']}', style: pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
              ],
              pw.Divider(thickness: 1),
              pw.SizedBox(height: 5),
              ...items.map((item) {
                final extras = item['extras'] as List? ?? [];
                final variants = item['variants'] as List? ?? [];
                return pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Expanded(
                          child: pw.Text('${item['quantity']}x ${item['name']}', style: const pw.TextStyle(fontSize: 12)),
                        ),
                        pw.Text('$currency${(double.tryParse(item['price']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}'),
                      ],
                    ),
                    ...variants.map((v) => pw.Padding(
                      padding: const pw.EdgeInsets.only(left: 10),
                      child: pw.Text('- ${v['name']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                    )),
                    ...extras.map((e) => pw.Padding(
                      padding: const pw.EdgeInsets.only(left: 10),
                      child: pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text('+ ${e['name']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                          pw.Text('$currency${(double.tryParse(e['price']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                    )),
                    pw.SizedBox(height: 5),
                  ],
                );
              }),
              pw.Divider(thickness: 1),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(order['split_info'] != null ? 'SPLIT TOTAL' : 'TOTAL', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                  pw.Text('$currency${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                    style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              if (order['split_info'] != null) ...[
                pw.SizedBox(height: 2),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Full Bill Total:', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                    pw.Text('$currency${(double.tryParse(order['full_total']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                      style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  ],
                ),
              ],
              pw.SizedBox(height: 15),
              pw.Text('Thank you for your visit!', style: pw.TextStyle(fontStyle: pw.FontStyle.italic)),
              pw.SizedBox(height: 5),
              pw.BarcodeWidget(
                data: (order['order_number'] ?? order['id']).toString(),
                barcode: pw.Barcode.code128(),
                width: 100,
                height: 30,
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  static Future<void> printReceipt({
    required Map<String, dynamic> order,
    required Map<String, dynamic> settings,
  }) async {
    final pdfBytes = await generateReceiptPdf(order: order, settings: settings);
    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdfBytes);
  }

  static Future<Uint8List> generateInvoicePdf({
    required Map<String, dynamic> order,
    required Map<String, dynamic> settings,
  }) async {
    final pdf = pw.Document();
    final items = order['items'] as List? ?? [];
    final tenant = settings['tenant'] ?? {};
    
    final businessName = tenant['business_name'] ?? tenant['name'] ?? 'Zamzam Kitchen';
    final businessAddress = tenant['business_address'] ?? tenant['address'] ?? '';
    final businessPhone = tenant['business_phone'] ?? tenant['phone'] ?? '';
    final businessEmail = tenant['business_email'] ?? tenant['email'] ?? '';
    
    final currency = tenant['currency'] ?? '\$';
    final orderTime = DateTime.tryParse(order['order_time']?.toString() ?? '') ?? DateTime.now();

    final String primaryLogoUrl = ThemeService.resolveImageUrl(tenant['logo_url']);
    final String secondaryLogoUrl = ThemeService.resolveImageUrl(tenant['secondary_logo_url']);

    // Fetch images with manual HTTP request for better reliability
    pw.ImageProvider? primaryLogo;
    pw.ImageProvider? secondaryLogo;
    
    try {
      if (primaryLogoUrl.isNotEmpty) {
        if (_logoCache.containsKey(primaryLogoUrl)) {
          primaryLogo = pw.MemoryImage(_logoCache[primaryLogoUrl]!);
        } else {
          final resp = await http.get(Uri.parse(primaryLogoUrl));
          if (resp.statusCode == 200) {
            _logoCache[primaryLogoUrl] = resp.bodyBytes;
            primaryLogo = pw.MemoryImage(resp.bodyBytes);
          }
        }
      }
      if (secondaryLogoUrl.isNotEmpty) {
        if (_logoCache.containsKey(secondaryLogoUrl)) {
          secondaryLogo = pw.MemoryImage(_logoCache[secondaryLogoUrl]!);
        } else {
          final resp = await http.get(Uri.parse(secondaryLogoUrl));
          if (resp.statusCode == 200) {
            _logoCache[secondaryLogoUrl] = resp.bodyBytes;
            secondaryLogo = pw.MemoryImage(resp.bodyBytes);
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading invoice logos: $e');
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header with Logos and Company Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      if (primaryLogo != null)
                        pw.Container(
                          height: 80,
                          width: 150,
                          alignment: pw.Alignment.centerLeft,
                          child: pw.Image(primaryLogo, fit: pw.BoxFit.contain),
                        )
                      else
                        pw.Text(businessName, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                      
                      pw.SizedBox(height: 12),
                      pw.Text(businessName.toUpperCase(), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      if (businessAddress.isNotEmpty) pw.Padding(
                        padding: const pw.EdgeInsets.only(top: 2),
                        child: pw.Text(businessAddress, style: const pw.TextStyle(fontSize: 9)),
                      ),
                      if (businessPhone.isNotEmpty || businessEmail.isNotEmpty) pw.Padding(
                        padding: const pw.EdgeInsets.only(top: 2),
                        child: pw.Text(
                          '${businessPhone.isNotEmpty ? "Tel: $businessPhone" : ""} ${businessEmail.isNotEmpty ? " | Email: $businessEmail" : ""}',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      if (secondaryLogo != null)
                        pw.Container(
                          height: 40,
                          width: 80,
                          alignment: pw.Alignment.centerRight,
                          child: pw.Image(secondaryLogo, fit: pw.BoxFit.contain),
                        ),
                      pw.SizedBox(height: 12),
                      pw.Text('INVOICE', style: pw.TextStyle(fontSize: 28, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                      pw.SizedBox(height: 8),
                      pw.Text('Order No: ${order['order_number'] ?? order['id']}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.Text('Date: ${DateFormat('dd MMM yyyy HH:mm').format(orderTime)}'),
                      pw.Text('Status: ${(order['status'] ?? 'Completed').toString().toUpperCase()}', style: pw.TextStyle(fontSize: 10, color: PdfColors.green)),
                    ],
                  ),
                ],
              ),
              
              pw.SizedBox(height: 40),
              pw.Divider(thickness: 2, color: PdfColors.blue900),
              pw.SizedBox(height: 20),
              
              // Bill To Section (Simple for now)
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('BILL TO:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                      pw.Text(order['customer_name'] ?? 'Counter Customer', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                      pw.Text('Type: ${order['order_type'] ?? 'Dine-In'}'),
                    ],
                  ),
                ],
              ),
              
              pw.SizedBox(height: 30),
              
              // Items Table
              pw.TableHelper.fromTextArray(
                context: context,
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 10),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.blue900),
                cellStyle: const pw.TextStyle(fontSize: 9),
                rowDecoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey300, width: 0.5))),
                cellAlignment: pw.Alignment.centerLeft,
                columnWidths: {
                  0: const pw.FlexColumnWidth(3),
                  1: const pw.FixedColumnWidth(40),
                  2: const pw.FixedColumnWidth(80),
                  3: const pw.FixedColumnWidth(80),
                },
                headers: ['DESCRIPTION', 'QTY', 'UNIT PRICE', 'SUBTOTAL'],
                data: items.map((item) {
                  final double price = double.tryParse(item['price']?.toString() ?? '0') ?? 0.0;
                  final int qty = int.tryParse(item['quantity']?.toString() ?? '1') ?? 1;
                  return [
                    item['name'],
                    qty.toString(),
                    '$currency${price.toStringAsFixed(2)}',
                    '$currency${(price * qty).toStringAsFixed(2)}',
                  ];
                }).toList(),
              ),
              
              pw.SizedBox(height: 30),
              
              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 200,
                    child: pw.Column(
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Subtotal:'),
                            pw.Text('$currency${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}'),
                          ],
                        ),
                        pw.Divider(color: PdfColors.grey300),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('GRAND TOTAL:', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                            pw.Text('$currency${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                              style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              pw.Spacer(),
              
              // Footer
              pw.Divider(thickness: 1, color: PdfColors.grey300),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Thank you for choosing $businessName!', style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
                  pw.Text('Generated by POS v2.4.0', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500)),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }
}
