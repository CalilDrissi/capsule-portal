#!make

docker-docker-compose-update: ## Update the Docker Compose file from the platform template.
docker-docker-compose-update: config-env-copy
	./manage.py platforms_template docker_docker_compose > docker/docker-compose.yml
