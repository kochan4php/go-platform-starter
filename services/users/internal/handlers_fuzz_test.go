package internal

import (
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

func FuzzHandlerDecode(f *testing.F) {
	f.Add(`{"id":1,"displayName":"Ada","avatarUrl":""}`)
	f.Add(`{"id":"not-an-integer"}`)
	f.Add(`{"id":1} trailing`)
	f.Fuzz(func(t *testing.T, body string) {
		if len(body) > 2<<20 {
			t.Skip()
		}
		h := NewHandlers(nil, slog.New(slog.NewTextHandler(io.Discard, nil)))
		request := httptest.NewRequest("POST", "/users", strings.NewReader(body))
		var input profileInput
		_ = h.decode(request, &input)
	})
}
