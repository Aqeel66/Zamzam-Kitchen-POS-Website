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
        margin: const pw.EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        build: (pw.Context context) {
          final isReservation = order['type'] == 'reservation';
          
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              // Header
              if (logo != null || secondaryLogo != null)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.center,
                  children: [
                    if (logo != null)
                      pw.Container(
                        height: 40,
                        child: pw.Image(logo, fit: pw.BoxFit.contain),
                      ),
                    if (logo != null && secondaryLogo != null) pw.SizedBox(width: 10),
                    if (secondaryLogo != null)
                      pw.Container(
                        height: 35,
                        child: pw.Image(secondaryLogo, fit: pw.BoxFit.contain),
                      ),
                  ],
                ),
              
              pw.SizedBox(height: 6),
              pw.Text(restaurantName.toUpperCase(), style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
              if (address.isNotEmpty) pw.Text(address, style: const pw.TextStyle(fontSize: 8), textAlign: pw.TextAlign.center),
              if (phone.isNotEmpty || email.isNotEmpty) 
                pw.Text('${phone.isNotEmpty ? "Tel: $phone" : ""} ${email.isNotEmpty ? " | $email" : ""}', 
                  style: const pw.TextStyle(fontSize: 8), textAlign: pw.TextAlign.center),
              
              pw.SizedBox(height: 10),
              pw.Text(isReservation ? 'BOOKING RECEIPT' : 'ORDER RECEIPT', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 4),
              
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Order: #${order['order_number'] ?? order['id']}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  pw.Text(DateFormat('dd/MM/yy HH:mm').format(orderTime), style: const pw.TextStyle(fontSize: 9)),
                ],
              ),
              pw.Align(
                alignment: pw.Alignment.centerLeft,
                child: pw.Text('Cust: ${order['customer_name'] ?? 'Counter'}', style: const pw.TextStyle(fontSize: 9)),
              ),
              
              pw.Divider(thickness: 0.5, color: PdfColors.grey),
              pw.SizedBox(height: 4),
              
              // Items
              ...items.map((item) {
                final extras = item['extras'] as List? ?? [];
                final variants = item['variants'] as List? ?? [];
                final double price = double.tryParse(item['price']?.toString() ?? '0') ?? 0.0;
                final int qty = int.tryParse(item['quantity']?.toString() ?? '1') ?? 1;

                return pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Expanded(
                          child: pw.Text('$qty x ${item['name']}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                        ),
                        pw.Text('$currency${(price * qty).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                    ...variants.map((v) => pw.Padding(
                      padding: const pw.EdgeInsets.only(left: 8),
                      child: pw.Text('- ${v['name']}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                    )),
                    ...extras.map((e) => pw.Padding(
                      padding: const pw.EdgeInsets.only(left: 8),
                      child: pw.Text('+ ${e['name']}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                    )),
                    pw.SizedBox(height: 3),
                  ],
                );
              }),
              
              pw.Divider(thickness: 0.5, color: PdfColors.grey),
              
              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTAL', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                  pw.Text('$currency${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                    style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              
              if ((double.tryParse(order['discount_amount']?.toString() ?? '0') ?? 0) > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Discount:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('-$currency${(double.tryParse(order['discount_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),

              pw.SizedBox(height: 12),
              pw.Text('Thank you for your visit!', style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic)),
              pw.SizedBox(height: 6),
              
              pw.BarcodeWidget(
                data: (order['order_number'] ?? order['id']).toString(),
                barcode: pw.Barcode.code128(),
                width: 120,
                height: 30,
              ),
              
              pw.SizedBox(height: 8),
              pw.Text('Zamzam Kitchen Unified System v2.5.0', style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey700)),
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
    final branch = settings['branch'] ?? {};
    
    final businessName = (tenant['business_name'] ?? tenant['name'] ?? 'Zamzam Kitchen').toString().toUpperCase();
    final businessAddress = tenant['business_address'] ?? tenant['address'] ?? '';
    final businessPhone = tenant['business_phone'] ?? tenant['phone'] ?? '';
    final businessEmail = tenant['business_email'] ?? tenant['email'] ?? '';
    
    final currency = tenant['currency'] ?? '\$';
    final currencyDisplay = currency == '\$' ? 'AUD' : currency;
    final orderTime = DateTime.tryParse(order['order_time']?.toString() ?? '') ?? DateTime.now();

    final String primaryLogoUrl = ThemeService.resolveImageUrl(tenant['logo_url'] ?? '');
    final String secondaryLogoUrl = ThemeService.resolveImageUrl(tenant['secondary_logo_url'] ?? branch['secondary_logo_url'] ?? '');

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
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          final isReservation = order['type'] == 'reservation';
          final status = (order['status'] ?? 'PAID').toString().toUpperCase();
          final accentColor = PdfColor.fromInt(0xFF1A237E); // Deep Blue

          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header section
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left: Brand
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      if (primaryLogo != null)
                        pw.Container(
                          height: 70,
                          alignment: pw.Alignment.centerLeft,
                          child: pw.Image(primaryLogo, fit: pw.BoxFit.contain),
                        )
                      else
                        pw.Text(businessName, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: accentColor)),
                      
                      pw.SizedBox(height: 12),
                      pw.Text(businessName, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      if (businessAddress.isNotEmpty) pw.Padding(
                        padding: const pw.EdgeInsets.only(top: 2),
                        child: pw.Container(
                          width: 200,
                          child: pw.Text(businessAddress, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        '${businessPhone.isNotEmpty ? "Tel: $businessPhone" : ""} ${businessEmail.isNotEmpty ? " | Email: $businessEmail" : ""}',
                        style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                  // Right: Invoice Meta
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      if (secondaryLogo != null)
                        pw.Container(
                          height: 50,
                          child: pw.Image(secondaryLogo, fit: pw.BoxFit.contain),
                        ),
                      pw.SizedBox(height: 10),
                      pw.Text(isReservation ? 'BOOKING RECEIPT' : 'INVOICE', 
                        style: pw.TextStyle(fontSize: 28, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                      pw.SizedBox(height: 6),
                      pw.Row(
                        mainAxisSize: pw.MainAxisSize.min,
                        children: [
                          pw.Container(
                            padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                            child: pw.Text('POS TERMINAL', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                          ),
                          pw.SizedBox(width: 4),
                          pw.Container(
                            padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: pw.BoxDecoration(color: status == 'PAID' ? PdfColors.green100 : PdfColors.orange100),
                            child: pw.Text(status, style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold, color: status == 'PAID' ? PdfColors.green900 : PdfColors.orange900)),
                          ),
                        ],
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text('Order No: ${order['order_number'] ?? order['id']}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      pw.Text('Date: ${DateFormat('dd MMM yyyy HH:mm').format(orderTime)}', style: const pw.TextStyle(fontSize: 9)),
                    ],
                  ),
                ],
              ),
              
              pw.SizedBox(height: 35),
              pw.Divider(thickness: 1.5, color: accentColor),
              pw.SizedBox(height: 20),
              
              // Bill To section
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('BILL TO:', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                      pw.SizedBox(height: 4),
                      pw.Text(order['customer_name'] ?? 'Counter', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                      pw.Text('Order Type: ${order['order_type'] ?? 'Dine-In'}', style: const pw.TextStyle(fontSize: 9)),
                      if (order['table_number'] != null) pw.Text('Table: ${order['table_number']}', style: const pw.TextStyle(fontSize: 9)),
                    ],
                  ),
                ],
              ),
              
              pw.SizedBox(height: 25),
              
              // Items Table
              pw.TableHelper.fromTextArray(
                context: context,
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
                headerDecoration: pw.BoxDecoration(color: accentColor),
                cellStyle: const pw.TextStyle(fontSize: 9),
                rowDecoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey200, width: 0.5))),
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
                  final extras = item['extras'] as List? ?? [];
                  final variants = item['variants'] as List? ?? [];
                  
                  String description = item['name'] ?? 'Item';
                  if (variants.isNotEmpty) {
                    description += '\n- ' + variants.map((v) => v['name']).join(', ');
                  }
                  if (extras.isNotEmpty) {
                    description += '\n+ ' + extras.map((e) => e['name']).join(', ');
                  }

                  return [
                    description,
                    qty.toString(),
                    '$currencyDisplay${price.toStringAsFixed(2)}',
                    '$currencyDisplay${(price * qty).toStringAsFixed(2)}',
                  ];
                }).toList(),
              ),
              
              pw.SizedBox(height: 25),
              
              // Totals section
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 200,
                    child: pw.Column(
                      children: [
                        _buildTotalRow('Subtotal:', '$currencyDisplay${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', fontSize: 10),
                        if ((double.tryParse(order['discount_amount']?.toString() ?? '0') ?? 0) > 0)
                          _buildTotalRow('Discount:', '-$currencyDisplay${(double.tryParse(order['discount_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', fontSize: 10, isDiscount: true),
                        if ((double.tryParse(order['tip_amount']?.toString() ?? '0') ?? 0) > 0)
                          _buildTotalRow('Tip:', '$currencyDisplay${(double.tryParse(order['tip_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', fontSize: 10),
                        
                        pw.Padding(
                          padding: const pw.EdgeInsets.symmetric(vertical: 8),
                          child: pw.Divider(color: PdfColors.grey400, thickness: 1),
                        ),
                        
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('GRAND TOTAL:', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: accentColor)),
                            pw.Text('$currencyDisplay${(double.tryParse(order['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                              style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: accentColor)),
                          ],
                        ),
                        if (order['payment_method'] != null) ...[
                          pw.SizedBox(height: 4),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Paid via:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                              pw.Text('${order['payment_method']}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              
              pw.Spacer(),
              
              // Footer
              pw.Divider(thickness: 1, color: PdfColors.grey200),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Thank you for choosing $businessName!', style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
                      pw.SizedBox(height: 2),
                      pw.Text('Please retain this invoice for your records.', style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey500)),
                    ],
                  ),
                  pw.Text('Generated by Zamzam Kitchen Unified System v2.5.0', style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey500)),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _buildTotalRow(String label, String value, {double fontSize = 9, bool isDiscount = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontSize: fontSize, color: isDiscount ? PdfColors.red900 : PdfColors.black)),
          pw.Text(value, style: pw.TextStyle(fontSize: fontSize, fontWeight: pw.FontWeight.bold, color: isDiscount ? PdfColors.red900 : PdfColors.black)),
        ],
      ),
    );
  }
}
