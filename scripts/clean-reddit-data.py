#!/usr/bin/env python3
"""
Clean Reddit comment data by removing duplicates, filtering deleted comments,
normalizing text, and organizing by date.

Reads from: brain/roman/skincare-research/raw-comments-*.json
Writes to: brain/roman/skincare-research/cleaned/
"""

import atexit
import json
import re
import os
import uuid
from pathlib import Path
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv
from posthog import Posthog

load_dotenv()

_posthog = Posthog(
    os.environ.get("POSTHOG_PROJECT_TOKEN", ""),
    host=os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com"),
    enable_exception_autocapture=True,
) if os.environ.get("POSTHOG_PROJECT_TOKEN") else None

if _posthog:
    atexit.register(_posthog.shutdown)

_DISTINCT_ID = f"script-{uuid.uuid5(uuid.NAMESPACE_DNS, 'clean-reddit-data')}"


def clean_text(text):
    """
    Clean comment text by removing URLs, markdown links, and normalizing whitespace.

    Args:
        text: Raw comment body string

    Returns:
        Cleaned text string
    """
    if not text or not isinstance(text, str):
        return ""

    # Remove markdown links: [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)

    # Remove URLs: http:// and https://
    text = re.sub(r'https?://[^\s]+', '', text)

    # Normalize whitespace: collapse multiple spaces to single space
    text = re.sub(r'\s+', ' ', text)

    # Trim leading/trailing whitespace
    text = text.strip()

    return text


def load_raw_comments():
    """
    Find and load the latest raw comments JSON file.

    Returns:
        List of comment dicts, or empty list if no file found
    """
    skincare_research_dir = Path(__file__).parent.parent / "brain" / "roman" / "skincare-research"

    if not skincare_research_dir.exists():
        print(f"Error: Directory not found: {skincare_research_dir}")
        return []

    # Find all raw-comments-*.json files
    raw_files = sorted(skincare_research_dir.glob("raw-comments-*.json"), reverse=True)

    if not raw_files:
        print(f"Error: No raw-comments-*.json files found in {skincare_research_dir}")
        return []

    latest_file = raw_files[0]
    print(f"Loading raw comments from: {latest_file.name}")

    try:
        with open(latest_file, 'r', encoding='utf-8') as f:
            comments = json.load(f)
        print(f"✓ Loaded {len(comments)} raw comments")
        return comments
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {latest_file.name}: {e}")
        return []
    except Exception as e:
        print(f"Error reading file: {e}")
        return []


def clean_comments(raw_comments):
    """
    Clean, deduplicate, and filter comments.

    Args:
        raw_comments: List of raw comment dicts from JSON

    Returns:
        List of cleaned comment dicts
    """
    seen_ids = set()
    cleaned = []

    for comment in raw_comments:
        # Extract fields with safe defaults
        comment_id = comment.get("id", "")

        # Skip if we've seen this ID before (deduplicate)
        if comment_id in seen_ids:
            continue
        seen_ids.add(comment_id)

        # Clean the comment text
        body = comment.get("body", "")
        cleaned_body = clean_text(body)

        # Filter: skip empty comments or deleted/removed
        if not cleaned_body:
            continue

        if cleaned_body.lower() in ["[deleted]", "[removed]"]:
            continue

        # Build cleaned comment with required fields
        cleaned_comment = {
            "id": comment_id,
            "author": comment.get("author", ""),
            "text": cleaned_body,
            "score": comment.get("score", 0),
            "date": comment.get("created_date", ""),
            "post_id": comment.get("post_id", "")
        }

        cleaned.append(cleaned_comment)

    print(f"✓ Cleaned {len(cleaned)} comments (removed {len(raw_comments) - len(cleaned)} duplicates/filtered)")
    return cleaned


def save_by_date(cleaned_comments):
    """
    Group cleaned comments by date and save to separate files.

    Args:
        cleaned_comments: List of cleaned comment dicts
    """
    output_dir = Path(__file__).parent.parent / "brain" / "roman" / "skincare-research" / "cleaned"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Group by date
    by_date = defaultdict(list)
    for comment in cleaned_comments:
        date_str = comment.get("date", "")
        if date_str:
            # Extract YYYY-MM-DD from ISO 8601 timestamp
            date_only = date_str.split("T")[0]
            by_date[date_only].append(comment)

    # Save each date to separate file
    for date_str in sorted(by_date.keys()):
        comments = by_date[date_str]
        filename = output_dir / f"comments-{date_str}.json"

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(comments, f, indent=2, ensure_ascii=False)

        print(f"  → {filename.name}: {len(comments)} comments")

    print(f"✓ Saved {len(by_date)} date-organized files")
    return len(by_date)


def main():
    """Main script execution."""
    print("=" * 60)
    print("Reddit Comment Data Cleaning")
    print("=" * 60)

    # Load raw comments
    raw_comments = load_raw_comments()
    if not raw_comments:
        return

    initial_count = len(raw_comments)

    # Clean and filter
    cleaned_comments = clean_comments(raw_comments)
    final_count = len(cleaned_comments)
    removed_count = initial_count - final_count

    # Save by date
    date_files_count = save_by_date(cleaned_comments)

    # Save full cleaned dataset
    output_dir = Path(__file__).parent.parent / "brain" / "roman" / "skincare-research" / "cleaned"
    all_comments_file = output_dir / "all-comments-cleaned.json"

    with open(all_comments_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_comments, f, indent=2, ensure_ascii=False)

    print(f"✓ Saved all cleaned comments to: all-comments-cleaned.json")

    # Summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Initial comments:      {initial_count}")
    print(f"Final comments:        {final_count}")
    print(f"Removed:               {removed_count} ({removed_count/initial_count*100:.1f}%)")
    print(f"Date-organized files:  {date_files_count}")
    print(f"\nOutput directory: brain/roman/skincare-research/cleaned/")
    print("=" * 60)

    if _posthog:
        _posthog.capture(
            distinct_id=_DISTINCT_ID,
            event="reddit_data_cleaned",
            properties={
                "initial_count": initial_count,
                "final_count": final_count,
                "removed_count": removed_count,
                "date_files_count": date_files_count,
            },
        )

    # Sample validation
    if cleaned_comments:
        sample = cleaned_comments[0]
        print("\nSample comment (first):")
        print(f"  id:      {sample.get('id')}")
        print(f"  author:  {sample.get('author')}")
        print(f"  score:   {sample.get('score')}")
        print(f"  date:    {sample.get('date')}")
        print(f"  post_id: {sample.get('post_id')}")
        print(f"  text:    {sample.get('text')[:80]}...")


if __name__ == "__main__":
    main()
