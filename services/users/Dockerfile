# syntax=docker/dockerfile:1.7
FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY internal ./internal
COPY cmd/healthcheck ./cmd/healthcheck
COPY services/users ./services/users

RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/service ./services/users && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/healthcheck ./cmd/healthcheck

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/service /service
COPY --from=build /out/healthcheck /healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 CMD ["/healthcheck"]
EXPOSE 8080
ENTRYPOINT ["/service"]
