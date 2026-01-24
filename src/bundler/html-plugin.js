import { readFile } from 'fs/promises';

export default function htmlPlugin(options = {}) {
  const {
    template = 'src/templates/index.html',
    filename = 'index.html'
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
            '<!-- CSS_INJECT -->',
            `<link rel="stylesheet" href="/${cssFiles[0]}">`
          );
          processedHtml = processedHtml.replace(
            '</head>',
            `  <link rel="stylesheet" href="/${cssFiles[0]}">\n</head>`
          );
        }
        
        if (jsFiles.length > 0) {
          processedHtml = processedHtml.replace(
            '<!-- JS_INJECT -->',
            `<script src="/${jsFiles[0]}"></script>`
          );
          processedHtml = processedHtml.replace(
            '</body>',
            `  <script src="/${jsFiles[0]}"></script>\n</body>`
          );
        }
        
        this.emitFile({
          type: 'asset',
          fileName: filename,
          source: processedHtml
        });
      } catch (error) {
        this.error(`Failed to process HTML template: ${error.message}`);
      }
    }
  };
}
