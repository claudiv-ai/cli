/**
 * Vite dev server for hosting generated code
 */

import { createServer, type ViteDevServer } from 'vite';
import { existsSync } from 'fs';
import { logger } from './utils/logger.js';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

export class DevServer {
  private server: ViteDevServer | null = null;
  private port = 30004;
  private outputFile: string = 'app.html'; // Default, can be configured

  /**
   * Set the output file to serve (e.g., 'test.html', 'myapp.html')
   */
  setOutputFile(filename: string): void {
    this.outputFile = filename;
  }

  async start(): Promise<void> {
    try {
      // Create Vite server
      this.server = await createServer({
        root: process.cwd(),
        server: {
          port: this.port,
          strictPort: false, // Auto-increment if port is busy
          open: false, // Don't auto-open on start (we'll open after first generation)
        },
        plugins: [
          {
            name: 'spec-code-server',
            configureServer: (server: ViteDevServer) => {
              const self = this;
              server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
            // Serve generated code at its specific path
            const requestPath = req.url?.split('?')[0]; // Remove query params
            if (requestPath === '/' || requestPath === '/index.html' || requestPath === `/${self.outputFile}`) {
              if (existsSync(self.outputFile)) {
                // Read and serve the file directly
                const { readFile } = await import('fs/promises');
                const content = await readFile(self.outputFile, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(content);
                return;
              } else {
                // Serve a placeholder if output file doesn't exist yet
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Waiting for generated code</title>
  <meta http-equiv="refresh" content="2">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .message {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 1rem auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="message">
    <div class="spinner"></div>
    <h2>Waiting for code generation...</h2>
    <p>Add a <code>gen</code> attribute to elements in your .cdml file to trigger generation.</p>
  </div>
</body>
</html>
                `);
                return;
              }
            }
            next();
          });
            },
          },
        ],
      });

      await this.server.listen();

      const info = this.server.config.logger.info;
      this.port = this.server.config.server.port || this.port;

      logger.success(`🌐 Dev server running at http://localhost:${this.port}`);
      logger.info('💡 Browser will auto-reload when code is regenerated');
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to start dev server: ${err.message}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      logger.info('Dev server stopped');
    }
  }

  getPort(): number {
    return this.port;
  }

  /**
   * Open the browser to the specific file
   */
  async openInBrowser(filename: string): Promise<void> {
    const url = `http://localhost:${this.port}/${filename}`;
    try {
      // Use platform-specific command to open browser
      const { spawn } = await import('child_process');
      const command = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';

      spawn(command, [url], { detached: true, stdio: 'ignore' }).unref();
      logger.info(`Opened ${filename} in browser`);
    } catch (error) {
      // If command fails, just log the URL
      logger.info(`View at: ${url}`);
    }
  }
}
