#!/bin/sh

echo "Executing \`run_tests\`."

export DEBIAN_FRONTEND=noninteractive
TEST_ARGUMENT="${*:-"--mayan-apps --no-exclude"}"

apt-get update
apt-get install -y --no-install-recommends gcc python3-dev tesseract-ocr-deu

"${MAYAN_PIP_BIN}" install --requirement "${MAYAN_INSTALL_DIR}/testing-base.txt"

exec env MAYAN_TESTS_SELENIUM_SKIP=true \
	"${MAYAN_BIN}" test "${TEST_ARGUMENT}" --settings=mayan.settings.testing
