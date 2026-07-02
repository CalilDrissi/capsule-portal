#!make

docker-manifest-create: ## Merge amd64 and arm64 images into one manifest.
docker-manifest-create: docker-manifest-delete
	docker manifest create \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED) \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-amd64 \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)-arm64

docker-manifest-delete: ## Delete the manifest.
	docker manifest rm \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED) 2>/dev/null || true

docker-manifest-push: ## Push the manifest.
	docker manifest push \
	$(DOCKER_IMAGE_NAME_FULL_TAGGED)
