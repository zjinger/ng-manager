import { asObject } from "../../utils/config-utils";

export interface AngularWorkspaceViewModel {
  defaultProject?: string;
  selectedProjectName?: string;
  selectedProject?: AngularProjectViewModel;
  projects: AngularProjectViewModel[];
}

export interface AngularProjectViewModel {
  name: string;
  targetContainer?: "architect" | "targets";
  projectType?: string;
  root?: string;
  sourceRoot?: string;
  prefix?: string;
  build?: AngularTargetViewModel;
  serve?: AngularTargetViewModel;
  test?: AngularTargetViewModel;
}

export interface AngularTargetViewModel {
  name: string;
  defaultConfiguration?: string;
  options?: Record<string, unknown>;
  configurations?: Record<string, unknown>;
}

function toTarget(name: string, input: unknown): AngularTargetViewModel | undefined {
  const target = asObject(input);
  if (Object.keys(target).length === 0) {
    return undefined;
  }
  return {
    name,
    defaultConfiguration:
      typeof target.defaultConfiguration === "string" ? target.defaultConfiguration : undefined,
    options: asObject(target.options),
    configurations: asObject(target.configurations)
  };
}

export function buildAngularWorkspaceViewModel(raw: unknown): AngularWorkspaceViewModel {
  const workspace = asObject(raw);
  const projectsObject = asObject(workspace.projects);
  const projectNames = Object.keys(projectsObject);
  const defaultProjectFromFile =
    typeof workspace.defaultProject === "string" ? workspace.defaultProject : undefined;
  const selectedProjectName = defaultProjectFromFile ?? projectNames[0];
  const defaultProject = defaultProjectFromFile ?? selectedProjectName;

  const projects = projectNames.map((name) => {
    const project = asObject(projectsObject[name]);
    const targetContainer: "architect" | "targets" =
      typeof project.architect === "object" && project.architect !== null
        ? "architect"
        : "targets";
    const targets = asObject(project[targetContainer]);
    return {
      name,
      targetContainer,
      projectType: typeof project.projectType === "string" ? project.projectType : undefined,
      root: typeof project.root === "string" ? project.root : undefined,
      sourceRoot: typeof project.sourceRoot === "string" ? project.sourceRoot : undefined,
      prefix: typeof project.prefix === "string" ? project.prefix : undefined,
      build: toTarget("build", targets.build),
      serve: toTarget("serve", targets.serve),
      test: toTarget("test", targets.test)
    };
  });

  return {
    defaultProject,
    projects,
    selectedProjectName,
    selectedProject: projects.find((item) => item.name === selectedProjectName)
  };
}
