# DramaForge v1.8.2 context notes

- User explicitly requested **reuse the working NodeCanvas source/files unchanged** instead of constructing another connector/installer.
- Use original NodeCanvas v1.13.0 Windows installer bytes, protocol `nodecanvas://connect`, loopback port 7330, and original challenge + /api/claim + tab lease flow.
- No rename or modification of the original PE executable; no in-Vercel Windows compilation.
- Keep existing DramaForge screenplay/canon tools and local data unmodified except connector integrations and UI copy.
- Original NodeCanvas connector supports Codex account status/login and IMAGE generation only (`/api/jobs`). Text endpoints in DramaForge are not implemented by unmodified NodeCanvas binary; never claim those work.
- Existing v1.8.1 custom bridge sources may remain as legacy source, but are not the default/browser connector. Avoid mixing tokens, ports, or claiming support based on it.
- Test source binary hash, protocol contract, build success, UI preview and API bridge mock; original Windows runtime execution must be checked by user separately.
