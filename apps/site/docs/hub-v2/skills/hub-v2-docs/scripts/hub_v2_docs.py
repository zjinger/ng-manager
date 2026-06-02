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
CONFIG_ENV = "HUB_V2_DOCS_CONFIG"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def default_config_paths() -> list[Path]:
    home = Path.home()
    return [
        home / ".openclaw" / "hub-v2-docs.json",
        home / ".codex" / "hub-v2-docs.json",
        home / ".hub-v2-docs.json",
    ]


def load_config(path_value: str | None) -> dict:
    paths: list[Path] = []
    if path_value:
        paths.append(Path(path_value).expanduser())
    elif os.environ.get(CONFIG_ENV):
        paths.append(Path(os.environ[CONFIG_ENV]).expanduser())
    else:
        paths.extend(default_config_paths())
    for path in paths:
        config = load_json(path)
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


def resolve_context(args: argparse.Namespace, token_kind: str) -> dict:
    config = load_config(args.config)
    base_url = require_value(
        "base_url",
        resolve_value(args.base_url, "HUB_V2_BASE_URL", config, "base_url", "baseUrl", DEFAULT_BASE_URL),
    ).rstrip("/")
    project_key = require_value(
        "project_key",
        resolve_value(args.project_key, "HUB_V2_PROJECT_KEY", config, "project_key", "projectKey"),
    )
    if token_kind == "project":
        token = resolve_value(args.token, "HUB_V2_PROJECT_TOKEN", config, "project_token", "projectToken")
        token_name = "project_token"
    elif token_kind == "personal":
        token = resolve_value(args.token, "HUB_V2_PERSONAL_TOKEN", config, "personal_token", "personalToken")
        token_name = "personal_token"
    else:
        raise ValueError(f"unknown token kind: {token_kind}")
    source = resolve_value(args.source, "HUB_V2_DOCS_SOURCE", config, "source", "source", "agent")
    return {
        "base_url": base_url,
        "project_key": project_key,
        "token": require_value(token_name, token),
        "source": source or "agent",
    }


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
    root.add_argument("--config", help=f"Config JSON path. Defaults to {CONFIG_ENV} or user config paths.")
    root.add_argument("--base-url", help=f"Hub V2 base URL. Defaults to config/env or {DEFAULT_BASE_URL}.")
    root.add_argument("--project-key", help="Hub V2 projectKey. Defaults to config or HUB_V2_PROJECT_KEY.")
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
    root = argparse.ArgumentParser(description="Read and write Hub V2 project documents.")
    add_common_root_args(root)
    subparsers = root.add_subparsers(dest="command", required=True)

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
