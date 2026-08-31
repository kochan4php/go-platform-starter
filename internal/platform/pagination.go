package platform

import (
	"fmt"
	"net/http"
	"strconv"
)

const (
	defaultLimit = 10
	maxLimit     = 100
)

type Meta struct {
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
	Total      int64  `json:"total"`
	NextCursor string `json:"nextCursor,omitempty"`
	Estimated  bool   `json:"estimated,omitempty"`
	Next       string `json:"next,omitempty"`
	Prev       string `json:"prev,omitempty"`
}

func SetPaginationLinks(r *http.Request, meta *Meta) {
	link := func(offset int, cursor string) string {
		u := *r.URL
		q := u.Query()
		if cursor != "" {
			q.Set("cursor", cursor)
			q.Del("offset")
		} else {
			q.Set("offset", strconv.Itoa(offset))
			q.Del("cursor")
		}
		u.RawQuery = q.Encode()
		return u.RequestURI()
	}
	if meta.NextCursor != "" {
		meta.Next = link(0, meta.NextCursor)
	} else if int64(meta.Offset+meta.Limit) < meta.Total {
		meta.Next = link(meta.Offset+meta.Limit, "")
	}
	if meta.Offset > 0 {
		meta.Prev = link(max(0, meta.Offset-meta.Limit), "")
	}
}

type listData struct {
	Items any  `json:"items"`
	Meta  Meta `json:"meta"`
}

func ParsePagination(r *http.Request) (limit, offset int, err error) {
	q := r.URL.Query()
	limit = defaultLimit
	offset = 0

	if v := q.Get("limit"); v != "" {
		limit, err = strconv.Atoi(v)
		if err != nil || limit < 1 {
			return 0, 0, fmt.Errorf("limit must be a positive integer")
		}
	}
	if v := q.Get("offset"); v != "" {
		offset, err = strconv.Atoi(v)
		if err != nil || offset < 0 {
			return 0, 0, fmt.Errorf("offset must be a non-negative integer")
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return limit, offset, nil
}

func ListOK(w http.ResponseWriter, message string, items any, meta Meta) {
	OK(w, http.StatusOK, message, listData{Items: items, Meta: meta})
}
