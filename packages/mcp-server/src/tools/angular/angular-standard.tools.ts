import { z } from "zod";
import type { McpToolDefinition } from "../index";
import { ok } from "../../utils/result";
import { resolveProjectRoot } from "../../filesystem/project-files";
import { loadFrontendStandard, scanFrontendProject } from "../../standard/frontend-standard.service";
import { validateAngularStructure } from "../../standard/validators/angular-structure.validator";
import { validateComponentBoundary, validateComponentNaming } from "../../standard/validators/component.validator";

const projectSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectPath: z.string().trim().min(1).optional(),
}).strict();

export function angularStandardTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.angular.validateStructure",
      description: "Validate configured Angular pages/components/services/models directory structure.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.angular.validateStructure", validateAngularStructure(files, loaded.standard));
      },
    },
    {
      name: "ngm.angular.validateComponentNaming",
      description: "Validate Angular component file suffix naming for page/component/dialog/drawer/table/form conventions.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.angular.validateComponentNaming", validateComponentNaming(files, loaded.standard));
      },
    },
    {
      name: "ngm.angular.validateComponentBoundary",
      description: "Detect large components, obvious any usage, hardcoded remote API URLs, and page placement issues.",
      riskLevel: "read",
      inputSchema: projectSchema,
      async handler(args, context) {
        const project = await resolveProjectRoot(context, args);
        const loaded = await loadFrontendStandard(project);
        const files = await scanFrontendProject(project.projectRoot);
        return ok("ngm.angular.validateComponentBoundary", validateComponentBoundary(files, loaded.standard));
      },
    },
  ];
}
