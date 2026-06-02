#!/usr/bin/env python3
import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen


def normalize_base_url(value: str) -> str:
    normalized = value.strip().rstrip("/")
    if not normalized:
        raise ValueError("base url is required")
    return normalized


def read_token(args: argparse.Namespace) -> str:
    token = args.token or os.environ.get(args.token_env or "", "")
    token = token.strip()
    if not token:
        raise ValueError("project token is required; pass --token or set --token-env")
    return token


def request_json(url: str, token: str) -> dict:
    request = Request(url, headers={"Authorization": f"Bearer {token}"}, method="GET")
    try:
        with urlopen(request, timeout=30) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"request failed: {exc.reason}") from exc


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def build_url(args: argparse.Namespace) -> str:
    base_url = normalize_base_url(args.base_url)
    project_key = quote(args.project_key.strip(), safe="")
    if args.command == "list":
        query = {
            "page": args.page,
            "pageSize": args.page_size,
        }
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
        return f"{base_url}/api/token/projects/{project_key}/docs?{urlencode(query)}"
    if args.command == "get":
        doc_id = quote(args.doc_id.strip(), safe="")
        return f"{base_url}/api/token/projects/{project_key}/docs/{doc_id}"
    if args.command == "slug":
        slug = quote(args.slug.strip(), safe="")
        return f"{base_url}/api/token/projects/{project_key}/docs/by-slug/{slug}"
    raise ValueError(f"unsupported command: {args.command}")


def run(args: argparse.Namespace) -> int:
    token = read_token(args)
    payload = request_json(build_url(args), token)
    if args.content_only:
        content = payload.get("data", {}).get("contentMd")
        if content is None:
            raise ValueError("response does not contain data.contentMd")
        print(content)
        return 0
    print_json(payload)
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Read Hub V2 project documents with a Project Token.")
    root.add_argument("--base-url", required=True, help="Hub V2 base URL, for example http://192.168.1.31:7008")
    root.add_argument("--project-key", required=True, help="Hub V2 projectKey")
    root.add_argument("--token", help="Project Token. Prefer --token-env for normal use.")
    root.add_argument("--token-env", default="HUB_V2_PROJECT_TOKEN", help="Environment variable containing the token")
    root.add_argument("--content-only", action="store_true", help="Print only data.contentMd for detail reads")
    subparsers = root.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List project documents")
    list_parser.add_argument("--page", type=int, default=1)
    list_parser.add_argument("--page-size", type=int, default=20)
    list_parser.add_argument("--status-group", default="active", choices=["active"])
    list_parser.add_argument("--status", choices=["draft", "published", "archived"])
    list_parser.add_argument("--keyword")
    list_parser.add_argument("--category")
    list_parser.add_argument("--category-id")

    get_parser = subparsers.add_parser("get", help="Read document detail by id")
    get_parser.add_argument("--doc-id", required=True)

    slug_parser = subparsers.add_parser("slug", help="Read document detail by slug")
    slug_parser.add_argument("--slug", required=True)
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
