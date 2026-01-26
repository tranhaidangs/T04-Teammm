const fs = require("fs");
const path = require("path");

/**
 * Recursively load all command modules from a base directory.
 * Returns { modules: Array<module>, names: Array<string> }
 */
function loadCommands(baseDir, options = {}) {
  const exclude = new Set(
    (process.env.EXCLUDE_COMMANDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (Array.isArray(options.exclude)) {
    for (const name of options.exclude) exclude.add(String(name).trim());
  }

  const modules = [];

  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      console.error("Cannot read commands directory:", dir, e.message);
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      
      // Skip files with "_old" in the name
      if (entry.name.includes("_old")) {
        console.log(`⏭️ Skipping old file: ${entry.name}`);
        continue;
      }

      try {
        const mod = require(full);
        if (!mod || !mod.data || typeof mod.execute !== "function") {
          // Skip non-command files
          continue;
        }
        const name = mod.data?.name || mod.data?.toJSON?.().name;
        if (!name) {
          console.warn("Command file missing name:", full);
          continue;
        }
        if (exclude.has(name)) {
          console.log(`⏭️ Excluding command: ${name}`);
          continue;
        }
        modules.push(mod);
      } catch (e) {
        console.error("❌ Failed to load command:", full, e.message);
      }
    }
  }

  walk(baseDir);
  const names = modules.map((m) => m.data?.name || m.data?.toJSON?.().name).filter(Boolean);
  console.log("🧩 Loaded commands:", names.join(", "));
  return { modules, names };
}

module.exports = { loadCommands };
