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
