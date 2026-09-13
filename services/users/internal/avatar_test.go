package internal

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func TestResizeAvatarBoundsAndFormat(t *testing.T) {
	source := image.NewRGBA(image.Rect(0, 0, 1000, 500))
	for y := range 500 {
		for x := range 1000 {
			source.Set(x, y, color.RGBA{R: 20, G: 80, B: 160, A: 255})
		}
	}
	var input bytes.Buffer
	if err := png.Encode(&input, source); err != nil {
		t.Fatal(err)
	}
	output, err := ResizeAvatar(&input, 512)
	if err != nil {
		t.Fatal(err)
	}
	resized, err := jpeg.Decode(bytes.NewReader(output))
	if err != nil {
		t.Fatal(err)
	}
	if resized.Bounds().Dx() != 512 || resized.Bounds().Dy() != 256 {
		t.Fatalf("dimensions = %v, want 512x256", resized.Bounds())
	}
}

func TestResizeAvatarRejectsInvalidInput(t *testing.T) {
	if _, err := ResizeAvatar(bytes.NewBufferString("not an image"), 512); err == nil {
		t.Fatal("invalid image accepted")
	}
}

// blendWhite is the only place the pipeline narrows 16-bit premultiplied
// channels back to 8 bits, which is what the #nosec G115 annotations claim is
// safe. A wrapped subtraction would show up here as a dark pixel.
func TestBlendWhiteFlattensTransparencyWithoutOverflow(t *testing.T) {
	for _, tc := range []struct {
		name  string
		input color.Color
		want  color.RGBA
	}{
		{"fully transparent becomes white", color.RGBA{}, color.RGBA{R: 0xff, G: 0xff, B: 0xff, A: 0xff}},
		{"half-alpha red lightens toward white", color.RGBA{R: 128, A: 128}, color.RGBA{R: 0xff, G: 127, B: 127, A: 0xff}},
		{"opaque black stays black", color.RGBA{A: 0xff}, color.RGBA{A: 0xff}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := blendWhite(tc.input); got != tc.want {
				t.Fatalf("blendWhite(%v) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}
