#!make

# Read config files, prefix keys with CONFIG_, and eval them into Make.
# Notes:
# - Skips blank lines and full-line comments
# - Supports values with spaces (LINUX_PACKAGES_*)
# - Later files override earlier ones (config-local.env wins)
# - Escapes values containing `$` with `$$`.

ifeq ($(wildcard config.env),)
    $(error config.env is required but missing!)
endif

CONFIG_ENV_FILES := config.env $(wildcard config-local.env)

# Generate the .mk file (re-created automatically when any .env changes)
.config.env.mk: $(CONFIG_ENV_FILES)
	@awk '\
		/^[ \t]*#/ || /^[ \t]*$$/ { next } \
		{ \
			line = $$0; \
			gsub(/^[ \t]+/, "", line); \
			eq = index(line, "="); \
			if (eq == 0) next; \
			key = substr(line, 1, eq-1); \
			val = substr(line, eq+1); \
			gsub(/^[ \t]+|[ \t]+$$/, "", key); \
			gsub(/^[ \t]+|[ \t]+$$/, "", val); \
			gsub(/\$$/, "$$$$", val); \
			printf "CONFIG_%s := %s\n", key, val \
		}' $^ > $@

-include .config.env.mk
