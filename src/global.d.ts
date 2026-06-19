import * as React from 'react';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'w3m-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'w3m-network-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'w3m-connect-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'w3m-account-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'appkit-network-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}
