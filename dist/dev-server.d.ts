/**
 * Vite dev server for hosting generated code
 */
export declare class DevServer {
    private server;
    private port;
    private outputFile;
    /**
     * Set the output file to serve (e.g., 'test.html', 'myapp.html')
     */
    setOutputFile(filename: string): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    getPort(): number;
    /**
     * Open the browser to the specific file
     */
    openInBrowser(filename: string): Promise<void>;
}
