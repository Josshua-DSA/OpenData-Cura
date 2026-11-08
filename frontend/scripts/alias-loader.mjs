import path from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = path.join(process.cwd(), "src", `${specifier.slice(2)}.ts`);
    return {
      url: pathToFileURL(target).href,
      shortCircuit: true,
    };
  }

  if (specifier === "next/server") {
    return {
      url: pathToFileURL(path.join(process.cwd(), "node_modules", "next", "server.js")).href,
      shortCircuit: true,
    };
  }

  // Import relatif tanpa ekstensi (gaya komponen Next.js, mis. "../data/healthData")
  // tidak dikenali resolver ESM Node -> coba tambahkan ".ts".
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  }

  return nextResolve(specifier, context);
}
