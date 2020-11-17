import { makeLabel, logger } from "./utils";
import { spawn } from "child_process";

export const login = (profile: string) => {
  const startTime = Date.now();
  return new Promise((res, rej) => {
    logger(`${makeLabel("AWS CLI", "info")} AWS SSO Login ...`);
    const child = spawn("aws", ["sso", "login", "--profile", profile]);

    child.stdout.on("data", (data) => {
      console.log(`\n${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`ERROR: ${data}`);
    });

    child.on("error", (error) => {
      console.error(`ERROR: ${error.message}`);
    });

    child.on("close", () => {
      const timeInMs = Date.now() - startTime;
      logger(
        `${makeLabel(
          "AWS CLI",
          "success"
        )} AWS SSO Login success in ${Math.floor(timeInMs)} ms`
      );
      return res();
    });
  });
};