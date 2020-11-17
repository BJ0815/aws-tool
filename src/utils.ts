import chalk from "chalk";

export const makeLabel = (input: string, type: "info" | "success" | "error") =>
  chalk[type === "info" ? "bgBlue" : type === "error" ? "bgRed" : "bgGreen"](
    chalk.black(` ${input.toUpperCase()} `)
  );

export const logger = (...tip: any[]) => console.log(...tip);
