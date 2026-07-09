/// <reference types="vite/client" />

// CSS modules with ?inline
declare module '*.css?inline' {
  const content: string;
  export default content;
}
