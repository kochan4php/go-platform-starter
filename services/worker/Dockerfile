FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY internal ./internal
COPY services/worker ./services/worker

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/service ./services/worker

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/service /service
EXPOSE 8080
ENTRYPOINT ["/service"]
