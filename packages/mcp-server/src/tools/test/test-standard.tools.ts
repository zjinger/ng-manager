import { z } from "zod";
import type { McpToolDefinition } from "../index";
import { ok } from "../../utils/result";
import { resolveProjectRoot } from "../../filesystem/project-files";
import { loadFrontendStandard, scanFrontendProject } from "../../standard/frontend-standard.service";
import { detectMissingSpecs, generateSpecPlan, validateSpecNaming } from "../../standard/validators/test.validator";

const projectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

export function testStandardTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.test.detectMissingSpecs",
      description: "Detect service/util/complex component files that should have frontend spec coverage. MVP emits warnings only.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.test.detectMissingSpecs", detectMissingSpecs(files, loaded.standard));
      },
    },
    {
      name: "ngm.test.generateSpecPlan",
      description: "Generate a lightweight spec plan for missing service/util/component specs.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.test.generateSpecPlan", generateSpecPlan(files, loaded.standard));
      },
    },
    {
      name: "ngm.test.validateNaming",
      description: "Validate frontend test file naming, preferring Angular .spec.ts files.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.test.validateNaming", validateSpecNaming(files));
      },
    },
  ];
}
