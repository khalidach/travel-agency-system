const readController = require("./read.controller");
const writeController = require("./write.controller");
const paymentController = require("./payment.controller");
const fileController = require("./file.controller");

module.exports = {
  ...readController,
  ...writeController,
  ...paymentController,
  ...fileController,
};
