package internal

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
)

const maxAvatarBytes = 8 << 20

// ResizeAvatar decodes common web image formats and returns a bounded JPEG.
// It intentionally uses the standard library to keep the upload path small.
func ResizeAvatar(reader io.Reader, maxDimension int) ([]byte, error) {
	if maxDimension <= 0 || maxDimension > 1024 {
		maxDimension = 512
	}
	raw, err := io.ReadAll(io.LimitReader(reader, maxAvatarBytes+1))
	if err != nil {
		return nil, err
	}
	if len(raw) > maxAvatarBytes {
		return nil, platformBadAvatar("image exceeds 8 MiB")
	}
	config, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil || config.Width <= 0 || config.Height <= 0 || config.Width > 4096 || config.Height > 4096 {
		return nil, platformBadAvatar("image must be JPEG, PNG, or GIF and at most 4096x4096")
	}
	source, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, platformBadAvatar("image could not be decoded")
	}
	width, height := config.Width, config.Height
	if width > maxDimension || height > maxDimension {
		if width >= height {
			height = max(1, height*maxDimension/width)
			width = maxDimension
		} else {
			width = max(1, width*maxDimension/height)
			height = maxDimension
		}
	}
	destination := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := range height {
		for x := range width {
			sx := source.Bounds().Min.X + x*config.Width/width
			sy := source.Bounds().Min.Y + y*config.Height/height
			pixel := source.At(sx, sy)
			if _, _, _, alpha := pixel.RGBA(); alpha != 0xffff {
				pixel = blendWhite(pixel)
			}
			destination.Set(x, y, pixel)
		}
	}
	var output bytes.Buffer
	if err := jpeg.Encode(&output, destination, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func blendWhite(input color.Color) color.Color {
	r, g, b, a := input.RGBA()
	return color.RGBA{
		R: uint8((r + 0xffff - a) >> 8),
		G: uint8((g + 0xffff - a) >> 8),
		B: uint8((b + 0xffff - a) >> 8),
		A: 0xff,
	}
}

func platformBadAvatar(message string) error { return fmt.Errorf("invalid avatar: %s", message) }
