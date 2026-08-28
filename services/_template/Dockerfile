FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY internal ./internal
COPY cmd/healthcheck ./cmd/healthcheck
COPY services/_template ./services/_template

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/service ./services/_template && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/healthcheck ./cmd/healthcheck

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/service /service
COPY --from=build /out/healthcheck /healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 CMD ["/healthcheck"]
EXPOSE 8080
ENTRYPOINT ["/service"]
