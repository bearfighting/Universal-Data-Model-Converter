declare module "node:fs/promises" {
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(
    path: string,
    options: { recursive: boolean; force: boolean },
  ): Promise<void>;
  export function writeFile(
    path: string,
    data: string,
    encoding: "utf8",
  ): Promise<void>;
}

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}

declare module "node:url" {
  export function pathToFileURL(path: string): { href: string };
}

declare const process: {
  cwd(): string;
};
