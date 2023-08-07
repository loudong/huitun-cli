#!/usr/bin/env node
const inquirer = require("inquirer");
const { program } = require("commander");
const fs = require("fs");
const path = require("path");
const OSS = require("ali-oss");
const Core = require("@alicloud/pop-core"); // cdn
const { exec } = require("child_process");
const packageJson = require("../../package.json");
const { LOG } = require("../utils/index");
// const minimist = require("minimist");
// const dotenv = require("dotenv");
const { MODULE_LIST } = require("../constant");
const localPath = "./dist";
// const CDN = require('aliyun-sdk').CDN;

// 读取目录内容
function readDir(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

// 获取文件信息
function getFileStats(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}

// 获取当前的 Git 分支
function getCurrentGitBranch() {
  return new Promise((resolve, reject) => {
    exec("git rev-parse --abbrev-ref HEAD", (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        const branchName = stdout.trim();
        resolve(branchName);
      }
    });
  });
}

// 读取本地文件夹下的文件列表

// 遍历文件列表并逐个上传

async function uploadFiles(client, dir, env, moduleName) {
  try {
    const files = await readDir(dir);
    // 遍历dir文件夹的文件
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await getFileStats(filePath);
      if (stats.isDirectory()) {
        await uploadFiles(client, filePath, env, moduleName); // 递归处理子文件夹
      } else {
        // 资源文件上传路径
        const assetsPath = env === "development" ? "modules_test" : "modules";
        // 主入口文件上传路径
        const mainPath =
          env === "development" ? "diantoushi_test" : "diantoushi";
        const relativePath = path.relative(localPath, filePath);
        // 上传资源 --> modules
        await client.put(
          `${assetsPath}/${moduleName}/${relativePath}`,
          filePath
        );
        LOG.success(
          `文件 ${filePath} 上传至${assetsPath}/${moduleName}/${relativePath}`
        );
        if (file === `${moduleName}.js`) {
          // 上传入口文件 ---> diantoushi
          await client.put(`${mainPath}/${relativePath}`, filePath);
          LOG.success(`文件 ${filePath} 上传至${mainPath}/${relativePath}`);
        }
      }
    }
  } catch (err) {
    LOG.error("上传失败", err.code);
  }
}

async function refreshCDN() {}

function login(bucket) {
  return new Promise((resolve) => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "accessKeyId",
          message: "Enter your Aliyun Access Key ID:",
        },
        {
          type: "password",
          name: "accessKeySecret",
          message: "Enter your Aliyun Access Key Secret:",
        },
      ])
      .then((answers) => {
        const ossClient = new OSS({
          accessKeyId: answers.accessKeyId,
          accessKeySecret: answers.accessKeySecret,
          bucket: bucket,
          region: "oss-cn-hangzhou",
        });
        const cdnClient = new Core({
          accessKeyId: answers.accessKeyId,
          accessKeySecret: answers.accessKeySecret,
          endpoint: "http://cdn.aliyuncs.com",
          apiVersion: "2018-05-10",
        });
        // console.log("登入", ossClient);
        /**
         * todo 判断登入状态
         */
        resolve({ ossClient, cdnClient });
      });
  });
}

// 获取参数
function getArgs() {
  return minimist(process.argv);
}

// 设置环境变量
function setEnv(env) {
  if (args.env === "production") {
    dotenv.config({
      path: ".env_production",
    });
  } else if (args.env === "development") {
    dotenv.config({
      path: ".env_development",
    });
  } else {
    LOG.error("没有找到该环境的配置文件");
  }
  console.log("env", process.env);
}

// 刷新cdn
async function refreshCDNPaths(cdnClient, pathsToRefresh) {
  const requestOption = {
    method: "POST",
  };

  const params = {
    Action: "RefreshObjectCaches",
    ObjectType: "Directory",
    ObjectPath: pathsToRefresh.join("\n"), // 使用换行符将多个目录拼接起来
  };
  try {
    const result = await cdnClient.request(
      "RefreshObjectCaches",
      params,
      requestOption
    );
    LOG.success("刷新请求已提交", result.RequestId);
  } catch (error) {
    LOG.error("刷新请求提交失败", error);
  }
}

async function runPublish(moduleName, options) {
  if (!MODULE_LIST.includes(moduleName)) {
    return LOG.error("该模块暂不支持");
  }
  console.log("options", options);
  // 没有传递env，默认是development
  const env = options.env || "development";
  // 没有传递bucket则默认是diantoushi-test
  const bucket = options.bucket || "diantoushi-test";
  if (env === "production") {
    // 获取分支
    const branchName = await getCurrentGitBranch();
    if (branchName !== "master") {
      return LOG.error("发布线上需要在master分支执行该操作。");
    }
  } else {
    const { ossClient, cdnClient } = await login(bucket);
    // 上传,dist文件夹下的文件
    // uploadFiles(ossClient, localPath, env, moduleName);
    // 刷新cdn
    const refreshPath = [
      `https://assets.diantoushi.com/diantoushi${
        env === "development" ? "_test" : ""
      }/`,
      `https://assets.diantoushi.com/modules${
        env === "development" ? "_test" : ""
      }/${moduleName}/`,
    ];
    LOG.info("开始刷新cdn...");
    await refreshCDNPaths(cdnClient, refreshPath);
  }
  // const args = getArgs();
  // if (!args.module) {
  //   // 参数中没有指定module，则从配置文件中获取
  //   setEnv();
  // } else {
  //   moduleName = args.module;
  // }
}
// run();
program
  .version(packageJson.version)
  .name(packageJson.name)
  .description(packageJson.description);
// 定义命令
program
  .command("publish")
  .description("上传打包文件到oss，并更新缓存。")
  .argument("<module>", "指定要发布的模块")
  .option("--env <envName>", "指定要发布的环境")
  .option("--bucket <butketName>", "指定要发布的bucket")
  .action((str, options) => {
    runPublish(str, options);
  });
program.parse();
