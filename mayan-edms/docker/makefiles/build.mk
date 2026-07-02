#!make

# BuildKit

docker-buildkitd-config-create:
	@echo "debug = true" > /tmp/buildkitd.toml
	@if [ $(DOCKER_MIRROR) ]; then \
		echo "" >> /tmp/buildkitd.toml; \
		echo '[registry."docker.io"]' >> /tmp/buildkitd.toml; \
		echo '  mirrors = ["$(DOCKER_MIRROR)"]' >> /tmp/buildkitd.toml; \
	fi

docker-buildx-create: docker-buildx-rm docker-buildkitd-config-create
	docker context create \
	tls-context
	docker buildx create \
	--bootstrap \
	--config /tmp/buildkitd.toml \
	--driver docker-container \
	--name mirrored \
	--use tls-context

docker-buildx-rm:
	docker buildx rm \
	mirrored || true
	docker context rm \
	tls-context || true

docker-buildx-stop:
	docker buildx stop \
	mirrored

docker-build-all: ## Build images for all platforms.
docker-build-all: docker-dockerfile-update docker-buildx-create docker-build-amd64 docker-build-arm64 docker-buildx-stop

docker-build-amd64: ## Build a new amd64 image.
	DOCKER_BUILDKIT=1 \
	docker build \
	--build-arg APT_PROXY=$(APT_PROXY) \
	--build-arg PIP_INDEX_URL=$(PIP_INDEX_URL) \
	--build-arg PIP_TRUSTED_HOST=$(PIP_TRUSTED_HOST) \
	--build-arg HTTP_PROXY=$(HTTP_PROXY) \
	--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
	--builder mirrored \
	--cache-from type=registry,ref=$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64 \
	--cache-to type=registry,ref=$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64,mode=max \
	--file docker/Dockerfile $(DOCKER_IMAGE_LABELS) \
	--output type=docker \
	--platform linux/amd64 \
	--tag $(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64 \
	.

docker-build-arm64: ## Build a new arm64 image.
	DOCKER_BUILDKIT=1 \
	docker build \
	--build-arg APT_PROXY=$(APT_PROXY) \
	--build-arg PIP_INDEX_URL=$(PIP_INDEX_URL) \
	--build-arg PIP_TRUSTED_HOST=$(PIP_TRUSTED_HOST) \
	--build-arg HTTP_PROXY=$(HTTP_PROXY) \
	--build-arg HTTPS_PROXY=$(HTTPS_PROXY) \
	--builder mirrored \
	--cache-from type=registry,ref=$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64 \
	--cache-to type=registry,ref=$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64,mode=max \
	--file docker/Dockerfile $(DOCKER_IMAGE_LABELS) \
	--output type=docker \
	--platform linux/arm64 \
    --tag $(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64 \
	.

# Dockerfile

docker-dockerfile-update: ## Update the Dockerfile file from the platform template.
docker-dockerfile-update: config-env-copy
	./manage.py platforms_template docker_dockerfile > docker/Dockerfile
