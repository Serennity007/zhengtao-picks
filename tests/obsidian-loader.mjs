export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'obsidian') {
    return {
      url: new URL('./obsidian-stub.mjs', import.meta.url).href,
      format: 'module',
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
