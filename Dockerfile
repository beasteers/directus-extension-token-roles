FROM directus/directus:10

USER root
WORKDIR /directus/build-extension
ADD package.json package-lock.json ./
RUN npm install
ADD src src
RUN npm run build
WORKDIR /directus
RUN mkdir -p ./extensions/hooks/directus-extensions-token-roles && \
    cp -r build-extension/dist/* ./extensions/hooks/directus-extensions-token-roles
USER node