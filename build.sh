#!/bin/bash

# ANSI color codes for better visual output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}          Data Deck Application Builder         ${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
if ! command_exists node; then
  echo -e "${RED}Error: Node.js is not installed on your system.${NC}"
  echo -e "${YELLOW}Please install Node.js from https://nodejs.org/ (version 16 or higher recommended)${NC}"
  echo -e "After installing, restart this script."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR_VERSION -lt 16 ]; then
  echo -e "${YELLOW}Warning: You're using Node.js version $NODE_VERSION. We recommend version 16 or higher.${NC}"
  echo -e "Do you want to continue anyway? [y/N]"
  read -r answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo -e "Exiting. Please upgrade Node.js and try again."
    exit 1
  fi
else
  echo -e "${GREEN}✓ Using Node.js version $NODE_VERSION${NC}"
fi

# Check if npm is installed
if ! command_exists npm; then
  echo -e "${RED}Error: npm is not installed on your system.${NC}"
  echo -e "${YELLOW}npm should be included with Node.js installation.${NC}"
  echo -e "Try reinstalling Node.js from https://nodejs.org/"
  exit 1
else
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✓ Using npm version $NPM_VERSION${NC}"
fi

# Run the build script directly with node
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
JS_SCRIPT="$SCRIPT_DIR/scripts/build-app.js"

if [ ! -f "$JS_SCRIPT" ]; then
  echo -e "${RED}Error: Build script not found at $JS_SCRIPT${NC}"
  exit 1
fi

echo -e "${BLUE}Starting build process...${NC}"
echo

# Make the script executable (just in case)
chmod +x "$JS_SCRIPT"

# Execute the JavaScript build script directly
node "$JS_SCRIPT"

# Check exit status
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Build process completed successfully!${NC}"
else
  echo -e "${RED}Build process failed.${NC}"
  exit 1
fi 