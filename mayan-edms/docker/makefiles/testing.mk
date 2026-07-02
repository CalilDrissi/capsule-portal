#!make

CONTAINER_TEST_ELASTICSEARCH_NAME = mayan-test-elasticsearch
CONTAINER_TEST_MAYAN_EDMS_NAME = mayan-test
CONTAINER_TEST_MYSQL_NAME = mayan-test-mysql
CONTAINER_TEST_POSTGRESQL_NAME = mayan-test-postgresql
CONTAINER_TEST_REDIS_NAME = mayan-test-redis

docker-elasticsearch-start: ## Start an Elasticsearch test container.
docker-elasticsearch-start:
	@docker container run \
	--detach \
	--env ELASTIC_PASSWORD=${CONFIG_DEFAULT_ELASTICSEARCH_PASSWORD} \
	--env ES_JAVA_OPTS="-Xms256m -Xmx256m" \
	--env "discovery.type=single-node" \
	--env "ingest.geoip.downloader.enabled=false" \
	--name $(CONTAINER_TEST_ELASTICSEARCH_NAME) \
	--publish 9200:9200 \
	--publish 9300:9300 \
	$(CONFIG_DOCKER_ELASTICSEARCH_IMAGE_NAME):$(CONFIG_DOCKER_ELASTICSEARCH_IMAGE_TAG)
	@while ! nc -z 127.0.0.1 9200; do echo -n .; sleep 1; done

docker-elasticsearch-stop: ## Stop and delete the Elasticsearch container.
docker-elasticsearch-stop:
	@docker container rm \
	--force $(CONTAINER_TEST_ELASTICSEARCH_NAME) >/dev/null 2>&1

docker-mysql-start: ## Start a MySQL Docker test container.
	@docker container run \
	--detach \
	--env MYSQL_ALLOW_EMPTY_PASSWORD="yes" \
	--env MYSQL_USER=$(CONFIG_DEFAULT_DATABASE_USER) \
	--env MYSQL_PASSWORD=$(CONFIG_DEFAULT_DATABASE_PASSWORD) \
	--env MYSQL_DATABASE=$(CONFIG_DEFAULT_DATABASE_NAME) \
	--name $(CONTAINER_TEST_MYSQL_NAME) \
	--publish 3306:3306 \
	--volume $(CONTAINER_TEST_MYSQL_NAME):/var/lib/mysql \
	$(CONFIG_DOCKER_MYSQL_IMAGE_NAME):$(CONFIG_DOCKER_MYSQL_IMAGE_TAG) \
	--character-set-server=utf8mb4 \
	--collation-server=utf8mb4_unicode_ci
	@while ! mysql -h 127.0.0.1 --user=$(CONFIG_DEFAULT_DATABASE_USER) --password=$(CONFIG_DEFAULT_DATABASE_PASSWORD) --execute "SHOW TABLES;" $(CONFIG_DEFAULT_DATABASE_NAME) >/dev/null 2>&1; do echo -n .;sleep 2; done

docker-mysql-stop: ## Stop and delete the MySQL container.
	@docker container rm \
	--force \
	$(CONTAINER_TEST_MYSQL_NAME) >/dev/null 2>&1
	@docker volume rm \
	$(CONTAINER_TEST_MYSQL_NAME) >/dev/null 2>&1 || true

docker-mysql-backup:
	@mysqldump --host=127.0.0.1 --no-tablespaces --user=$(CONFIG_DEFAULT_DATABASE_USER) --password=$(CONFIG_DEFAULT_DATABASE_PASSWORD) $(CONFIG_DEFAULT_DATABASE_NAME) > mayan-docker-mysql-backup.sql

docker-mysql-restore:
	@mysql --host=127.0.0.1 --user=$(CONFIG_DEFAULT_DATABASE_USER) --password=$(CONFIG_DEFAULT_DATABASE_PASSWORD) $(CONFIG_DEFAULT_DATABASE_NAME) < mayan-docker-mysql-backup.sql

docker-postgresql-start: ## Start a PostgreSQL Docker test container.
	@docker container run \
	--detach \
	--name $(CONTAINER_TEST_POSTGRESQL_NAME) \
	--env POSTGRES_HOST_AUTH_METHOD=trust \
	--env POSTGRES_USER=$(CONFIG_DEFAULT_DATABASE_USER) \
	--env POSTGRES_PASSWORD=$(CONFIG_DEFAULT_DATABASE_PASSWORD) \
	--env POSTGRES_DB=$(CONFIG_DEFAULT_DATABASE_NAME) \
	--publish 5432:5432 \
	--volume $(CONTAINER_TEST_POSTGRESQL_NAME):/var/lib/postgresql/data \
	$(CONFIG_DOCKER_POSTGRESQL_IMAGE_NAME):$(CONFIG_DOCKER_POSTGRESQL_IMAGE_TAG)
	@while ! docker exec --interactive --tty $(CONTAINER_TEST_POSTGRESQL_NAME) pg_isready --dbname=$(CONFIG_DEFAULT_DATABASE_NAME) --username=$(CONFIG_DEFAULT_DATABASE_USER) >/dev/null 2>&1; do echo -n .;sleep 1; done

docker-postgresql-stop: ## Stop and delete the PostgreSQL container.
	@docker container rm \
	--force \
	$(CONTAINER_TEST_POSTGRESQL_NAME) >/dev/null 2>&1
	@docker volume rm \
	$(CONTAINER_TEST_POSTGRESQL_NAME) >/dev/null 2>&1 || true

docker-postgresql-backup:
	@PGPASSWORD="$(CONFIG_DEFAULT_DATABASE_PASSWORD)" pg_dump --dbname=$(CONFIG_DEFAULT_DATABASE_NAME) --host=127.0.0.1 --username=$(CONFIG_DEFAULT_DATABASE_USER) > mayan-docker-postgresql-backup.sql

docker-postgresql-restore:
	@cat mayan-docker-postgresql-backup.sql | psql --dbname=$(CONFIG_DEFAULT_DATABASE_NAME) --host=127.0.0.1 --username=$(CONFIG_DEFAULT_DATABASE_USER) > /dev/null

docker-redis-start: ## Start a Redis Docker test container.
docker-redis-start:
	@docker container run \
	--detach \
	--name $(CONTAINER_TEST_REDIS_NAME) \
	--publish 6379:6379 \
	--volume $(CONTAINER_TEST_REDIS_NAME):/data \
	$(CONFIG_DOCKER_REDIS_IMAGE_NAME):$(CONFIG_DOCKER_REDIS_IMAGE_TAG)
	@while ! docker exec --interactive --tty $(CONTAINER_TEST_REDIS_NAME) redis-cli CONFIG GET databases >/dev/null 2>&1; do echo -n .;sleep 1; done

docker-redis-stop: ## Stop and delete the Redis container.
docker-redis-stop:
	@docker container rm \
	--force \
	$(CONTAINER_TEST_REDIS_NAME) >/dev/null 2>&1
	@docker volume rm \
	$(CONTAINER_TEST_REDIS_NAME) >/dev/null 2>&1 || true

docker-shell: ## Launch a bash instance inside a running container. Pass the container name via DOCKER_CONTAINER.
	@docker container exec \
	--env TERM=$(TERM) \
	--env "COLUMNS=$(DOCKER_CONSOLE_COLUMNS)" \
	--env "LINES=$(DOCKER_CONSOLE_LINES)" \
	--interactive \
	--tty \
	$(DOCKER_CONTAINER) \
	/bin/bash

docker-runtest-container: ## Run a test container.
docker-runtest-container: docker-test-cleanup
	@docker container run \
	--detach \
	--name test-mayan-edms \
	--publish 80:8000 \
	--volume test-mayan_data:/var/lib/mayan \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)

docker-runtest-cleanup: ## Delete the test container and the test volume.
	@docker container rm \
	--force \
	$(CONTAINER_TEST_POSTGRESQL_NAME) || true
	@docker volume rm \
	$(CONTAINER_TEST_POSTGRESQL_NAME) || true

docker-runtest-all: ## Executed the test suite in a test container.
	@docker container run \
	--rm \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED) \
	run_tests
