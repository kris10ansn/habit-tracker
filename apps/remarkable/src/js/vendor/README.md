# qrcode-generator

This directory vendors the unmodified JavaScript distribution of
[`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) because the reMarkable
runtime loads plain JavaScript from a Qt resource bundle and has no Node.js module loader.

- Package version: `2.0.4`
- Upstream commit: `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8`
- Upstream file: `js/dist/qrcode.js`
- SHA-256: `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c`
- License: MIT; see `qrcode-generator.LICENSE`

When updating, replace the distribution and license from a tagged upstream commit, update the
metadata above, and rerun the QR decoder acceptance check as well as `make test`.
