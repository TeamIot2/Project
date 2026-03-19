import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
        Record<string, string | number | boolean | undefined>;
    }
  }
}

export {};
