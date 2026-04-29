#!/usr/bin/env python3
"""
Reddit JSON Endpoint Scraper
Fetches posts and comments from r/SkincareAddiction using Reddit's public JSON endpoints.
No authentication required.

Usage:
  python scripts/reddit-scraper.py

Output:
  Saves raw data to:
    - brain/roman/skincare-research/raw-posts-YYYY-MM-DD.json
    - brain/roman/skincare-research/raw-comments-YYYY-MM-DD.json
"""

import json
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict

# Configuration
SUBREDDIT = "SkincareAddiction"
BASE_URL = f"https://www.reddit.com/r/{SUBREDDIT}"
USER_AGENT = "roman-skincare-research/1.0 by Fuzzy_Preparation_90"
RATE_LIMIT_DELAY = 0.5  # seconds between requests
REQUEST_TIMEOUT = 10  # seconds


def fetch_posts(limit: int = 100) -> List[Dict]:
    """
    Fetch posts from r/SkincareAddiction.

    Args:
        limit: Maximum number of posts to fetch (default 100)

    Returns:
        List of post dictionaries with: id, title, author, score, created_utc, url, num_comments
    """
    posts = []
    after = None
    headers = {"User-Agent": USER_AGENT}

    print(f"Fetching posts from r/{SUBREDDIT}...")

    while len(posts) < limit:
        try:
            # Build URL with pagination
            url = f"{BASE_URL}.json"
            params = {"limit": 100}
            if after:
                params["after"] = after

            print(f"  Fetching batch (offset: {len(posts)})...", end=" ", flush=True)
            response = requests.get(
                url,
                params=params,
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()

            data = response.json()
            children = data.get("data", {}).get("children", [])

            if not children:
                print("(no more posts)")
                break

            print(f"({len(children)} posts)")

            for child in children:
                if len(posts) >= limit:
                    break

                post_data = child.get("data", {})
                created_utc = post_data.get("created_utc", 0)

                # Convert Unix timestamp to readable date
                created_date = datetime.utcfromtimestamp(created_utc).isoformat()

                post = {
                    "id": post_data.get("id"),
                    "title": post_data.get("title"),
                    "author": post_data.get("author"),
                    "score": post_data.get("score"),
                    "created_utc": created_utc,
                    "created_date": created_date,
                    "url": post_data.get("url"),
                    "num_comments": post_data.get("num_comments"),
                }
                posts.append(post)

            # Get "after" token for pagination
            after = data.get("data", {}).get("after")

            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)

        except requests.RequestException as e:
            print(f"ERROR fetching posts: {e}")
            break

    print(f"Total posts fetched: {len(posts)}\n")
    return posts


def fetch_comments_for_post(post_id: str) -> List[Dict]:
    """
    Fetch all comments for a specific post.

    Args:
        post_id: Reddit post ID

    Returns:
        List of comment dictionaries with: id, post_id, author, body, score, created_utc, created_date, parent_id
    """
    comments = []
    headers = {"User-Agent": USER_AGENT}

    try:
        url = f"{BASE_URL}/comments/{post_id}.json"
        response = requests.get(
            url,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()

        data = response.json()

        # Comments are in the second element of the response
        if isinstance(data, list) and len(data) > 1:
            comments_data = data[1].get("data", {}).get("children", [])

            for child in comments_data:
                child_data = child.get("data", {})

                # Skip deleted/removed comments and non-comment items
                if child.get("kind") != "t1" or not child_data.get("body"):
                    continue

                created_utc = child_data.get("created_utc", 0)
                created_date = datetime.utcfromtimestamp(created_utc).isoformat()

                comment = {
                    "id": child_data.get("id"),
                    "post_id": post_id,
                    "author": child_data.get("author"),
                    "body": child_data.get("body"),
                    "score": child_data.get("score"),
                    "created_utc": created_utc,
                    "created_date": created_date,
                    "parent_id": child_data.get("parent_id"),
                }
                comments.append(comment)

        # Rate limiting
        time.sleep(RATE_LIMIT_DELAY)

    except requests.RequestException as e:
        print(f"  ERROR fetching comments for post {post_id}: {e}")

    return comments


def save_json(data: List[Dict], filename: str, output_dir: Path) -> None:
    """Save data to JSON file with UTF-8 encoding."""
    output_dir.mkdir(parents=True, exist_ok=True)
    filepath = output_dir / filename

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved: {filepath}")


def main():
    """Main scraper workflow."""
    print("=" * 70)
    print("Reddit JSON Scraper — r/SkincareAddiction")
    print("=" * 70)
    print()

    # Set output directory
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "brain" / "roman" / "skincare-research"

    # Generate timestamp for filenames
    today = datetime.utcnow().strftime("%Y-%m-%d")
    posts_filename = f"raw-posts-{today}.json"
    comments_filename = f"raw-comments-{today}.json"

    # Fetch posts
    posts = fetch_posts(limit=100)

    if not posts:
        print("No posts fetched. Exiting.")
        return

    # Fetch comments for each post
    all_comments = []
    print(f"Fetching comments for {len(posts)} posts...")

    for idx, post in enumerate(posts, 1):
        post_id = post["id"]
        print(f"  [{idx}/{len(posts)}] {post_id}: {post['title'][:50]}...", end=" ")

        post_comments = fetch_comments_for_post(post_id)
        all_comments.extend(post_comments)

        print(f"({len(post_comments)} comments)")

    print(f"\nTotal comments fetched: {len(all_comments)}\n")

    # Save data
    print("=" * 70)
    print("Saving results...")
    print("=" * 70)
    save_json(posts, posts_filename, output_dir)
    save_json(all_comments, comments_filename, output_dir)

    # Print summary
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Posts: {len(posts)}")
    print(f"Comments: {len(all_comments)}")
    print(f"Output directory: {output_dir}")
    print()


if __name__ == "__main__":
    main()
