#!make

REMOTE_SSH_USERNAME ?= $(CONFIG_REMOTE_SSH_USERNAME)
REMOTE_SSH_HOSTNAME ?= $(CONFIG_REMOTE_SSH_HOSTNAME)
REMOTE_DOCUMENTATION_PATH ?= $(CONFIG_REMOTE_DOCUMENTATION_PATH)

# Builds and manifests

devops-docker-build-all: ## Build images for all architectures and push them.
devops-docker-build-all: devops-docker-build-amd64 devops-docker-build-arm64 docker-manifest-create docker-manifest-push

devops-docker-build-amd64: ## Build the AMD64 image and push it to the registry.
devops-docker-build-amd64: docker-registry-login docker-dockerfile-update docker-buildx-create docker-build-amd64 docker-image-push-amd64

devops-docker-build-arm64: ## Build the ARM64 image and push it to the registry.
devops-docker-build-arm64: docker-registry-login docker-dockerfile-update docker-buildx-create docker-build-arm64 docker-image-push-arm64

# Release

devops-docker-major-publish:
	$(MAKE) devops-docker-minor-publish
	docker manifest rm \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):latest 2>/dev/null || true
	docker manifest rm \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MAJOR) 2>/dev/null || true
	docker manifest create \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):latest \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker manifest create \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MAJOR) \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker manifest push \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):latest
	docker manifest push \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MAJOR)

devops-docker-minor-publish:
	$(MAKE) docker-registry-login
	$(MAKE) docker-registry-public-login
	$(MAKE) docker-image-pull-amd64
	$(MAKE) docker-image-pull-arm64
	docker tag \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64
	docker tag \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker push $(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64
	docker push $(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker manifest rm \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION) 2>/dev/null || true
	docker manifest rm \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MINOR) 2>/dev/null || true
	docker manifest create \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION) \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker manifest create \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MINOR) \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-amd64 \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)-arm64
	docker manifest push \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_VERSION)
	docker manifest push \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):s$(DOCKER_IMAGE_VERSION_MINOR)

devops-docker-nightly-publish:
	$(MAKE) docker-registry-login
	$(MAKE) docker-image-pull-amd64
	docker tag \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED) \
	$(DOCKER_IMAGE_PUBLIC_NAME_FULL):$(DOCKER_IMAGE_TAG)-amd64
	$(MAKE) docker-registry-public-login
	docker push $(DOCKER_IMAGE_PUBLIC_NAME_FULL):v$(DOCKER_IMAGE_TAG)-amd64

# Remotes

devops-demo-deploy: remote-docker-compose-down-and-cleanup remote-docker-files-download remote-docker-deploy

devops-staging-deploy: remote-docker-compose-down-and-cleanup remote-docker-files-copy remote-docker-files-update remote-docker-registry-login remote-docker-deploy

remote-docker-compose-down-and-cleanup:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "docker compose down --remove-orphans --volumes || true"

remote-docker-deploy:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "docker compose pull && docker compose up --detach"

remote-docker-files-copy:
	scp docker/.env docker/docker-compose.yml $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME):~

remote-docker-files-download:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "curl --remote-name-all https://gitlab.com/mayan-edms/mayan-edms/-/raw/master/docker/{.env,docker-compose.yml} --show-error --silent"

remote-docker-files-update:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "echo \"\" >> .env && echo \"# GitLab CI\" >> .env && echo \"MAYAN_DOCKER_IMAGE_NAME=$(DOCKER_REGISTRY_NAME)/$(DOCKER_IMAGE_NAME)\" >> .env && echo \"MAYAN_DOCKER_IMAGE_TAG=$(DOCKER_IMAGE_TAG)$(DOCKER_IMAGE_TAG_EXTRA)\" >> .env"

remote-docker-registry-login:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "docker login --username '$(DOCKER_REGISTRY_USERNAME_ESCAPED)' --password '$(DOCKER_REGISTRY_PASSWORD)' $(DOCKER_REGISTRY_NAME)"

# Documentation

devops-documentation-deploy: remote-documentation-cleanup remote-documentation-update

remote-documentation-cleanup:
	ssh $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME) "rm --force --recursive $(REMOTE_DOCUMENTATION_PATH)*"

remote-documentation-update:
	rsync --archive --compress --progress --rsh ssh --verbose docs/_build/html/* $(REMOTE_SSH_USERNAME)@$(REMOTE_SSH_HOSTNAME):$(REMOTE_DOCUMENTATION_PATH)
