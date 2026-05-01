'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function createTextPDF(lines, outputPath) {
  return new Promise((resolve, reject) => {
    // compress: false ensures pdf-parse can read the text streams
    const doc = new PDFDocument({ margin: 50, size: 'A4', compress: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.font('Helvetica').fontSize(11);
    for (const line of lines) {
      if (line === '') { doc.moveDown(0.4); }
      else { doc.text(line, { lineGap: 2 }); }
    }
    doc.end();
    stream.on('finish', () => {
      console.log('Created: ' + path.basename(outputPath) + ' (' + fs.statSync(outputPath).size + ' bytes)');
      resolve();
    });
    stream.on('error', reject);
  });
}

async function main() {

  // ── FILE 1: Sale Deed ──────────────────────────────────
  await createTextPDF([
    'SALE DEED',
    '',
    'This Sale Deed is executed on 15th March 2024 between:',
    'Seller: Ramesh Kumar Sharma S/O Late Mohan Sharma',
    'Purchaser: Arjun Mehta S/O Vijay Mehta',
    '',
    'PROPERTY DESCRIPTION:',
    'Flat No. 504 5th Floor Sunrise Apartments',
    'Whitefield Bengaluru - 560066',
    'Karnataka India',
    '',
    'Built-up Area: 1350 sq.ft.',
    'Year of Construction: 2018',
    'Total Floors: G+14',
    'Construction Quality: Good finish with branded fittings',
    '',
    'FINANCIAL DETAILS:',
    'Sale Consideration: Rs. 1,35,00,000/-',
    'Rupees One Crore Thirty Five Lakhs Only',
    '',
    'PAN of Purchaser: ABCPM1234D',
    'Mobile: 9845012345',
    'Email: arjun.mehta@gmail.com',
    '',
    'Stamp Duty Paid: Rs. 8,10,000/-',
    'Registration Date: 15-03-2024',
    'Sub-Registrar Office: Whitefield Bengaluru',
  ], path.join(__dirname, 'test_sale_deed.pdf'));

  // ── FILE 2: Property Tax Receipt ──────────────────────
  await createTextPDF([
    'PUNE MUNICIPAL CORPORATION',
    'PROPERTY TAX RECEIPT 2023-24',
    '',
    'Property ID: PMC-KTH-2024-00456',
    'Owner Name: Priya Deshmukh',
    'Mobile: 9823456789',
    'PAN: BCDPD5678E',
    '',
    'Property Address:',
    'Plot No. 12 2nd Floor Green Valley Apartments',
    'Kothrud Pune - 411038',
    'Maharashtra',
    '',
    'Property Type: Residential Flat',
    'Built-up Area: 950 sq.ft.',
    'Year of Construction: 2001',
    'Total Floors: G+6',
    '',
    'Declared Value: Rs. 11,50,000/-',
    'Annual Property Tax: Rs. 4,200/-',
    'Payment Status: PAID',
    'Receipt No: PMC/2024/KTH/00456',
    'Date: 10-04-2024',
  ], path.join(__dirname, 'test_property_tax.pdf'));

  // ── FILE 3: Encumbrance Certificate ───────────────────
  await createTextPDF([
    'ENCUMBRANCE CERTIFICATE',
    'Sub-Registrar Office Gachibowli Hyderabad',
    '',
    'EC No: EC/GCB/2024/1234',
    'Period: 01-01-2014 to 01-01-2024',
    '',
    'Property Details:',
    'Survey No: 45/2 Gachibowli Village',
    'Gachibowli Hyderabad - 500032',
    'Telangana',
    '',
    'Owner: Kavitha Reddy',
    'Email: kavitha.reddy@techcorp.com',
    'Phone: 9700123456',
    'PAN: EFGKR7890H',
    '',
    'Property Type: Residential Apartment',
    'Built-up Area: 1650 sq.ft.',
    'Floor: 7th Floor',
    'Total Floors: G+18',
    'Year of Construction: 2022',
    '',
    'Market Value: Rs. 1,40,00,000/-',
    'Encumbrances: NIL',
    'Purpose: Loan Against Property LAP',
  ], path.join(__dirname, 'test_encumbrance_cert.pdf'));

  // ── FILE 4: Commercial Property ───────────────────────
  await createTextPDF([
    'AGREEMENT TO SALE',
    '',
    'This agreement is made between:',
    'Seller: Suresh Agarwal',
    'Purchaser: Rajiv Nair S/O Krishna Nair',
    '',
    'COMMERCIAL PROPERTY DETAILS:',
    'Shop No. 12 Ground Floor Metro Mall',
    'Indiranagar Bengaluru - 560038',
    'Karnataka',
    '',
    'Carpet Area: 850 sq.ft.',
    'Year of Construction: 2015',
    'Total Floors: G+5',
    'Construction: Premium finish imported marble flooring',
    '',
    'Sale Price: Rs. 95,00,000/-',
    'Rupees Ninety Five Lakhs Only',
    '',
    'PAN: CDERS9012F',
    'Contact: 9920123456',
    'Email: rajiv.nair@business.com',
    '',
    'Purpose: Loan Against Property',
    'Pincode: 560038',
  ], path.join(__dirname, 'test_commercial_property.pdf'));

  // ── FILE 5: Land / Plot ───────────────────────────────
  await createTextPDF([
    'PATTA / LAND RECORD',
    'Revenue Department Jaipur',
    '',
    'Survey No: 234/B',
    'Khasra No: 456',
    '',
    'Owner: Mohan Lal Sharma',
    'Mobile: 9414012345',
    'PAN: FGHML4567I',
    '',
    'Land Details:',
    'Plot No. 45 Sector 7',
    'Malviya Nagar Jaipur - 302017',
    'Rajasthan',
    '',
    'Land Type: Residential Plot',
    'Plot Area: 2400 sq.ft.',
    'Land Use: Vacant Land',
    '',
    'Circle Rate: Rs. 4,200 per sq.ft.',
    'Declared Value: Rs. 1,00,80,000/-',
    '',
    'Purpose: Mortgage',
    'Date of Record: 20-02-2024',
  ], path.join(__dirname, 'test_land_plot.pdf'));

  console.log('\nAll 5 test PDFs ready in: ' + __dirname);
}

main().catch(console.error);
