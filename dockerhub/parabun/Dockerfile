FROM debian:trixie-slim

ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}

ARG BUN_INSTALL_BIN=/usr/local/bin
ENV BUN_INSTALL_BIN=${BUN_INSTALL_BIN}

# Runtime deps for parabun's native bindings:
#   libasound2  — parabun:audio (ALSA capture/playback in parabun_audio_io.cpp)
# Other native modules (libheif, libjxl, CUDA, piper, whisper) are loaded
# via dlopen at first use, so they don't need to be in the base image —
# the user installs them on demand.
RUN apt-get update -qq \
    && apt-get install -qq --no-install-recommends libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/
COPY bun /usr/local/bin/bun

RUN chmod +x /usr/local/bin/bun /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /usr/local/bun-node-fallback-bin \
    && ln -s /usr/local/bin/bun /usr/local/bun-node-fallback-bin/node \
    && ln -s /usr/local/bin/bun /usr/local/bin/bunx \
    && ln -s /usr/local/bin/bun /usr/local/bin/parabun
ENV PATH="${PATH}:/usr/local/bun-node-fallback-bin"

RUN groupadd bun --gid 1000 \
    && useradd bun --uid 1000 --gid bun --shell /bin/sh --create-home \
    && bun --version

WORKDIR /home/bun/app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/bun"]
