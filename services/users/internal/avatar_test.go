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
