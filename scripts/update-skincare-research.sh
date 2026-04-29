#!/bin/bash

echo "=== Skincare Research Data Update ==="
echo

echo "Step 1: Fetching fresh posts and comments from r/SkincareAddiction..."
python3 scripts/reddit-scraper.py

if [ $? -ne 0 ]; then
    echo "ERROR: Scraper failed"
    exit 1
fi

echo
echo "Step 2: Cleaning and organizing data..."
python3 scripts/clean-reddit-data.py

if [ $? -ne 0 ]; then
    echo "ERROR: Cleaning failed"
    exit 1
fi

echo
echo "=== Complete ==="
echo "Data saved to brain/roman/skincare-research/cleaned/"
