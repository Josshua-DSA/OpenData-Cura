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

  return nextResolve(specifier, context);
}
