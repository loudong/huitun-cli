const inquirer = require("inquirer");
const fs = require("fs");
const OSS = require("aliyun-sdk").OSS;

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
    {
      type: "input",
      name: "bucket",
      message: "Enter your Aliyun OSS Bucket name:",
    },
    {
      type: "input",
      name: "localPath",
      message: "Enter the local folder path to upload:",
    },
    {
      type: "input",
      name: "remotePath",
      message: "Enter the remote OSS folder path:",
    },
  ])
  .then((answers) => {
    const ossClient = new OSS({
      accessKeyId: answers.accessKeyId,
      accessKeySecret: answers.accessKeySecret,
      bucket: answers.bucket,
    });

    // 读取本地文件夹下的文件列表
    const files = fs.readdirSync(answers.localPath);

    // 遍历文件列表并逐个上传
    files.forEach((file) => {
      const localFilePath = `${answers.localPath}/${file}`;
      const remoteFilePath = `${answers.remotePath}/${file}`;

      ossClient
        .put(remoteFilePath, localFilePath)
        .then((result) => {
          console.log(`Uploaded ${localFilePath} to OSS as ${remoteFilePath}`);
        })
        .catch((err) => {
          console.error(`Error uploading ${localFilePath}:`, err);
        });
    });
  });
