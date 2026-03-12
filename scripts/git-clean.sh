#!/bin/sh

echo "Checking for removed branches.."

# Sync
if ! git fetch -p; then
    echo "Error: 'git fetch' failed."
    exit 1
fi

# Standard git command to find branches that have been removed from the remote repository
# LIST=$(git branch -vv | awk '/: gone]/ {print $1}')
LIST=$(git branch -vv | grep ': gone]' | awk '{print $1}')

if [ -z "$LIST" ]; then
    echo "Everything is up to date!"
    exit 0
fi

ERRORS=$(echo "$LIST" | xargs git branch -d 2>&1)

if [ $? -ne 0 ]; then
    echo "Warning: Some branches couldn't be deleted (probably unmerged changes)."
    echo "$ERRORS" | grep -E "error|detail" || echo "$ERRORS"
else
    COUNT=$(echo "$LIST" | wc -l | tr -d ' ')
    echo "Successfully removed $COUNT branches!"
fi
