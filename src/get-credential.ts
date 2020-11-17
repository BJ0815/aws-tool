import { readdirSync, readFileSync, writeFileSync } from "fs";
import ini from "ini";
import { homedir } from "os";
import path from "path";
import AWS, { SSO } from "aws-sdk";
import chalk from "chalk";
import { makeLabel, logger } from "./utils";
import { login } from "./sso-login";
interface Config {
  [key: string]: {
    sso_region: string;
    sso_account_id: string;
    sso_role_name: string;
  };
}

type Credential = {
  [key: string]: {
    aws_access_key_id?: SSO.AccessKeyType;
    aws_secret_access_key?: SSO.SecretAccessKeyType;
    aws_session_token?: SSO.SessionTokenType;
    expiration?: SSO.ExpirationTimestampType;
  };
};

type ServerOptions = {
  profile?: string;
};

export class GetCredentialService {
  opts: ServerOptions;
  config?: Config;
  constructor(opts: ServerOptions) {
    this.opts = opts;
    if (this.opts.profile) this.loadConfig();
  }
  readConfig() {
    logger(`${makeLabel("CLI", "info")} read local AWS config ...`);
    return ini.parse(
      readFileSync(path.resolve(homedir(), "./.aws/config"), "utf-8")
    );
  }
  readCreds(): Credential {
    logger(`${makeLabel("CLI", "info")} read local AWS credentials ...`);
    return ini.parse(
      readFileSync(path.resolve(homedir(), "./.aws/credentials"), "utf-8")
    );
  }
  loadConfig() {
    this.config = this.readConfig();
    if (!this.config) {
      throw new Error("Profile not found");
    }
    return this.config;
  }
  getAccessToken(): SSO.AccessTokenType | null {
    logger(`${makeLabel("CLI", "info")} get local AWS SSO accessToken ...`);
    return readdirSync(path.resolve(homedir(), "./.aws/sso/cache")).reduce(
      (token, file) => {
        if (token !== null) {
          return token;
        }
        const data = JSON.parse(
          readFileSync(
            path.resolve(homedir(), "./.aws/sso/cache", file),
            "utf-8"
          )
        );
        const date = new Date(data.expiresAt.replace(/UTC/gm, `Z`));
        if (
          date > new Date() &&
          typeof data.accessToken === "string" &&
          data.accessToken !== ""
        ) {
          return data.accessToken;
        }
        return token;
      },
      null
    );
  }
  getCredentials(sso: SSO, params: SSO.GetRoleCredentialsRequest) {
    logger(`${makeLabel("CLI", "info")} get AWS SSO Credentials ...`);
    return sso.getRoleCredentials(params).promise();
  }
  writeCreds(creds: SSO.RoleCredentials) {
    logger(`${makeLabel("CLI", "info")} write AWS credentials to file ...`);
    writeFileSync(
      path.resolve(homedir(), "./.aws/credentials"),
      ini.stringify(creds)
    );
    return;
  }
  async start() {
    const profile = this.opts.profile;
    const key = profile === "default" ? "default" : `profile ${profile}`;
    if (!profile) throw new Error("Please choose your point profile !");
    if (!this.config) throw new Error("Config is not exists");
    if (!this.config[key]) throw new Error("Profile Config is not exists");

    const creds = this.readCreds();

    if (creds[profile].expiration && creds[profile].expiration! > Date.now()) {
      logger(`${makeLabel("CLI", "success")} ** Credentials already exists **`);
      return;
    }

    const {
      sso_region,
      sso_account_id: accountId,
      sso_role_name: roleName,
    } = this.config[key];

    let accessToken = this.getAccessToken();

    if (accessToken === null) {
      await login(profile);
      accessToken = this.getAccessToken();
      if (!accessToken) throw new Error("Can't get the AccessToken");
    }

    AWS.config.region = sso_region;

    const sso = new AWS.SSO();

    const params = {
      accessToken,
      accountId,
      roleName,
    };

    const { roleCredentials } = await this.getCredentials(sso, params).catch(
      (e) => {
        console.error("Something went wrong");
        console.error(e);
        console.error("Please login to SSO manually");
        console.error("aws sso login --profile " + profile);

        throw new Error("Get Credential Error");
      }
    );

    if (!roleCredentials) throw new Error("roleCredentials is not exists");

    creds[profile] = {
      aws_access_key_id: roleCredentials.accessKeyId,
      aws_secret_access_key: roleCredentials.secretAccessKey,
      aws_session_token: roleCredentials.sessionToken,
      expiration: roleCredentials.expiration,
    };

    this.writeCreds(creds);
    logger(
      makeLabel("CLI", "success"),
      `Done, check out ${chalk.green("~/.aws/credential")} file`
    );
  }
}
