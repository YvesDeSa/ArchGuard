// Mock de chalk para ambiente Jest (chalk v5 é ESM-only)
const noOp = (str: string) => str;

const chalk: any = new Proxy(noOp, {
  get: () => chalk,
  apply: (_t: any, _b: any, args: any[]) => args[0],
});

chalk.bold = chalk;
chalk.dim = noOp;
chalk.cyan = noOp;
chalk.green = noOp;
chalk.yellow = noOp;
chalk.red = noOp;
chalk.magenta = noOp;
chalk.gray = noOp;

export default chalk;
