// Side-effecting preload — referenced from `bunfig.toml`'s `preload =`.
// Imports the loader, which calls `Bun.plugin({ ... })` at import time.
import "./loader";
