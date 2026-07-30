import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const templatePath = path.join(process.cwd(), 'scripts', 'report_template.html');
  const outPath1 = path.join(process.cwd(), 'docs', 'iitg', 'InsightPulse_Project_Report.pdf');
  const outPath2 = path.join(process.cwd(), 'docs', 'iitg', 'DA377_InsightPulse.pdf');
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found at: ${templatePath}`);
    process.exit(1);
  }
  
  console.log('Reading HTML template...');
  const htmlContent = fs.readFileSync(templatePath, 'utf8');
  
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Setting page content...');
  await page.setContent(htmlContent);
  
  console.log('Generating PDF...');
  await page.pdf({
    path: outPath1,
    format: 'A4',
    margin: {
      top: '0mm',
      bottom: '0mm',
      left: '0mm',
      right: '0mm'
    },
    printBackground: true
  });
  
  // Copy to the second path
  fs.copyFileSync(outPath1, outPath2);
  
  await browser.close();
  console.log('PDF generated successfully!');
  console.log(`Saved to: ${outPath1}`);
  console.log(`Saved to: ${outPath2}`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
