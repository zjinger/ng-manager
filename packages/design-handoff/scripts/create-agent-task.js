const { createHandoffAgentTask } = require("../lib");

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

const packageDir = readArg("--package") || process.argv[2];

if (!packageDir) {
  console.error(
    [
      "Usage:",
      "npm run handoff:task -w @yinuo-ngm/design-handoff -- --package <handoff-package-dir>",
      "",
      "Optional:",
      "--out <output-root>",
      "--slug <task-slug>",
      "--target-project <target-project-root>",
      "--profile <profile-file-or-project-root>",
      "--route <target-route>",
      "--target-path <target-path>",
      "--target-app <target-app-name-or-root>",
      "--artifact <static-html|framework-component>",
      "--artifact-type <static-html|framework-component>",
    ].join("\n"),
  );
  process.exit(1);
}

const task = createHandoffAgentTask({
  packageDir,
  outputRoot: readArg("--out") || undefined,
  slug: readArg("--slug") || undefined,
  targetProject: readArg("--target-project") || undefined,
  profile: readArg("--profile") || undefined,
  targetRoute: readArg("--route") || undefined,
  targetPath: readArg("--target-path") || undefined,
  targetApp: readArg("--target-app") || undefined,
  artifactType: readArg("--artifact") || readArg("--artifact-type") || undefined,
});

console.log(
  JSON.stringify(
    {
      taskDir: task.taskDir,
      promptPath: task.promptPath,
      contextPath: task.contextPath,
      screenshotPath: task.screenshotPath,
      summary: task.context.summary,
    },
    null,
    2,
  ),
);
