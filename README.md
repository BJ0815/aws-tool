# AWS-Tool

將一些自己開發時常需要用到的功能，整合在一起

## Install

```bash
npm i -g aws-tool
```

需安裝 AWS CLI

```bash
brew install aws-cli
```

## Usage

```bash
# 取的 sso credential
aws-tool get-role-credential
```

如果沒登入會自動進行`aws sso login`
