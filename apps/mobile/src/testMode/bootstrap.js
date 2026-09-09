const { installFrozenDate } = require("./freezeDate");
const { testFixture } = require("./fixture.generated");

installFrozenDate(testFixture.now);

const { installAppRuntime } = require("../runtime");
const { testRuntime } = require("./runtime");

installAppRuntime(testRuntime);
