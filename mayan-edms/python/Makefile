#!make

# Requirements

python-requirements-generate: ## Generate all requirements files from the project dependency declarations.
	@./manage.py dependencies_generate_requirements \
	build --settings=mayan.settings.development > requirements/build.txt
	@./manage.py dependencies_generate_requirements \
	development --settings=mayan.settings.development > requirements/development.txt
	@./manage.py dependencies_generate_requirements \
	documentation --settings=mayan.settings.development > requirements/documentation.txt
	@./manage.py dependencies_generate_requirements \
	testing --settings=mayan.settings.testing > requirements/testing.txt
	@./manage.py dependencies_generate_requirements \
	production > requirements/production.txt
	@./manage.py dependencies_generate_requirements \
	publish> requirements/publish.txt

python-release: ## Package (sdist and wheel) and upload a release.
python-release: clean python-wheel-production
	twine upload dist/* -r pypi

python-setup-py-generate: ## Create and update the setup.py file.
python-setup-py-generate: python-requirements-generate
	@./contrib/scripts/generate_setup.py
	@echo "Complete."

python-sdist-production: ## Build the production source distribution package.
python-sdist-production: clean
	cp MANIFEST-PRODUCTION.in MANIFEST.in
	python setup.py sdist
	ls -l dist

python-sdist-testing: ## Build the testing source distribution package.
python-sdist-testing: clean
	cp MANIFEST-TESTING.in MANIFEST.in
	python setup.py sdist
	ls -l dist

python-wheel-production: ## Build the production wheel distribution package.
python-wheel-production: clean python-sdist-production
	pip wheel --wheel-dir dist dist/*.tar.gz
	ls -l dist

python-wheel-testing: ## Build the testing wheel distribution package.
python-wheel-testing: clean python-sdist-testing
	pip wheel --wheel-dir dist dist/*.tar.gz
	ls -l dist

# Development environment

dev-python-cleanup: ## Clean up all Python libraries.
	@pip freeze > venv-requirements.txt
	@pip uninstall --requirement venv-requirements.txt --yes
	@rm venv-requirements.txt

dev-setup-python: ## Install the Python libraries needed for development.
dev-setup-python: dev-setup-python-essential dev-setup-python-build dev-setup-python-development dev-setup-python-documentation dev-setup-python-production dev-setup-python-publish dev-setup-python-testing

dev-setup-python-documentation: ## Install Python libraries needed to build the documentation.
	@pip install \
	--requirement requirements/documentation.txt

dev-setup-python-build: ## Install the Python build libraries.
	@pip install --requirement requirements/build.txt

dev-setup-python-development: ## Install the Python development libraries.
	@pip install \
	--requirement requirements/development.txt

dev-setup-python-essential: ## Install essential Python libraries.
	pip install pip==$(CONFIG_PYTHON_PIP_VERSION)
	pip install packaging==$(CONFIG_PYTHON_PACKAGING_VERSION)
	pip install setuptools==$(CONFIG_PYTHON_SETUPTOOLS_VERSION)

dev-setup-python-mysql: ## Install the Python MySQL library.
	@pip install mysqlclient==$(CONFIG_PYTHON_MYSQL_VERSION)

dev-setup-python-postgresql: ## Install the Python PostgreSQL library.
	@pip install psycopg==$(CONFIG_PYTHON_PSYCOPG_VERSION)

dev-setup-python-production: ## Install production Python libraries.
	@pip install \
	--requirement requirements/production.txt

dev-setup-python-publish: ## Install Python libraries needed to publish packages.
	@pip install \
	--requirement requirements/publish.txt

dev-setup-python-redis: ## Install the Python Redis library.
	@pip install redis==$(CONFIG_PYTHON_REDIS_VERSION)

dev-setup-python-testing: ## Install Python libraries needed to run tests.
	@pip install \
    --requirement requirements/testing.txt
