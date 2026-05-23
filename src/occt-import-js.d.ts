declare module "occt-import-js" {
  const init: (options?: {
    locateFile?: (path: string, prefix: string) => string;
  }) => Promise<unknown>;
  export default init;
}
