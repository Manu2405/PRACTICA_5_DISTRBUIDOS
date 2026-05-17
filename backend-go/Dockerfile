FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o /server ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=build /server .
ENV APP_PORT=8090
EXPOSE 8090
CMD ["./server"]
