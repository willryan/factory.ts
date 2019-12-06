# Changelog

## [0.5.1] - 2019-12-06

- fix typing for combine() and 'required keys'
- update TS version and other dependencies
- jest setup fixes for library development

## [0.5.0] - 2019-05-24

- Added ability to create factories where some props are required to build.
- Removed several dependences that were not actually being used.
- Improve some documentation in the README.md.

## [0.4.5] - 2019-04-10

- Moved tslint to devDependencies.

## [0.4.4] - 2019-03-16

- Added `resetSequenceNumber()` function.

## [0.4.2] - 2019-03-03

- Build objects with clone-deep to avoid shared mutable data between multiple factory invocations (or with original seed data).
- `null` now correctly overrides default values.

## [0.4.1] - 2018-12-07

- 0.4.0 changes (sequence numbers, derived values when `build()` called without any arguments) added to async as well as sync.
- Changed makeFactory to take a config object instead of just a starting sequence number, so that any future factory-level config is not an API breaking change

## [0.4.0] - 2018-12-06

### Changed

- Sequence numbers start from 0 by default, but you can specify a starting sequence number (1) to restore previous behavior.
- Mocha -> Jest. I was having a hard time debugging with Mocha so I switched to the framework I know better.

### Fixed

- derived values did not work when `item` was not passed in to `build()`. They would return the internal `Derived` object rather than run the derivation function.

## [0.3.4] - 2018-08-14

### Added

- Async.makeFactoryFromSync can create an asynchronous factory from a synchronous builder. Useful for example when you want to use a Sync builder to make objects synchronously and then apply a transform that changes to asynchronous mode.

### Fixed

- Optional properties may be omitted on the base object, specified in `build()`, and correctly show up in final output. (Fix to changes for Issue #5.)
