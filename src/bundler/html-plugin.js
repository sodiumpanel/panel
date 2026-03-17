import { readFile } from 'fs/promises';

export default function htmlPlugin(options = {}) {
  const {
    template = 'src/index.html',
    filename = 'index.html',
    vendorScript = null
  } = options;

  return {
    name: 'html-plugin',
    async generateBundle(outputOptions, bundle) {
      try {
        const htmlContent = await readFile(template, 'utf8');
        
        const jsFiles = Object.keys(bundle).filter(file => file.endsWith('.js'));
        const cssFiles = Object.keys(bundle).filter(file => file.endsWith('.css'));
        
        let processedHtml = htmlContent;
        
        if (cssFiles.length > 0) {
          processedHtml = processedHtml.replace(
            '</head>',
            `  <link rel="stylesheet" href="/${cssFiles[0]}">\n</head>`
          );
        }
        
        const scripts = [];
        if (vendorScript) {
          scripts.push(`<script src="${vendorScript}"></script>`);
        }
        if (jsFiles.length > 0) {
          scripts.push(`<script src="/${jsFiles[0]}"></script>`);
        }
        
        if (scripts.length > 0) {
          processedHtml = processedHtml.replace(
            '</body>',
            `  ${scripts.join('\n  ')}\n</body>`
          );
        }
        
        this.emitFile({
          type: 'asset',
          fileName: filename,
          source: processedHtml.replaceAll("\n", "")
        });
      } catch (error) {
        this.error(`Failed to process HTML template: ${error.message}`);
      }
    }
  };
}
