# Changelog

## [0.3.4] - 2018-08-14

### Added

- Async.makeFactoryFromSync can create an asynchronous factory from a synchronous builder. Useful for example when you want to use a Sync builder to make objects synchronously and then apply a transform that changes to asynchronous mode.

### Fixed

- Optional properties may be omitted on the base object, specified in `build()`, and correctly show up in final output. (Fix to changes for Issue #5.)
