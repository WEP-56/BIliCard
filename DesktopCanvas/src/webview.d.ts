// Add support for the electron webview tag
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string;
      preload?: string;
      partition?: string;
      allowpopups?: boolean;
      webpreferences?: string;
      useragent?: string;
    }, HTMLElement>;
  }
}

export {};

declare global {
  interface Window {
    electron_preload_live: string;
    ipcRenderer: {
      on(channel: string, func: (...args: any[]) => void): void;
      off(channel: string, func: (...args: any[]) => void): void;
      send(channel: string, ...args: any[]): void;
      invoke(channel: string, ...args: any[]): Promise<any>;
    };
  }
}
