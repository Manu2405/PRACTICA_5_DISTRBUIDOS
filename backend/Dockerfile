# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS build
WORKDIR /src

RUN apk add --no-cache ca-certificates git

COPY go.mod ./
COPY app ./app

RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./app

FROM alpine:3.20
RUN apk add --no-cache ca-certificates \
  && adduser -D -H -s /sbin/nologin appuser
USER appuser
WORKDIR /home/appuser
COPY --from=build /out/api /usr/local/bin/api
ENV PORT=8000
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/api"]
