import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
// @ts-expect-error
import { cwd } from 'node:process';
// @ts-expect-error
import process from 'node:process';
// @ts-expect-error
import fs from 'node:fs';
// @ts-expect-error
import path from 'node:path';

const currentDirectory: string = cwd();
// Get the directory where this script is located - assume it's in the same folder as .impl/
const scriptDirectory: string = path.resolve(path.dirname(process.argv[1]), '..');

const args = process.argv.slice(2);
const port: number = parseInt(args[0], 10) || 3000;
const staticPath: string = args[1] || currentDirectory;
const spaMode: boolean = args[2] === 'true';

// Function to generate HTML directory listing
function generateDirectoryListing(dirPath: string, files: string[], currentPath: string = ''): string {
  const title = `Directory listing for ${currentPath || 'root'}`;
  
  // Generate breadcrumb navigation
  const breadcrumb = generateBreadcrumb(currentPath);
  
  // Add parent directory entry if we're not at root
  let parentEntry = '';
  if (currentPath) {
    // Calculate parent path more carefully to handle special characters like @
    const pathParts = currentPath.split('/').filter(Boolean);
    const parentParts = pathParts.slice(0, -1);
    const parentUrl = parentParts.length === 0 ? '/' : `/${parentParts.join('/')}/`;
    
    parentEntry = `
      <tr>
        <td>
          <a href="${parentUrl}" class="directory">
            📁 ..
          </a>
        </td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }
  
  const fileList = files
    .filter(file => !file.startsWith('.')) // Hide hidden files
    .map(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const isDirectory = stats.isDirectory();
      const size = isDirectory ? '-' : formatFileSize(stats.size);
      const modified = stats.mtime.toLocaleDateString();
      
      return `
        <tr>
          <td>
            <a href="${path.join('/', currentPath, file)}${isDirectory ? '/' : ''}" class="${isDirectory ? 'directory' : 'file'}">
              ${isDirectory ? '📁' : '📄'} ${file}${isDirectory ? '/' : ''}
            </a>
          </td>
          <td>${size}</td>
          <td>${modified}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="stylesheet" href="/__server_assets__/common.css">
      <link rel="stylesheet" href="/__server_assets__/directory-listing.css">
    </head>
    <body>
      <div class="bg-animation">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
      <div class="container">
        <h1>${title}</h1>
        ${breadcrumb}
        <div class="path-info">
          📍 Serving: ${dirPath}
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Modified</th>
            </tr>
          </thead>
          <tbody>
            ${parentEntry}${fileList}
          </tbody>
        </table>
      </div>
      <script src="/__server_assets__/common.js"></script>
      <script src="/__server_assets__/directory-listing.js"></script>
    </body>
    </html>
  `;
}

// Generate breadcrumb navigation
function generateBreadcrumb(currentPath: string): string {
  if (!currentPath) return '';
  
  const parts = currentPath.split('/').filter(Boolean);
  let breadcrumbHtml = '<div class="breadcrumb">';
  breadcrumbHtml += '<a href="/">🏠 root</a>';
  
  let currentUrl = '';
  for (const part of parts) {
    currentUrl += '/' + part;
    breadcrumbHtml += '<span class="separator">/</span>';
    breadcrumbHtml += `<a href="${currentUrl}/">${part}</a>`;
  }
  
  breadcrumbHtml += '</div>';
  return breadcrumbHtml;
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to get content type based on file extension
function getContentType(ext: string): string {
  const contentTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

const app = new Hono();

// Serve server assets (CSS, JS for directory listing)
app.get('/__server_assets__/*', (c) => {
  const url = new URL(c.req.url, 'http://localhost');
  const assetPath = url.pathname.replace('/__server_assets__/', '');
  const fullPath = path.join(scriptDirectory, '.impl', assetPath);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const contentType = assetPath.endsWith('.css') ? 'text/css' : 
                       assetPath.endsWith('.js') ? 'application/javascript' : 'text/plain';
    
    return c.text(content, 200, {
      'Content-Type': contentType
    });
  } catch (error) {
    return c.text('Asset not found', 404);
  }
});

// Directory listing handler for any directory (using a different approach)
app.use('*', async (c, next) => {
  const requestPath = c.req.path;
  
  // Only handle requests that end with '/' and aren't server assets
  if (!requestPath.endsWith('/') || requestPath.startsWith('/__server_assets__')) {
    await next();
    return;
  }
  
  const cleanPath = requestPath.replace(/\/$/, ''); // Remove trailing slash
  const fullDirPath = path.join(staticPath, cleanPath);
  const indexPath = path.join(fullDirPath, 'index.html');
  
  // If index.html exists, serve it
  if (fs.existsSync(indexPath)) {
    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return c.html(content);
    } catch (error) {
      // Fall through to directory listing
    }
  }
  
  // Generate directory listing
  try {
    if (!fs.existsSync(fullDirPath) || !fs.statSync(fullDirPath).isDirectory()) {
      await next(); // Let it fall through to static files or 404
      return;
    }
    
    const files = fs.readdirSync(fullDirPath);
    const directoryListing = generateDirectoryListing(fullDirPath, files, cleanPath);
    return c.html(directoryListing);
  } catch (error) {
    await next();
  }
});

// Root directory handler (same logic but for root specifically)
app.get('/', (c) => {
  const indexPath = path.join(staticPath, 'index.html');
  
  // If index.html exists, serve it
  if (fs.existsSync(indexPath)) {
    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return c.html(content);
    } catch (error) {
      // Fall through to directory listing
    }
  }
  
  // Generate directory listing
  try {
    const files = fs.readdirSync(staticPath);
    const directoryListing = generateDirectoryListing(staticPath, files, '');
    return c.html(directoryListing);
  } catch (error) {
    return c.text('Error reading directory', 500);
  }
});

// Serve static files
app.use('*', serveStatic({
  root: staticPath, 
  getContent: async (path, c) => {
    try {
      // Check if file is binary based on extension
      const ext = path.toLowerCase().split('.').pop() || '';
      const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg', 'pdf', 'zip', 'mp4', 'mp3', 'wav', 'avi', 'mov', 'woff', 'woff2', 'ttf', 'eot'];
      
      if (binaryExtensions.includes(ext)) {
        // Read as binary for images and other binary files
        const buffer = fs.readFileSync(path);
        return new Response(buffer, {
          headers: {
            'Content-Type': getContentType(ext)
          }
        });
      } else {
        // Read as text for text files
        return fs.readFileSync(path, "utf-8");
      }
    } catch (error) {
      // File not found, let it fall through to 404 handler
      return null;
    }
  }
}));

// Final catch-all for directories without trailing slash
app.use('*', async (c, next) => {
  const requestPath = c.req.path;
  const fullDirPath = path.join(staticPath, requestPath);
  
  // Check if this is a directory without trailing slash
  try {
    if (fs.existsSync(fullDirPath) && fs.statSync(fullDirPath).isDirectory() && !requestPath.endsWith('/')) {
      return c.redirect(requestPath + '/');
    }
  } catch (error) {
    // Continue to 404
  }
  
  // Continue to next middleware (404 handler)
  await next();
});

// 404 handler - serve the 404.html page or index.html for SPA mode
app.notFound((c) => {
  // In SPA mode, serve index.html for any route that doesn't match a static file
  if (spaMode) {
    try {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        return c.html(indexContent);
      }
    } catch (error) {
      // Fall through to regular 404 handling
    }
  }
  
  try {
    // Try to find 404.html in the same directory as this script or in the static path
    let html404Path = path.join(scriptDirectory, '.impl', '404.html');
    if (!fs.existsSync(html404Path)) {
      html404Path = path.join(staticPath, '404.html');
    }
    
    const html404Content = fs.readFileSync(html404Path, 'utf-8');
    return c.html(html404Content, 404);
  } catch (error) {
    // Fallback if 404.html is not found
    return c.text('404 - Page Not Found', 404);
  }
});

console.log(`📡 Serving static files from: ${staticPath}`);
console.log(`🌐 Server is running... http://localhost:${port}/`);
if (spaMode) {
  console.log(`🔄 SPA mode enabled - serving index.html for all routes`);
}

serve({
  fetch: app.fetch,
  port,
})
