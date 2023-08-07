# huitun-cli

This command-line tool provides a simplified way to publish internal modules of our project.

## Installation

You can install the CLI globally using the following command:

```bash
npm install -g huitun-cli
```

Usage
Publish Command

To publish an internal module, use the publish command with the required arguments:

```bash
huitun-cli publish my_module --env=development 
```
Replace development with the target environment and my-module with the name of the module you want to publish.

Arguments
env: The environment to which you want to publish the module. This could be development or production.

module: The name of the module you want to publish.

Example
For example, if you have a module named "tb_trade" and you want to publish it to the development environment, use the following command:

```bash
huitun-cli publish tb_trade --env=development 
```

