declare module "read-excel-file/node" {
  export default function readXlsxFile(input: Buffer): Promise<unknown[][]>
}

declare module "read-excel-file/browser" {
  export default function readXlsxFile(input: File | Blob | ArrayBuffer): Promise<unknown[][]>
}

declare module "qrcode" {
  export function toDataURL(text: string, options?: unknown): Promise<string>
}
