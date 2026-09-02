#!/usr/bin/env bash
set -euo pipefail

: "${IMAGES:?set IMAGES to a space-separated list of digest-pinned images}"
OUTPUT="${OUTPUT:-go-platform-airgap.tar}"
case " $IMAGES " in *":latest "*) echo "latest tags are not allowed" >&2; exit 1 ;; esac
work="$(mktemp -d)"
cleanup() { find "$work" -type f -delete; rmdir "$work"; }
trap cleanup EXIT HUP INT TERM

read -r -a images <<<"$IMAGES"
for image in "${images[@]}"; do
  case "$image" in *@sha256:*) ;; *) echo "image is not digest-pinned: $image" >&2; exit 1 ;; esac
  docker pull "$image"
done
docker save "${images[@]}" -o "$work/images.tar"
tar -cf "$work/configuration.tar" infra/compose.prod.yml infra/nginx docs/INFRA_OPS.md scripts/restore-test.sh
sha256sum "$work/images.tar" "$work/configuration.tar" > "$work/SHA256SUMS"
tar -C "$work" -cf "$OUTPUT" images.tar configuration.tar SHA256SUMS
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
printf 'air-gap bundle: %s (verify both checksum layers before import)\n' "$OUTPUT"
