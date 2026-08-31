FROM alpine:3.22

RUN apk add --no-cache age postgresql17-client redis tar
COPY scripts/backup.sh scripts/encrypted-backup.sh /scripts/
RUN chmod 0555 /scripts/backup.sh /scripts/encrypted-backup.sh \
    && mkdir -p /backups \
    && chown 65534:65534 /backups

USER 65534:65534
WORKDIR /backups
