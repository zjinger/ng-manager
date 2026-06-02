#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://192.168.1.31:7008"


def normalize_base_url(value: str | None) -> str:
    normalized = (value or os.environ.get("HUB_V2_BASE_URL") or DEFAULT_BASE_URL).strip().rstrip("/")
    if not normalized:
        raise ValueError("base url is required")
    return normalized


def read_token(args: argparse.Namespace) -> str:
    token = args.token or os.environ.get(args.token_env or "", "")
    token = token.strip()
    if not token:
        raise ValueError("personal token is required; pass --token or set --token-env")
    return token


def read_content(args: argparse.Namespace) -> str | None:
    content = getattr(args, "content", None)
    content_file = getattr(args, "content_file", None)
    if content is not None and content_file is not None:
        raise ValueError("pass only one of --content or --content-file")
    if content_file is not None:
        return Path(content_file).read_text(encoding="utf-8")
    return content


def request_json(url: str, token: str, method: str, body: dict) -> dict:
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urlopen(request, timeout=30) as response:
            response_payload = response.read().decode("utf-8")
            return json.loads(response_payload)
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {response_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"request failed: {exc.reason}") from exc


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def tags_from_args(args: argparse.Namespace) -> list[str] | None:
    tags = getattr(args, "tag", None)
    if not tags:
        return None
    return [tag for tag in (item.strip() for item in tags) if tag]


def compact_body(body: dict) -> dict:
    return {key: value for key, value in body.items() if value is not None}


def project_docs_url(args: argparse.Namespace, suffix: str = "") -> str:
    base_url = normalize_base_url(args.base_url)
    project_key = quote(args.project_key.strip(), safe="")
    return f"{base_url}/api/personal/projects/{project_key}/docs{suffix}"


def create_doc(args: argparse.Namespace, token: str) -> dict:
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
            "source": args.source,
        }
    )
    return request_json(project_docs_url(args), token, "POST", body)


def update_doc(args: argparse.Namespace, token: str) -> dict:
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
            "source": args.source,
        }
    )
    if not body:
        raise ValueError("update requires at least one field")
    return request_json(project_docs_url(args, f"/{doc_id}"), token, "PATCH", body)


def publish_doc(args: argparse.Namespace, token: str) -> dict:
    doc_id = quote(args.doc_id.strip(), safe="")
    body = compact_body({"source": args.source})
    return request_json(project_docs_url(args, f"/{doc_id}/publish"), token, "POST", body)


def run(args: argparse.Namespace) -> int:
    token = read_token(args)
    if args.command == "create":
        payload = create_doc(args, token)
    elif args.command == "update":
        payload = update_doc(args, token)
    elif args.command == "publish":
        payload = publish_doc(args, token)
    else:
        raise ValueError(f"unsupported command: {args.command}")
    if args.id_only:
        doc_id = payload.get("data", {}).get("id")
        if not doc_id:
            raise ValueError("response does not contain data.id")
        print(doc_id)
        return 0
    print_json(payload)
    return 0


def add_common_doc_fields(parser: argparse.ArgumentParser, require_title: bool) -> None:
    parser.add_argument("--title", required=require_title)
    parser.add_argument("--slug")
    parser.add_argument("--content")
    parser.add_argument("--content-file")
    parser.add_argument("--category-id")
    parser.add_argument("--category")
    parser.add_argument("--summary")
    parser.add_argument("--tag", action="append", help="Repeatable tag value for audit metadata")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Write Hub V2 project documents with a Personal Token.")
    root.add_argument("--base-url", help=f"Hub V2 base URL. Defaults to HUB_V2_BASE_URL or {DEFAULT_BASE_URL}")
    root.add_argument("--project-key", required=True, help="Hub V2 projectKey")
    root.add_argument("--token", help="Personal Token. Prefer --token-env for normal use.")
    root.add_argument("--token-env", default="HUB_V2_PERSONAL_TOKEN", help="Environment variable containing the token")
    root.add_argument("--source", default="agent", help="Audit source metadata")
    root.add_argument("--id-only", action="store_true", help="Print only data.id")
    subparsers = root.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create a document draft")
    add_common_doc_fields(create_parser, require_title=True)
    create_parser.add_argument("--status", default="draft", choices=["draft"])

    update_parser = subparsers.add_parser("update", help="Update an existing document")
    update_parser.add_argument("--doc-id", required=True)
    add_common_doc_fields(update_parser, require_title=False)
    update_parser.add_argument("--version")

    publish_parser = subparsers.add_parser("publish", help="Publish a document")
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
