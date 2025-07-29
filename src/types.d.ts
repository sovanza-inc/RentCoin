/// <reference types="react" />

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface Window {
    ethereum?: {
        isMetaMask?: boolean;
        request: (...args: any[]) => Promise<any>;
        on: (event: string, callback: (...args: any[]) => void) => void;
        removeListener: (event: string, callback: (...args: any[]) => void) => void;
        providers?: any[];
        selectedAddress?: string;
        networkVersion?: string;
        chainId?: string;
        isConnected?: () => boolean;
        enable: () => Promise<string[]>;
    };
}

export {};
