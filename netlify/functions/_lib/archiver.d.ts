// archiver ships no bundled types — ambient declaration for the surface download.ts uses
declare module 'archiver' {
  const archiver: any;
  export const ZipArchive: any;
  export const Archiver: any;
  export default archiver;
}
