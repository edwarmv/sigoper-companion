# Keep Windows firewall changes explicit and distinguish readiness from reachability

The Windows desktop must never silently create or broaden firewall rules for the phone connection. It may request narrowly scoped permission only after the user explicitly starts phone sharing, and must explain the executable, port, and network profile involved. Diagnostics must distinguish a shared server that is listening and locally ready from phone reachability, which cannot be inferred from an unreachable phone alone.
