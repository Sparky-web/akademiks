import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

for (const exitCode of [0, 1, 124]) {
  test(`cron records success only after completed Node task, exit=${exitCode}`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "rgsu-cron-"));
    try {
      await mkdir(path.join(root, "scripts"));
      await mkdir(path.join(root, "bin"));
      await mkdir(path.join(root, "state", "akademiks-rgsu"), {
        recursive: true,
      });
      await copyFile(
        new URL("./run-rgsu-groups-cron.sh", import.meta.url),
        path.join(root, "scripts", "run.sh"),
      );
      const executables: Record<string, string> = {
        logger: '#!/bin/bash\ncat >> "$TEST_LOG"\n',
        node: '#!/bin/bash\nif [[ "$1" == "-e" ]]; then exit 0; fi\nprintf "%s\\n" "$@" > "$TEST_ARGS"\necho "node stdout"\necho "node stderr" >&2\nexit "$TEST_EXIT"\n',
        timeout: '#!/bin/bash\nshift 3\nexec "$@"\n',
      };
      for (const [name, text] of Object.entries(executables)) {
        await writeFile(path.join(root, "bin", name), text);
        await chmod(path.join(root, "bin", name), 0o700);
      }
      const state = path.join(
        root,
        "state",
        "akademiks-rgsu",
        "groups-last-success",
      );
      await writeFile(state, "1\n");
      const env = {
        ...process.env,
        HOME: root,
        PATH: `${root}/bin:/usr/bin:/bin`,
        RGSU_NODE_BIN: `${root}/bin/node`,
        XDG_STATE_HOME: `${root}/state`,
        TEST_LOG: `${root}/log`,
        TEST_ARGS: `${root}/args`,
        TEST_EXIT: `${exitCode}`,
      };
      const result = spawnSync("bash", [path.join(root, "scripts", "run.sh")], {
        env,
        encoding: "utf8",
      });
      assert.equal(result.status, exitCode, result.stderr);
      const stamp = Number((await readFile(state, "utf8")).trim());
      assert.equal(stamp > 1, exitCode === 0);
      const args = await readFile(path.join(root, "args"), "utf8");
      assert.match(args, /--env-file=.env/);
      assert.match(args, /scripts\/update-rgsu-groups.ts/);
      const log = await readFile(path.join(root, "log"), "utf8");
      assert.match(log, /node stderr/);
      if (exitCode === 0) {
        await rm(path.join(root, "args"));
        const skipped = spawnSync(
          "bash",
          [path.join(root, "scripts", "run.sh")],
          { env, encoding: "utf8" },
        );
        assert.equal(skipped.status, 0);
        await assert.rejects(readFile(path.join(root, "args")), {
          code: "ENOENT",
        });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
