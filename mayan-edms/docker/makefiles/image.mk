#!make

docker-image-push-amd64: ## Push the amd64 image to the Docker registry.
docker-image-push-amd64: docker-registry-login
	docker image push \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64

docker-image-push-all: ## Push all images to the Docker registry.
docker-image-push-all: docker-image-push-amd64 docker-image-push-arm64
	# /etc/docker/daemon.json {"insecure-registries" : ["docker-registry.local:5000"]}
	# /etc/hosts <ip address>  docker-registry.local

docker-image-push-arm64: ## Push the arm64 image to the Docker registry.
docker-image-push-arm64: docker-registry-login
	docker image push \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64

docker-image-pull-amd64: ## Pull an AMD64 image from the Docker registry.
docker-image-pull-amd64: docker-registry-login
	docker image pull \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64

docker-image-pull-arm64: ## Pull an ARM64 image from the Docker registry.
docker-image-pull-arm64: docker-registry-login
	docker image pull \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64
