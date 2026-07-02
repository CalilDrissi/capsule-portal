#!make

include makefiles/config-loader.mk

ifndef MODULE
override MODULE = --mayan-apps
endif

ifdef TAG
override ARGUMENT_TAG = --tag=$(TAG)
endif

ifndef SKIPMIGRATIONS
override SKIPMIGRATIONS = --skip-migrations
endif

ifndef SETTINGS
override SETTINGS = mayan.settings.testing.development
endif

ifeq ($(origin APT_PROXY), undefined)
	ifneq ($(origin APT_PROXY_IP), undefined)
		APT_PROXY = "$(APT_PROXY_IP):3142"
	endif
endif

ifeq ($(origin PIP_INDEX_URL), undefined)
	ifneq ($(origin PIP_PROXY_IP), undefined)
		PIP_INDEX_URL = "http://$(PIP_PROXY_IP):3141/root/pypi/+simple/"
	endif
endif

ifeq ($(origin PIP_TRUSTED_HOST), undefined)
	PIP_TRUSTED_HOST = "$(PIP_PROXY_IP)"
endif

COMMAND_SENTRY = \
	if [ $(SENTRY_DSN) ]; then \
	export MAYAN_PLATFORMS_CLIENT_BACKEND_ENABLED='["mayan.apps.platforms_sentry.client_backends.ClientBackendSentry"]'; \
	export MAYAN_PLATFORMS_CLIENT_BACKEND_ARGUMENTS='{"mayan.apps.platforms_sentry.client_backends.ClientBackendSentry":{"dsn":"$(SENTRY_DSN)","environment":"development"}}'; \
	fi

COMMAND_TEST = ./manage.py test $(MODULE) --settings=$(SETTINGS) $(SKIPMIGRATIONS) $(DEBUG) $(ARGUMENTS) $(ARGUMENT_TAG)
COMMAND_TEST_MIGRATIONS = ./manage.py test $(MODULE) --no-exclude --settings=$(SETTINGS) --tag=migration_test $(DEBUG) $(ARGUMENTS)

.PHONY: clean clean-pyc clean-build default help test

default:
	@echo "No default target."
	@echo "Run: make help for a list of targets."

help:
	@echo "Usage: make <target>\n"
	@awk 'BEGIN {FS = ":.*##"} /^[0-9a-zA-Z_-]+:.*?## / { printf "  * %-40s -%s\n", $$1, $$2 }' $(MAKEFILE_LIST)|sort

# Cleaning

clean: ## Remove Python and build artifacts.
clean: clean-build clean-pyc

clean-build: ## Remove build artifacts.
	rm --force --recursive build/
	rm --force --recursive dist/
	rm --force --recursive *.egg-info

clean-pyc: ## Remove Python artifacts.
	find . -name '*.pyc' -exec rm --force {} +
	find . -name '*.pyo' -exec rm --force {} +
	find . -name '*~' -exec rm --force {} +
	find . -name '__pycache__' -exec rm --force --recursive {} +

# Testing

_test-command:
	$(COMMAND_TEST)

test: ## MODULE=<python module name> - Run tests for a single app, module or test class.
test: clean-pyc _test-command

test-debug: ## MODULE=<python module name> - Run tests for a single app, module or test class, in debug mode.
test-debug: DEBUG=--debug-mode
test-debug: clean-pyc _test-command

test-all: ## Run all tests.
test-all: clean-pyc _test-command

test-all-debug: ## Run all tests in debug mode.
test-all-debug: DEBUG=--debug-mode
test-all-debug: clean-pyc _test-command

test-with-mysql: ## MODULE=<python module name> - Run tests for a single app, module or test class against a MySQL database container.
test-with-mysql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.mysql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST)

test-all-with-mysql: ## Run all tests against a MySQL database container.
test-all-with-mysql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.mysql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST)

test-with-postgresql: ## MODULE=<python module name> - Run tests for a single app, module or test class against a PostgreSQL database container.
test-with-postgresql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST)

test-all-with-postgresql: ## Run all tests against a PostgreSQL database container.
test-all-with-postgresql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST)

# Migrations

_test-migrations:
_test-migrations: ARGUMENTS=--no-exclude --tag=migration_test
_test-migrations: SKIPMIGRATIONS=
_test-migrations: clean-pyc _test-command

test-migrations: ## Run specific migration tests.
test-migrations: _test-migrations

test-migrations-all: ## Run all migration tests.
test-migrations-all: _test-migrations

test-migrations-all-with-mysql: ## Run all migration tests against a MySQL database container.
test-migrations-all-with-mysql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.mysql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST_MIGRATIONS)

test-migrations-all-with-postgresql: ## Run all migration tests against a PostgreSQL database container.
test-migrations-all-with-postgresql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST_MIGRATIONS)

test-migrations-with-postgresql: ## MODULE=<python module name> - Run migration tests for a single app, module or test class against a PostgreSQL database container.
test-migrations-with-postgresql:
	export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	$(COMMAND_TEST_MIGRATIONS)

# Coverage

coverage-run: ## Run all tests and measure code execution.
coverage-run: clean-pyc
	coverage run $(COMMAND_TEST)

coverage-html: ## Create the coverage HTML report. Run execute coverage-run first.
coverage-html:
	coverage html

# Documentation

docs-app-documentation-generate: ## Collect app documentation into the docs folder
docs-app-documentation-generate:
	./contrib/scripts/app_documentation_generator.py

docs-html: ## Run the html documentation target. Use optional FILENAMES to specific which files to build.
docs-html: docs-app-documentation-generate
	cd docs;make html

docs-spellcheck: ## Spellcheck the documentation.
	cd docs;sphinx-build -b spelling -d _build/ . _build/spelling

# Releases

version-increase: ## Increase the version number of the entire project's files.
	@VERSION_BASE=`grep "__version__ =" mayan/__init__.py| cut -d\' -f 2|./contrib/scripts/increase_version.py - $(PART)`; \
	VERSION=`mayan/apps/dependencies/versions.py $${VERSION_BASE} upstream`; \
	VERSION_PYTHON=`if [ -z "${CONFIG_LOCAL_VERSION}" ]; then echo "$${VERSION}"; else echo "$${VERSION}+${CONFIG_LOCAL_VERSION}"; fi`; \
	sed -i -e "s/__version__ = '[0-9\.a-zA-Z\+]*'/__version__ = '$$VERSION_PYTHON'/g" mayan/__init__.py; \
	make versions-update; \
	make python-setup-py-generate

versions-update: ## Update the version number of the entire project's files.
versions-update: config-env-copy
	@VERSION_BASE=`grep "__version__ =" mayan/__init__.py| cut -d\' -f 2`; \
	VERSION=`mayan/apps/dependencies/versions.py $${VERSION_BASE} upstream;` \
	VERSION_PYTHON=`if [ -z "${CONFIG_LOCAL_VERSION}" ]; then echo "$${VERSION}"; else echo "$${VERSION}+${CONFIG_LOCAL_VERSION}"; fi`; \
	VERSION_DOCKER=`if [ -z "${CONFIG_LOCAL_VERSION}" ]; then echo "$${VERSION}"; else echo "$${VERSION}-${CONFIG_LOCAL_VERSION}"; fi`; \
	BUILD=`echo $$VERSION_PYTHON|awk '{split($$VERSION_PYTHON,a,"."); printf("0x%02d%02d%02d\n", a[1],a[2], a[3])}'`; \
	sed -i -e "s/__build__ = 0x[0-9]*/__build__ = $${BUILD}/g" mayan/__init__.py; \
	sed -i -e "s/__version__ = '[0-9\.a-zA-Z\+]*'/__version__ = '$$VERSION_PYTHON'/g" mayan/__init__.py; \
	echo $$VERSION_DOCKER > docker/rootfs/version

# Dev server

manage: ## Run a command with the development settings.
	./manage.py $(filter-out $@,$(MAKECMDGOALS)) --settings=mayan.settings.development

manage-with-mysql: ## Run the development server using a Docker PostgreSQL container.
	@export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.mysql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	./manage.py $(filter-out $@,$(MAKECMDGOALS)) --settings=mayan.settings.development

manage-with-postgresql: ## Run the development server using a Docker PostgreSQL container.
	@export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	./manage.py $(filter-out $@,$(MAKECMDGOALS)) --settings=mayan.settings.development

runserver: ## Run the development server.
	$(COMMAND_SENTRY); ./manage.py runserver --settings=mayan.settings.development $(ADDRPORT)

runserver-plus: ## Run the Django extension's development server.
	$(COMMAND_SENTRY); ./manage.py runserver_plus --settings=mayan.settings.development $(ADDRPORT)

shell-plus: ## Run the shell_plus command.
	./manage.py shell_plus --settings=mayan.settings.development

# Other

find-gitignores: ## Find stray .gitignore files.
	@export FIND_GITIGNORES=`find -name '.gitignore'| wc -l`; \
	if [ $${FIND_GITIGNORES} -gt 1 ] ;then echo "More than one .gitignore found: $$FIND_GITIGNORES"; fi

check-readme: ## Checks validity of the README.rst file for PyPI publication.
	python setup.py check --restructuredtext --strict

check-missing-migrations: ## Make sure all models have proper migrations.
	./manage.py makemigrations --dry-run --noinput --check

check-missing-inits: ## Find missing __init__.py files from modules.
	@contrib/scripts/find_missing_inits.py

config-env-copy: ## Copy and convert `config.env` to `literals.py`.
	@contrib/scripts/copy_config_env.py > mayan/literals.py

print-%:
	@echo '$*=$($*)'

# Development environment

dev-setup: ## Bootstrap a virtualenv by install all dependencies to start developing.
dev-setup: dev-setup-os-ubuntu dev-setup-python

dev-setup-os-ubuntu:  ## Install the operating system packages needed for development.
	sudo apt-get install --yes clamav exiftool gcc gettext gnupg1 graphviz libcairo2 libffi-dev libfuse2 libjpeg-dev libldap2-dev libpng-dev libsasl2-dev poppler-utils python3-dev sane-utils tesseract-ocr-deu

-include devops/Makefile
-include docker/Makefile
-include forge/Makefile
-include mayan/apps/locales/Makefile
-include mayan/apps/platforms_gitlab/Makefile
-include python/Makefile
