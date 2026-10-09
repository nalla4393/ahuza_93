import { jsPDF } from 'jspdf';
import { Order } from '../types';

export function generateInvoicePdf(order: Order): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(24, 24, 27); // #18181B deep charcoal
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AHUZA', margin, 13);

  // Slogan
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(214, 199, 178); // warm beige #D6C7B2
  doc.text('Where Fashion Meets Passion', margin, 19);

  // Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(244, 244, 245);
  doc.text(`Invoice No: INV-${order.orderNumber}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(
    `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`,
    pageWidth - margin,
    24,
    { align: 'right' }
  );

  let cursorY = 36;

  // Seller & Buyer 2-Column Info Cards
  const colWidth = (pageWidth - margin * 2 - 8) / 2;

  // Card 1: Sold By (AHUZA)
  doc.setFillColor(249, 248, 246);
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(margin, cursorY, colWidth, 42, 2, 2, 'FD');

  doc.setTextColor(154, 52, 18); // #9A3412 terracotta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SOLD BY / STORE INFORMATION', margin + 4, cursorY + 6);

  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AHUZA Apparel Pvt. Ltd.', margin + 4, cursorY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  doc.text('Plot 42, Textile Artisan Park, Lower Parel', margin + 4, cursorY + 17);
  doc.text('Mumbai, Maharashtra 400013, India', margin + 4, cursorY + 22);
  doc.text('GSTIN: 27AAACA1234B1Z5 · PAN: AAACA1234B', margin + 4, cursorY + 27);
  doc.text('Email: info@ahuzawear.com · Tel: 9550582277', margin + 4, cursorY + 32);
  doc.text('Support Hours: 10:00 AM – 9:00 PM IST Daily', margin + 4, cursorY + 37);

  // Card 2: Billed & Shipped To (Customer)
  const col2X = margin + colWidth + 8;
  doc.roundedRect(col2X, cursorY, colWidth, 42, 2, 2, 'FD');

  doc.setTextColor(154, 52, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BILLED & SHIPPED TO', col2X + 4, cursorY + 6);

  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(order.shippingAddress?.fullName || order.customerName || 'Customer', col2X + 4, cursorY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  const addr = order.shippingAddress;
  if (addr) {
    doc.text(`${addr.line1}`, col2X + 4, cursorY + 17);
    doc.text(`${addr.city}, ${addr.state} — ${addr.postalCode}`, col2X + 4, cursorY + 22);
    doc.text(`Phone: ${addr.phone || order.customerPhone || 'N/A'}`, col2X + 4, cursorY + 27);
  } else {
    doc.text(`Phone: ${order.customerPhone || 'N/A'}`, col2X + 4, cursorY + 17);
  }
  doc.text(`Order Status: ${order.status}`, col2X + 4, cursorY + 32);
  doc.text(
    `Courier / AWB: ${order.shipment?.courierName || 'BlueDart'} (${order.shipment?.trackingNumber || 'BD-AHZ-001'})`,
    col2X + 4,
    cursorY + 37
  );

  cursorY += 48;

  // Order & Payment Summary Bar
  doc.setFillColor(242, 239, 233); // #F2EFE9
  doc.rect(margin, cursorY, pageWidth - margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text(`Order ID: ${order.orderNumber}`, margin + 4, cursorY + 6);
  const payLabel = order.payment?.provider === 'UPI_DIRECT' ? 'Direct UPI' : (order.payment?.method || 'UPI');
  doc.text(`Payment: ${payLabel} (${order.payment?.status || 'Paid'})`, margin + 65, cursorY + 6);
  const txnId = order.payment?.utrNumber
    ? `Bank UTR: ${order.payment.utrNumber}`
    : (order.payment?.upiRecord?.transactionRef || order.payment?.razorpayPaymentId || order.payment?.id || 'TXN_' + order.orderNumber);
  doc.text(
    txnId,
    pageWidth - margin - 4,
    cursorY + 6,
    { align: 'right' }
  );

  cursorY += 14;

  // Items Table Header
  const tableY = cursorY;
  doc.setFillColor(24, 24, 27);
  doc.rect(margin, tableY, pageWidth - margin * 2, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('S.NO', margin + 3, tableY + 5.5);
  doc.text('ITEM DESCRIPTION', margin + 18, tableY + 5.5);
  doc.text('SIZE', margin + 105, tableY + 5.5, { align: 'center' });
  doc.text('QTY', margin + 125, tableY + 5.5, { align: 'center' });
  doc.text('UNIT PRICE (₹)', margin + 150, tableY + 5.5, { align: 'right' });
  doc.text('TOTAL (₹)', pageWidth - margin - 4, tableY + 5.5, { align: 'right' });

  cursorY = tableY + 8;

  // Items Table Rows
  order.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowHeight = 12;

    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(249, 248, 246);
    }
    doc.rect(margin, cursorY, pageWidth - margin * 2, rowHeight, 'F');
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, cursorY + rowHeight, pageWidth - margin, cursorY + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(82, 82, 91);
    doc.text(String(index + 1), margin + 3, cursorY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    const prodName = item.productName.length > 45 ? item.productName.slice(0, 42) + '...' : item.productName;
    doc.text(prodName, margin + 18, cursorY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`Color: ${item.color || 'Standard'} · SKU: ${item.sku || 'AHZ-SKU'}`, margin + 18, cursorY + 9.5);

    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(item.size || 'M', margin + 105, cursorY + 7, { align: 'center' });
    doc.text(String(item.quantity), margin + 125, cursorY + 7, { align: 'center' });
    doc.text(item.unitPrice.toLocaleString('en-IN'), margin + 150, cursorY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text((item.unitPrice * item.quantity).toLocaleString('en-IN'), pageWidth - margin - 4, cursorY + 7, {
      align: 'right',
    });

    cursorY += rowHeight;
  });

  cursorY += 6;

  // Calculation & Totals Box
  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  const subtotal = order.subtotal || order.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discount = order.discount || 0;
  const shipping = order.shipping || 0;
  const grandTotal = order.totalAmount;

  // Left Note Box: GST & Policy Notice
  doc.setFillColor(249, 248, 246);
  doc.setDrawColor(228, 228, 231);
  const noteBoxWidth = pageWidth - margin * 2 - totalsBoxWidth - 8;
  doc.roundedRect(margin, cursorY, noteBoxWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(154, 52, 18);
  doc.text('TERMS & TAXATION NOTES', margin + 4, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text('• All prices in INR and strictly under ₹2,000 maximum ceiling.', margin + 4, cursorY + 10);
  doc.text('• GST (5% / 12% apparel) is inclusive in all displayed selling prices.', margin + 4, cursorY + 15);
  doc.text('• 14-day easy return/exchange policy applies from delivery date.', margin + 4, cursorY + 20);
  doc.text('• Unworn garments with original tags intact qualify for full refund.', margin + 4, cursorY + 25);
  doc.text('• Computer-generated electronic invoice. No physical signature needed.', margin + 4, cursorY + 30);

  // Right Totals Box
  doc.roundedRect(totalsBoxX, cursorY, totalsBoxWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  doc.text('Items Subtotal:', totalsBoxX + 4, cursorY + 6);
  doc.text(`₹${subtotal.toLocaleString('en-IN')}`, pageWidth - margin - 4, cursorY + 6, { align: 'right' });

  doc.text('Delivery & Shipping:', totalsBoxX + 4, cursorY + 12);
  doc.text(shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`, pageWidth - margin - 4, cursorY + 12, {
    align: 'right',
  });

  if (discount > 0) {
    doc.setTextColor(154, 52, 18);
    doc.text('Discounts / Coupon:', totalsBoxX + 4, cursorY + 18);
    doc.text(`- ₹${discount.toLocaleString('en-IN')}`, pageWidth - margin - 4, cursorY + 18, { align: 'right' });
  } else {
    doc.text('Taxes (GST Included):', totalsBoxX + 4, cursorY + 18);
    doc.text('Inclusive', pageWidth - margin - 4, cursorY + 18, { align: 'right' });
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsBoxX + 4, cursorY + 21, pageWidth - margin - 4, cursorY + 21);

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text('Grand Total:', totalsBoxX + 4, cursorY + 28);
  doc.setTextColor(154, 52, 18);
  doc.text(`₹${grandTotal.toLocaleString('en-IN')}`, pageWidth - margin - 4, cursorY + 28, { align: 'right' });

  // Page Footer
  const footerY = pageHeight - 16;
  doc.setDrawColor(228, 228, 231);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(
    'AHUZA Customer Care: info@ahuzawear.com | Phone: 9550582277 | Desk Hours: 10:00 AM – 9:00 PM IST Daily',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    'Issues beyond self-service website tools are attended by our customer support team within 24 hours of reporting.',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  // Trigger browser PDF download
  doc.save(`Invoice-${order.orderNumber}.pdf`);
}
