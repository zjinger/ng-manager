#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://192.168.1.31:7008"
CONFIG_ENV = "SL_HUB_V2_CONFIG"
CLAUDE_SETTINGS_FILENAMES = ("settings.local.json", "settings.json")
OPENCODE_CONFIG_ENV = "OPENCODE_CONFIG"
OPENCODE_CONFIG_CONTENT_ENV = "OPENCODE_CONFIG_CONTENT"
OPENCODE_CONFIG_FILENAMES = ("opencode.json", "opencode.jsonc")


def strip_json_comments(text: str) -> str:
    output: list[str] = []
    index = 0
    in_string = False
    escaped = False
    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ""
        if in_string:
            output.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            index += 1
            continue
        if char == '"':
            in_string = True
            output.append(char)
            index += 1
            continue
        if char == "/" and next_char == "/":
            index += 2
            while index < len(text) and text[index] not in "\r\n":
                index += 1
            continue
        if char == "/" and next_char == "*":
            index += 2
            while index + 1 < len(text) and not (text[index] == "*" and text[index + 1] == "/"):
                index += 1
            index += 2
            continue
        output.append(char)
        index += 1
    return "".join(output)


def loads_json_or_jsonc(text: str) -> dict:
    if not text.strip():
        return {}
    parsed = json.loads(strip_json_comments(text))
    return parsed if isinstance(parsed, dict) else {}


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return loads_json_or_jsonc(path.read_text(encoding="utf-8"))


def normalize_config(raw_config: dict) -> dict:
    if not isinstance(raw_config, dict):
        return {}

    normalized: dict[str, str] = {}

    def put(key: str, value: object) -> None:
        if value is not None and str(value).strip():
            normalized[key] = str(value).strip()

    def merge_hub_config(value: object) -> None:
        if not isinstance(value, dict):
            return
        key_pairs = [
            ("base_url", "baseUrl"),
            ("project_key", "projectKey"),
            ("project_name", "projectName"),
            ("project_token", "projectToken"),
            ("personal_token", "personalToken"),
            ("source", "source"),
        ]
        for snake_key, camel_key in key_pairs:
            put(snake_key, value.get(snake_key))
            put(snake_key, value.get(camel_key))

    merge_hub_config(raw_config)
    merge_hub_config(raw_config.get("sl_hub_v2"))
    merge_hub_config(raw_config.get("slHubV2"))

    env_config = raw_config.get("env")
    if isinstance(env_config, dict):
        env_key_map = {
            "SL_HUB_V2_BASE_URL": "base_url",
            "SL_HUB_V2_PROJECT_KEY": "project_key",
            "SL_HUB_V2_PROJECT_NAME": "project_name",
            "SL_HUB_V2_PROJECT_TOKEN": "project_token",
            "SL_HUB_V2_PERSONAL_TOKEN": "personal_token",
            "SL_HUB_V2_SOURCE": "source",
        }
        for env_key, config_key in env_key_map.items():
            put(config_key, env_config.get(env_key))

    return normalized


def normalize_project_config(raw_config: dict) -> dict:
    if not isinstance(raw_config, dict):
        return {}
    normalized = normalize_config(raw_config)
    for key in ("name", "alias", "id"):
        value = raw_config.get(key)
        if value is not None and str(value).strip():
            normalized[key] = str(value).strip()
    return normalized


def normalize_projects(raw_config: dict) -> dict[str, dict]:
    if not isinstance(raw_config, dict):
        return {}

    projects: dict[str, dict] = {}
    raw_projects = raw_config.get("projects")
    if isinstance(raw_projects, dict):
        for name, value in raw_projects.items():
            project = normalize_project_config(value)
            project_name = project.get("name") or project.get("alias") or str(name).strip()
            if project_name:
                projects[project_name] = project
    elif isinstance(raw_projects, list):
        for value in raw_projects:
            project = normalize_project_config(value)
            project_name = project.get("name") or project.get("alias") or project.get("id")
            if project_name:
                projects[project_name] = project
    return projects


def merge_projects(*project_maps: dict[str, dict]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for project_map in project_maps:
        merged.update(project_map)
    return merged


def normalize_default_project(raw_config: dict) -> str | None:
    if not isinstance(raw_config, dict):
        return None
    for key in ("default_project", "defaultProject", "project"):
        value = raw_config.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def normalize_nested_default_project(raw_config: dict) -> str | None:
    if not isinstance(raw_config, dict):
        return None
    return (
        normalize_default_project(raw_config)
        or normalize_default_project(raw_config.get("sl_hub_v2"))
        or normalize_default_project(raw_config.get("slHubV2"))
    )


def config_from_raw(raw_config: dict) -> dict:
    config = normalize_config(raw_config)
    projects = merge_projects(
        normalize_projects(raw_config),
        normalize_projects(raw_config.get("sl_hub_v2")),
        normalize_projects(raw_config.get("slHubV2")),
    )
    if projects:
        config["projects"] = projects
    default_project = normalize_nested_default_project(raw_config)
    if default_project:
        config["default_project"] = default_project
    return config


def merge_configs(*configs: dict) -> dict:
    merged: dict = {}
    for config in configs:
        if not config:
            continue
        projects = config.get("projects")
        if isinstance(projects, dict):
            merged_projects = merged.setdefault("projects", {})
            for name, project in projects.items():
                current_project = merged_projects.get(name, {})
                merged_projects[name] = {**current_project, **project}
        for key, value in config.items():
            if key != "projects":
                merged[key] = value
    return merged


def claude_project_settings_paths() -> list[Path]:
    paths: list[Path] = []
    for directory in [Path.cwd(), *Path.cwd().parents]:
        claude_dir = directory / ".claude"
        for filename in CLAUDE_SETTINGS_FILENAMES:
            paths.append(claude_dir / filename)
    return paths


def opencode_project_config_paths() -> list[Path]:
    paths: list[Path] = []
    for directory in [Path.cwd(), *Path.cwd().parents]:
        for filename in OPENCODE_CONFIG_FILENAMES:
            paths.append(directory / filename)
        if (directory / ".git").exists():
            break
    return paths


def opencode_user_config_paths() -> list[Path]:
    paths: list[Path] = []
    appdata = os.environ.get("APPDATA")
    if appdata:
        for filename in OPENCODE_CONFIG_FILENAMES:
            paths.append(Path(appdata) / "opencode" / filename)
    home = Path.home()
    for filename in OPENCODE_CONFIG_FILENAMES:
        paths.append(home / ".config" / "opencode" / filename)
    return paths


def load_opencode_config() -> dict:
    configs: list[dict] = []
    for path in opencode_user_config_paths():
        configs.append(config_from_raw(load_json(path)))
    if os.environ.get(OPENCODE_CONFIG_ENV):
        configs.append(config_from_raw(load_json(Path(os.environ[OPENCODE_CONFIG_ENV]).expanduser())))
    for path in opencode_project_config_paths():
        if path.exists():
            configs.append(config_from_raw(load_json(path)))
            break
    if os.environ.get(OPENCODE_CONFIG_CONTENT_ENV):
        configs.append(config_from_raw(loads_json_or_jsonc(os.environ[OPENCODE_CONFIG_CONTENT_ENV])))
    return merge_configs(*configs)


def default_config_paths() -> list[Path]:
    home = Path.home()
    return [
        home / ".openclaw" / "sl-hub-v2.json",
        home / ".codex" / "sl-hub-v2.json",
        *claude_project_settings_paths(),
        home / ".claude" / "settings.json",
        home / ".sl-hub-v2.json",
    ]


def load_config(path_value: str | None) -> dict:
    paths: list[Path] = []
    if path_value:
        paths.append(Path(path_value).expanduser())
    elif os.environ.get(CONFIG_ENV):
        paths.append(Path(os.environ[CONFIG_ENV]).expanduser())
    else:
        default_paths = default_config_paths()
        for path in default_paths[:2]:
            config = config_from_raw(load_json(path))
            if config:
                return config
        opencode_config = load_opencode_config()
        if opencode_config:
            return opencode_config
        paths.extend(default_paths[2:])
    for path in paths:
        config = config_from_raw(load_json(path))
        if config:
            return config
    return {}


def config_get(config: dict, snake_key: str, camel_key: str | None = None) -> str | None:
    value = config.get(snake_key)
    if value is None and camel_key:
        value = config.get(camel_key)
    if value is None:
        return None
    return str(value).strip()


def resolve_value(
    explicit: str | None,
    env_name: str,
    config: dict,
    snake_key: str,
    camel_key: str | None = None,
    default: str | None = None,
) -> str | None:
    for value in (explicit, os.environ.get(env_name), config_get(config, snake_key, camel_key), default):
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def require_value(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f"{name} is required")
    return value


def selected_project_config(args: argparse.Namespace, config: dict) -> dict:
    projects = config.get("projects")
    if not isinstance(projects, dict) or not projects:
        return {}

    selected = args.project or os.environ.get("SL_HUB_V2_PROJECT") or config.get("default_project")
    if selected:
        selected = str(selected).strip()
        project = projects.get(selected)
        if project is None:
            available = ", ".join(sorted(projects.keys()))
            raise ValueError(f"project config not found: {selected}. Available projects: {available}")
        return project

    if len(projects) == 1:
        return next(iter(projects.values()))

    available = ", ".join(sorted(projects.keys()))
    raise ValueError(f"multiple projects configured; pass --project or set default_project. Available projects: {available}")


def resolve_from_config(config: dict, project_config: dict, snake_key: str, camel_key: str | None = None) -> str | None:
    return config_get(project_config, snake_key, camel_key) or config_get(config, snake_key, camel_key)


def resolve_context(args: argparse.Namespace, token_kind: str) -> dict:
    config = load_config(args.config)
    project_config = {} if args.project_key else selected_project_config(args, config)
    base_url = require_value(
        "base_url",
        args.base_url
        or os.environ.get("SL_HUB_V2_BASE_URL")
        or resolve_from_config(config, project_config, "base_url", "baseUrl")
        or DEFAULT_BASE_URL,
    ).rstrip("/")
    project_key = require_value(
        "project_key",
        args.project_key
        or os.environ.get("SL_HUB_V2_PROJECT_KEY")
        or resolve_from_config(config, project_config, "project_key", "projectKey"),
    )
    if token_kind == "project":
        token = (
            args.token
            or os.environ.get("SL_HUB_V2_PROJECT_TOKEN")
            or resolve_from_config(config, project_config, "project_token", "projectToken")
        )
        token_name = "project_token"
    elif token_kind == "personal":
        token = (
            args.token
            or os.environ.get("SL_HUB_V2_PERSONAL_TOKEN")
            or resolve_from_config(config, project_config, "personal_token", "personalToken")
        )
        token_name = "personal_token"
    else:
        raise ValueError(f"unknown token kind: {token_kind}")
    source = (
        args.source
        or os.environ.get("SL_HUB_V2_SOURCE")
        or resolve_from_config(config, project_config, "source", "source")
        or "agent"
    )
    return {
        "base_url": base_url,
        "project_key": project_key,
        "token": require_value(token_name, token),
        "source": source or "agent",
    }


def list_configured_projects(args: argparse.Namespace) -> dict:
    config = load_config(args.config)
    projects = config.get("projects")
    if not isinstance(projects, dict):
        projects = {}
    items = []
    for name, project in sorted(projects.items()):
        items.append(
            {
                "name": name,
                "projectName": config_get(project, "project_name", "projectName"),
                "projectKey": config_get(project, "project_key", "projectKey"),
                "baseUrl": config_get(project, "base_url", "baseUrl") or config_get(config, "base_url", "baseUrl") or DEFAULT_BASE_URL,
                "hasProjectToken": bool(config_get(project, "project_token", "projectToken") or config_get(config, "project_token", "projectToken")),
                "hasPersonalToken": bool(config_get(project, "personal_token", "personalToken") or config_get(config, "personal_token", "personalToken")),
                "isDefault": name == config.get("default_project"),
            }
        )
    return {"code": "OK", "message": "configured projects", "data": {"items": items, "total": len(items)}}


def request_json(url: str, token: str, method: str, body: dict | None = None) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {response_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"request failed: {exc.reason}") from exc


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def docs_read_url(ctx: dict, suffix: str = "", query: dict | None = None) -> str:
    project_key = quote(ctx["project_key"], safe="")
    url = f"{ctx['base_url']}/api/token/projects/{project_key}/docs{suffix}"
    if query:
        url += f"?{urlencode(query)}"
    return url


def docs_write_url(ctx: dict, suffix: str = "") -> str:
    project_key = quote(ctx["project_key"], safe="")
    return f"{ctx['base_url']}/api/personal/projects/{project_key}/docs{suffix}"


def compact_body(body: dict) -> dict:
    return {key: value for key, value in body.items() if value is not None}


def read_content(args: argparse.Namespace) -> str | None:
    content = getattr(args, "content", None)
    content_file = getattr(args, "content_file", None)
    if content is not None and content_file is not None:
        raise ValueError("pass only one of --content or --content-file")
    if content_file is not None:
        return Path(content_file).read_text(encoding="utf-8")
    return content


def tags_from_args(args: argparse.Namespace) -> list[str] | None:
    tags = getattr(args, "tag", None)
    if not tags:
        return None
    return [tag for tag in (item.strip() for item in tags) if tag]


def list_docs(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "project")
    query = {"page": args.page, "pageSize": args.page_size}
    if args.status:
        query["status"] = args.status
    else:
        query["statusGroup"] = args.status_group
    if args.keyword:
        query["keyword"] = args.keyword
    if args.category:
        query["category"] = args.category
    if args.category_id:
        query["categoryId"] = args.category_id
    return request_json(docs_read_url(ctx, query=query), ctx["token"], "GET")


def get_doc(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "project")
    doc_id = quote(args.doc_id.strip(), safe="")
    return request_json(docs_read_url(ctx, f"/{doc_id}"), ctx["token"], "GET")


def slug_doc(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "project")
    slug = quote(args.slug.strip(), safe="")
    return request_json(docs_read_url(ctx, f"/by-slug/{slug}"), ctx["token"], "GET")


def create_doc(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "personal")
    content = read_content(args)
    if not content:
        raise ValueError("create requires --content or --content-file")
    body = compact_body(
        {
            "title": args.title,
            "slug": args.slug,
            "content": content,
            "categoryId": args.category_id,
            "category": args.category,
            "summary": args.summary,
            "tags": tags_from_args(args),
            "status": args.status,
            "source": ctx["source"],
        }
    )
    return request_json(docs_write_url(ctx), ctx["token"], "POST", body)


def update_doc(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "personal")
    content = read_content(args)
    doc_id = quote(args.doc_id.strip(), safe="")
    body = compact_body(
        {
            "title": args.title,
            "slug": args.slug,
            "content": content,
            "categoryId": args.category_id,
            "category": args.category,
            "summary": args.summary,
            "version": args.version,
            "tags": tags_from_args(args),
            "source": ctx["source"],
        }
    )
    if not body:
        raise ValueError("update requires at least one field")
    return request_json(docs_write_url(ctx, f"/{doc_id}"), ctx["token"], "PATCH", body)


def publish_doc(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "personal")
    doc_id = quote(args.doc_id.strip(), safe="")
    body = compact_body({"source": ctx["source"]})
    return request_json(docs_write_url(ctx, f"/{doc_id}/publish"), ctx["token"], "POST", body)


def run(args: argparse.Namespace) -> int:
    handlers = {
        "projects": list_configured_projects,
        "list": list_docs,
        "get": get_doc,
        "slug": slug_doc,
        "create": create_doc,
        "update": update_doc,
        "publish": publish_doc,
    }
    payload = handlers[args.command](args)
    if args.content_only:
        content = payload.get("data", {}).get("contentMd")
        if content is None:
            raise ValueError("response does not contain data.contentMd")
        print(content)
        return 0
    if args.id_only:
        doc_id = payload.get("data", {}).get("id")
        if not doc_id:
            raise ValueError("response does not contain data.id")
        print(doc_id)
        return 0
    print_json(payload)
    return 0


def add_common_root_args(root: argparse.ArgumentParser) -> None:
    root.add_argument("--config", help=f"Config JSON path. Defaults to {CONFIG_ENV}, OpenCode config, or user config paths.")
    root.add_argument("--base-url", help=f"SL Hub V2 base URL. Defaults to config/env or {DEFAULT_BASE_URL}.")
    root.add_argument("--project", help="Configured project alias/name. Defaults to SL_HUB_V2_PROJECT or config default_project.")
    root.add_argument("--project-key", help="SL Hub V2 projectKey. Defaults to config or SL_HUB_V2_PROJECT_KEY.")
    root.add_argument("--token", help="Operation token. Reads expect Project Token; writes expect Personal Token.")
    root.add_argument("--source", help="Audit source metadata for write operations.")
    root.add_argument("--content-only", action="store_true", help="Print only data.contentMd for detail reads.")
    root.add_argument("--id-only", action="store_true", help="Print only data.id.")


def add_doc_fields(parser: argparse.ArgumentParser, require_title: bool) -> None:
    parser.add_argument("--title", required=require_title)
    parser.add_argument("--slug")
    parser.add_argument("--content")
    parser.add_argument("--content-file")
    parser.add_argument("--category-id")
    parser.add_argument("--category")
    parser.add_argument("--summary")
    parser.add_argument("--tag", action="append", help="Repeatable tag value for audit metadata.")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Read and write SL Hub V2 project documents.")
    add_common_root_args(root)
    subparsers = root.add_subparsers(dest="command", required=True)

    subparsers.add_parser("projects", help="List configured project aliases.")

    list_parser = subparsers.add_parser("list", help="List project documents with Project Token.")
    list_parser.add_argument("--page", type=int, default=1)
    list_parser.add_argument("--page-size", type=int, default=20)
    list_parser.add_argument("--status-group", default="active", choices=["active"])
    list_parser.add_argument("--status", choices=["draft", "published", "archived"])
    list_parser.add_argument("--keyword")
    list_parser.add_argument("--category")
    list_parser.add_argument("--category-id")

    get_parser = subparsers.add_parser("get", help="Read document detail by id with Project Token.")
    get_parser.add_argument("--doc-id", required=True)

    slug_parser = subparsers.add_parser("slug", help="Read document detail by slug with Project Token.")
    slug_parser.add_argument("--slug", required=True)

    create_parser = subparsers.add_parser("create", help="Create a document draft with Personal Token.")
    add_doc_fields(create_parser, require_title=True)
    create_parser.add_argument("--status", default="draft", choices=["draft"])

    update_parser = subparsers.add_parser("update", help="Update an existing document with Personal Token.")
    update_parser.add_argument("--doc-id", required=True)
    add_doc_fields(update_parser, require_title=False)
    update_parser.add_argument("--version")

    publish_parser = subparsers.add_parser("publish", help="Publish a document with Personal Token.")
    publish_parser.add_argument("--doc-id", required=True)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        return run(args)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
