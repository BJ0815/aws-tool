#!/usr/bin/env node
import { cac } from "cac";
import chalk from "chalk";
import update from "update-notifier";
import inquirer from "inquirer";

const pkg: typeof import("../package.json") = require("../package");

update({ pkg }).notify();

async function main() {
  const cli = cac("aws-tool");

  cli
    .command("get-role-credential")
    .option("--profile [profile]", "Setting the profile")
    .action(async (flags) => {
      const { GetCredentialService } = await import("./get-credential");

      const profile = flags.profile;
      const main = new GetCredentialService({ profile });
      if (!main.opts.profile) {
        const config = main.loadConfig();
        const ans = await inquirer.prompt([
          {
            type: "list",
            message: "Choose the profile",
            choices: Object.keys(config).map((key) =>
              key.replace("profile ", "")
            ),
            name: "profile",
          },
        ]);

        main.opts.profile = ans.profile;
      }

      if (main.opts.profile) {
        console.log(
          `\nUsing config by profile => ${chalk.green(main.opts.profile)}\n`
        );
      }
      await main.start();
    });

  cli.version(pkg.version);
  cli.help();

  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
