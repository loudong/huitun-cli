const log = require("npmlog");
log.heading = "huitun";
log.addLevel("success", 2000, { fg: "white", bg: "green", bold: true });
module.exports = log;
