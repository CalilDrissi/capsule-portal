#!make

MAYAN_TEST_MEDIA_ROOT ?= /tmp/mayan-test

docker-staging-start: ## Launch and initialize production-like services using Docker (PostgreSQL and Redis).
docker-staging-start: docker-postgresql-start docker-redis-start
	@export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	rm --force --recursive $(MAYAN_TEST_MEDIA_ROOT); \
	export MAYAN_MEDIA_ROOT=$(MAYAN_TEST_MEDIA_ROOT); \
	export DJANGO_SETTINGS_MODULE=mayan.settings.staging.docker; \
	./manage.py common_initial_setup

docker-staging-stop: ## Stop and delete the Docker production-like services.
docker-staging-stop: docker-postgresql-stop docker-redis-stop

docker-staging-frontend: ## Launch a front end instance that uses the production-like services.
	@export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	export MAYAN_MEDIA_ROOT=$(MAYAN_TEST_MEDIA_ROOT); \
	export DJANGO_SETTINGS_MODULE=mayan.settings.staging.docker; \
	export MAYAN_USER_USERNAME=$(shell whoami); \
	export MAYAN_GUNICORN_LIMIT_REQUEST_LINE=${CONFIG_GUNICORN_LIMIT_REQUEST_LINE}; \
	export MAYAN_GUNICORN_MAX_REQUESTS=${CONFIG_GUNICORN_MAX_REQUESTS}; \
	export MAYAN_GUNICORN_REQUESTS_JITTER=${CONFIG_GUNICORN_REQUESTS_JITTER}; \
	export MAYAN_GUNICORN_TIMEOUT=${CONFIG_GUNICORN_TIMEOUT}; \
	export MAYAN_GUNICORN_WORKER_CLASS=${CONFIG_GUNICORN_WORKER_CLASS}; \
	export MAYAN_GUNICORN_WORKERS=${CONFIG_GUNICORN_WORKERS}; \
	$(COMMAND_SENTRY); \
	./docker/rootfs/usr/local/bin/run_frontend.sh

docker-staging-worker: ## Launch a worker instance that uses the production-like services.
	@export MAYAN_DATABASES="{'default':{'ENGINE':'django.db.backends.postgresql','NAME':'$(CONFIG_DEFAULT_DATABASE_NAME)','PASSWORD':'$(CONFIG_DEFAULT_DATABASE_PASSWORD)','USER':'$(CONFIG_DEFAULT_DATABASE_USER)','HOST':'127.0.0.1'}}"; \
	export MAYAN_MEDIA_ROOT=$(MAYAN_TEST_MEDIA_ROOT); \
	export DJANGO_SETTINGS_MODULE=mayan.settings.staging.docker; \
	celery -A mayan worker -B -l INFO -O fair
