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


def put_if_value(target: dict, key: str, value: object) -> None:
    if value is not None and str(value).strip():
        target[key] = str(value).strip()


def normalize_config(raw_config: dict) -> dict:
    if not isinstance(raw_config, dict):
        return {}

    normalized: dict[str, object] = {}

    def merge_hub_config(value: object) -> None:
        if not isinstance(value, dict):
            return
        for snake_key, camel_key in [
            ("base_url", "baseUrl"),
            ("project_key", "projectKey"),
            ("project_name", "projectName"),
            ("project_token", "projectToken"),
            ("personal_token", "personalToken"),
            ("source", "source"),
        ]:
            put_if_value(normalized, snake_key, value.get(snake_key))
            put_if_value(normalized, snake_key, value.get(camel_key))

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
            put_if_value(normalized, config_key, env_config.get(env_key))

    return normalized


def normalize_project_config(raw_config: dict) -> dict:
    if not isinstance(raw_config, dict):
        return {}
    normalized = normalize_config(raw_config)
    for key in ("name", "alias", "id"):
        put_if_value(normalized, key, raw_config.get(key))
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
                projects[str(project_name)] = project
    elif isinstance(raw_projects, list):
        for value in raw_projects:
            project = normalize_project_config(value)
            project_name = project.get("name") or project.get("alias") or project.get("id")
            if project_name:
                projects[str(project_name)] = project
    return projects


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
    projects = {}
    for value in (
        raw_config,
        raw_config.get("sl_hub_v2"),
        raw_config.get("slHubV2"),
    ):
        projects.update(normalize_projects(value))
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


def require_value(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f"{name} is required")
    return value


def resolve_context(args: argparse.Namespace, token_kind: str) -> dict:
    config = load_config(args.config)
    project_config = {} if getattr(args, "project_key", None) else selected_project_config(args, config)
    base_url = require_value(
        "base_url",
        args.base_url
        or os.environ.get("SL_HUB_V2_BASE_URL")
        or resolve_from_config(config, project_config, "base_url", "baseUrl")
        or DEFAULT_BASE_URL,
    ).rstrip("/")
    project_key = (
        getattr(args, "project_key", None)
        or os.environ.get("SL_HUB_V2_PROJECT_KEY")
        or resolve_from_config(config, project_config, "project_key", "projectKey")
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
        "project_key": require_value("project_key", project_key),
        "token": require_value(token_name, token),
        "source": source,
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
            return json.loads(payload) if payload else {"code": "OK", "data": None}
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {response_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"request failed: {exc.reason}") from exc


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def compact(values: dict) -> dict:
    return {key: value for key, value in values.items() if value is not None and value != []}


def parse_body_json(value: str | None) -> dict:
    if not value:
        return {}
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("--body-json must be a JSON object")
    return parsed


def query_url(ctx: dict, prefix: str, suffix: str = "", query: dict | None = None) -> str:
    project_key = quote(ctx["project_key"], safe="")
    url = f"{ctx['base_url']}/{prefix}/projects/{project_key}{suffix}"
    clean_query = compact(query or {})
    if clean_query:
        url += f"?{urlencode(clean_query, doseq=True)}"
    return url


def token_url(ctx: dict, suffix: str = "", query: dict | None = None) -> str:
    return query_url(ctx, "api/token", suffix, query)


def personal_url(ctx: dict, suffix: str = "", query: dict | None = None) -> str:
    return query_url(ctx, "api/personal", suffix, query)


def preview_write(scope: str, method: str, path: str, body: dict | None) -> dict:
    return {
        "code": "PREVIEW",
        "message": "add --confirm to execute this write operation",
        "data": {
            "method": method,
            "path": path,
            "requiredScope": scope,
            "body": body or {},
        },
    }


def write_personal(args: argparse.Namespace, suffix: str, method: str, scope: str, body: dict | None, confirm_required: bool = False) -> dict:
    if confirm_required and not args.confirm:
        return preview_write(scope, method, suffix, body)
    ctx = resolve_context(args, "personal")
    return request_json(personal_url(ctx, suffix), ctx["token"], method, body)


def read_project(args: argparse.Namespace, suffix: str, query: dict | None = None) -> dict:
    ctx = resolve_context(args, "project")
    return request_json(token_url(ctx, suffix, query), ctx["token"], "GET")


def personal_get(args: argparse.Namespace, suffix: str) -> dict:
    ctx = resolve_context(args, "personal")
    url = f"{ctx['base_url']}/api/personal{suffix}"
    return request_json(url, ctx["token"], "GET")


def run_me(args: argparse.Namespace) -> dict:
    return personal_get(args, "/me")


def run_capabilities(args: argparse.Namespace) -> dict:
    ctx = resolve_context(args, "personal")
    project_key = quote(ctx["project_key"], safe="")
    url = f"{ctx['base_url']}/api/personal/projects/{project_key}/capabilities"
    return request_json(url, ctx["token"], "GET")


def issue_query(args: argparse.Namespace) -> dict:
    return compact(
        {
            "page": args.page,
            "pageSize": args.page_size,
            "keyword": args.keyword,
            "rdItemId": args.rd_item_id,
            "status": args.status,
            "types": args.types,
            "type": args.type,
            "priority": args.priority,
            "assigneeId": args.assignee_id,
            "verifierId": args.verifier_id,
            "sortBy": args.sort_by,
            "sortOrder": args.sort_order,
        }
    )


def run_issue(args: argparse.Namespace) -> dict:
    issue_id = quote(getattr(args, "issue_id", "") or "", safe="")
    if args.issue_command == "list":
        return read_project(args, "/issues", issue_query(args))
    if args.issue_command == "get":
        return read_project(args, f"/issues/{issue_id}")
    if args.issue_command in {"logs", "comments", "participants", "attachments", "branches"}:
        return read_project(args, f"/issues/{issue_id}/{args.issue_command}")
    if args.issue_command == "members":
        return read_project(args, "/members")
    if args.issue_command == "comment":
        body = compact({"content": args.content, "mentions": args.mention})
        return write_personal(args, f"/issues/{issue_id}/comments", "POST", "issue:comment:write", body)
    if args.issue_command == "assign":
        return write_personal(args, f"/issues/{issue_id}/assign", "POST", "issue:assign:write", {"assigneeId": args.assignee_id})
    if args.issue_command == "claim":
        return write_personal(args, f"/issues/{issue_id}/claim", "POST", "issue:assign:write", None)
    if args.issue_command == "branch-create":
        body = {"ownerUserId": args.owner_user_id, "title": args.title}
        return write_personal(args, f"/issues/{issue_id}/branches", "POST", "issue:branch:write", body)
    if args.issue_command == "branch-start-mine":
        return write_personal(args, f"/issues/{issue_id}/branches/start-mine", "POST", "issue:branch:write", {"title": args.title})
    if args.issue_command == "branch-start":
        branch_id = quote(args.branch_id, safe="")
        return write_personal(args, f"/issues/{issue_id}/branches/{branch_id}/start", "POST", "issue:branch:write", None)
    if args.issue_command == "branch-complete":
        branch_id = quote(args.branch_id, safe="")
        return write_personal(args, f"/issues/{issue_id}/branches/{branch_id}/complete", "POST", "issue:branch:write", compact({"summary": args.summary}))
    if args.issue_command in {"start", "wait-update", "verify"}:
        return write_personal(args, f"/issues/{issue_id}/{args.issue_command}", "POST", "issue:transition:write", None, confirm_required=True)
    if args.issue_command == "resolve":
        return write_personal(args, f"/issues/{issue_id}/resolve", "POST", "issue:transition:write", compact({"resolutionSummary": args.resolution_summary}), confirm_required=True)
    if args.issue_command == "reopen":
        return write_personal(args, f"/issues/{issue_id}/reopen", "POST", "issue:transition:write", compact({"remark": args.remark}), confirm_required=True)
    if args.issue_command == "close":
        return write_personal(args, f"/issues/{issue_id}/close", "POST", "issue:transition:write", compact({"reason": args.reason, "remark": args.remark}), confirm_required=True)
    if args.issue_command == "participant-add":
        return write_personal(args, f"/issues/{issue_id}/participants", "POST", "issue:participant:write", compact({"userId": args.user_id, "taskTitle": args.task_title}))
    if args.issue_command == "participant-remove":
        participant_id = quote(args.participant_id, safe="")
        return write_personal(args, f"/issues/{issue_id}/participants/{participant_id}", "DELETE", "issue:participant:write", None)
    raise ValueError(f"unknown issue command: {args.issue_command}")


def rd_query(args: argparse.Namespace) -> dict:
    return compact(
        {
            "page": args.page,
            "pageSize": args.page_size,
            "keyword": args.keyword,
            "stageId": args.stage_id,
            "status": args.status,
            "type": args.type,
            "priority": args.priority,
            "assigneeId": args.assignee_id,
            "sortBy": args.sort_by,
            "sortOrder": args.sort_order,
        }
    )


def rd_body(args: argparse.Namespace, values: dict) -> dict:
    body = compact(values)
    body.update(parse_body_json(getattr(args, "body_json", None)))
    return body


def run_rd(args: argparse.Namespace) -> dict:
    item_id = quote(getattr(args, "item_id", "") or "", safe="")
    if args.rd_command == "stages":
        return read_project(args, "/rd-stages")
    if args.rd_command == "list":
        return read_project(args, "/rd-items", rd_query(args))
    if args.rd_command == "get":
        return read_project(args, f"/rd-items/{item_id}")
    if args.rd_command in {"logs", "stage-history", "progress"}:
        return read_project(args, f"/rd-items/{item_id}/{args.rd_command}")
    if args.rd_command == "progress-history":
        return read_project(args, f"/rd-items/{item_id}/progress/history")
    if args.rd_command in {"start", "resume", "accept", "reopen"}:
        return write_personal(args, f"/rd-items/{item_id}/{args.rd_command}", "POST", "rd:transition:write", None, confirm_required=True)
    if args.rd_command == "block":
        body = rd_body(args, {"blockerReason": args.blocker_reason})
        return write_personal(args, f"/rd-items/{item_id}/block", "POST", "rd:transition:write", body, confirm_required=True)
    if args.rd_command == "complete":
        body = rd_body(args, {"reason": args.reason})
        return write_personal(args, f"/rd-items/{item_id}/complete", "POST", "rd:transition:write", body, confirm_required=True)
    if args.rd_command == "close":
        body = rd_body(args, {"reason": args.reason})
        return write_personal(args, f"/rd-items/{item_id}/close", "POST", "rd:transition:write", body, confirm_required=True)
    if args.rd_command == "advance-stage":
        body = rd_body(
            args,
            {
                "stageId": args.stage_id,
                "memberIds": args.member_id,
                "description": args.description,
                "planStartAt": args.plan_start_at,
                "planEndAt": args.plan_end_at,
            },
        )
        return write_personal(args, f"/rd-items/{item_id}/advance-stage", "POST", "rd:transition:write", body, confirm_required=True)
    if args.rd_command == "progress-update":
        body = rd_body(
            args,
            {
                "progress": args.progress,
                "note": args.note,
                "blockReason": args.block_reason,
                "resolveBlockId": args.resolve_block_id,
                "stageTaskId": args.stage_task_id,
            },
        )
        return write_personal(args, f"/rd-items/{item_id}/progress", "POST", "rd:transition:write", body, confirm_required=args.progress == 100)
    if args.rd_command == "update":
        body = rd_body(
            args,
            {
                "version": args.version,
                "title": args.title,
                "description": args.description,
                "stageId": args.stage_id,
                "type": args.type,
                "priority": args.priority,
                "memberIds": args.member_id,
                "verifierId": args.verifier_id,
                "planStartAt": args.plan_start_at,
                "planEndAt": args.plan_end_at,
                "stageDescription": args.stage_description,
            },
        )
        return write_personal(args, f"/rd-items/{item_id}", "PATCH", "rd:edit:write", body)
    raise ValueError(f"unknown rd command: {args.rd_command}")


def add_root_args(root: argparse.ArgumentParser) -> None:
    root.add_argument("--config", help=f"Config JSON path. Defaults to {CONFIG_ENV}, OpenCode config, or user config paths.")
    root.add_argument("--base-url", help=f"SL Hub V2 base URL. Defaults to config/env or {DEFAULT_BASE_URL}.")
    root.add_argument("--project", help="Configured project alias/name.")
    root.add_argument("--project-key", help="SL Hub V2 projectKey.")
    root.add_argument("--token", help="Operation token. Reads expect Project Token; writes expect Personal Token.")
    root.add_argument("--source", help="Audit source metadata for write operations.")


def add_issue_id(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--issue-id", required=True)


def add_item_id(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--item-id", required=True)


def add_confirm(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--confirm", action="store_true", help="Execute a transition write operation instead of previewing it.")


def add_body_json(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--body-json", help="Merge a JSON object into the request body for advanced fields.")


def build_parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Operate SL Hub V2 Issue and RD APIs with tokens.")
    add_root_args(root)
    subparsers = root.add_subparsers(dest="command", required=True)

    subparsers.add_parser("projects", help="List configured project aliases.")
    subparsers.add_parser("me", help="Read Personal Token identity.")
    subparsers.add_parser("capabilities", help="Read Personal Token project capabilities.")

    issue = subparsers.add_parser("issue", help="Issue read and write commands.")
    issue_sub = issue.add_subparsers(dest="issue_command", required=True)

    issue_list = issue_sub.add_parser("list")
    issue_list.add_argument("--page", type=int, default=1)
    issue_list.add_argument("--page-size", type=int, default=20)
    issue_list.add_argument("--keyword")
    issue_list.add_argument("--rd-item-id")
    issue_list.add_argument("--status", action="append")
    issue_list.add_argument("--types", action="append")
    issue_list.add_argument("--type")
    issue_list.add_argument("--priority", action="append")
    issue_list.add_argument("--assignee-id")
    issue_list.add_argument("--verifier-id")
    issue_list.add_argument("--sort-by", choices=["updatedAt", "createdAt"])
    issue_list.add_argument("--sort-order", choices=["desc", "asc"])

    for name in ("get", "logs", "comments", "participants", "attachments", "branches"):
        parser = issue_sub.add_parser(name)
        add_issue_id(parser)
    issue_sub.add_parser("members")

    parser = issue_sub.add_parser("comment")
    add_issue_id(parser)
    parser.add_argument("--content", required=True)
    parser.add_argument("--mention", action="append")

    parser = issue_sub.add_parser("assign")
    add_issue_id(parser)
    parser.add_argument("--assignee-id", required=True)

    parser = issue_sub.add_parser("claim")
    add_issue_id(parser)

    parser = issue_sub.add_parser("branch-create")
    add_issue_id(parser)
    parser.add_argument("--owner-user-id", required=True)
    parser.add_argument("--title", required=True)

    parser = issue_sub.add_parser("branch-start-mine")
    add_issue_id(parser)
    parser.add_argument("--title", required=True)

    parser = issue_sub.add_parser("branch-start")
    add_issue_id(parser)
    parser.add_argument("--branch-id", required=True)

    parser = issue_sub.add_parser("branch-complete")
    add_issue_id(parser)
    parser.add_argument("--branch-id", required=True)
    parser.add_argument("--summary")

    for name in ("start", "wait-update", "verify"):
        parser = issue_sub.add_parser(name)
        add_issue_id(parser)
        add_confirm(parser)

    parser = issue_sub.add_parser("resolve")
    add_issue_id(parser)
    parser.add_argument("--resolution-summary")
    add_confirm(parser)

    parser = issue_sub.add_parser("reopen")
    add_issue_id(parser)
    parser.add_argument("--remark")
    add_confirm(parser)

    parser = issue_sub.add_parser("close")
    add_issue_id(parser)
    parser.add_argument("--reason")
    parser.add_argument("--remark")
    add_confirm(parser)

    parser = issue_sub.add_parser("participant-add")
    add_issue_id(parser)
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--task-title")

    parser = issue_sub.add_parser("participant-remove")
    add_issue_id(parser)
    parser.add_argument("--participant-id", required=True)

    rd = subparsers.add_parser("rd", help="RD read and write commands.")
    rd_sub = rd.add_subparsers(dest="rd_command", required=True)
    rd_sub.add_parser("stages")

    rd_list = rd_sub.add_parser("list")
    rd_list.add_argument("--page", type=int, default=1)
    rd_list.add_argument("--page-size", type=int, default=20)
    rd_list.add_argument("--keyword")
    rd_list.add_argument("--stage-id")
    rd_list.add_argument("--status", action="append")
    rd_list.add_argument("--type", action="append")
    rd_list.add_argument("--priority", action="append")
    rd_list.add_argument("--assignee-id")
    rd_list.add_argument("--sort-by", choices=["updatedAt", "createdAt"])
    rd_list.add_argument("--sort-order", choices=["desc", "asc"])

    for name in ("get", "logs", "stage-history", "progress", "progress-history"):
        parser = rd_sub.add_parser(name)
        add_item_id(parser)

    for name in ("start", "resume", "accept", "reopen"):
        parser = rd_sub.add_parser(name)
        add_item_id(parser)
        add_confirm(parser)

    parser = rd_sub.add_parser("block")
    add_item_id(parser)
    parser.add_argument("--blocker-reason")
    add_body_json(parser)
    add_confirm(parser)

    parser = rd_sub.add_parser("complete")
    add_item_id(parser)
    parser.add_argument("--reason")
    add_body_json(parser)
    add_confirm(parser)

    parser = rd_sub.add_parser("close")
    add_item_id(parser)
    parser.add_argument("--reason")
    add_body_json(parser)
    add_confirm(parser)

    parser = rd_sub.add_parser("advance-stage")
    add_item_id(parser)
    parser.add_argument("--stage-id", required=True)
    parser.add_argument("--member-id", action="append")
    parser.add_argument("--description")
    parser.add_argument("--plan-start-at")
    parser.add_argument("--plan-end-at")
    add_body_json(parser)
    add_confirm(parser)

    parser = rd_sub.add_parser("progress-update")
    add_item_id(parser)
    parser.add_argument("--progress", type=int, required=True)
    parser.add_argument("--note")
    parser.add_argument("--block-reason")
    parser.add_argument("--resolve-block-id")
    parser.add_argument("--stage-task-id")
    add_body_json(parser)
    add_confirm(parser)

    parser = rd_sub.add_parser("update")
    add_item_id(parser)
    parser.add_argument("--version", type=int, required=True)
    parser.add_argument("--title")
    parser.add_argument("--description")
    parser.add_argument("--stage-id")
    parser.add_argument("--type")
    parser.add_argument("--priority")
    parser.add_argument("--member-id", action="append")
    parser.add_argument("--verifier-id")
    parser.add_argument("--plan-start-at")
    parser.add_argument("--plan-end-at")
    parser.add_argument("--stage-description")
    add_body_json(parser)

    return root


def run(args: argparse.Namespace) -> dict:
    if args.command == "projects":
        return list_configured_projects(args)
    if args.command == "me":
        return run_me(args)
    if args.command == "capabilities":
        return run_capabilities(args)
    if args.command == "issue":
        return run_issue(args)
    if args.command == "rd":
        return run_rd(args)
    raise ValueError(f"unknown command: {args.command}")


def main() -> int:
    args = build_parser().parse_args()
    try:
        print_json(run(args))
        return 0
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
