FROM mcr.microsoft.com/devcontainers/base:ubuntu

USER vscode

ENV DFXVM_INIT_YES=true
RUN sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

WORKDIR /workspace
