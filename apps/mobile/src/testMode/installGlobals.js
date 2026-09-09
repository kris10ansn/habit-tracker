const { testFetch } = require("./fetch");
const { testFixture } = require("./fixture.generated");
const { installFrozenDate } = require("./freezeDate");

installFrozenDate(testFixture.now);
globalThis.fetch = testFetch;
