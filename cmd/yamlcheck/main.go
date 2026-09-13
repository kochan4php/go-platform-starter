package main

import (
	"fmt"
	"io"
	"os"

	"gopkg.in/yaml.v3"
)

func main() {
	for _, name := range os.Args[1:] {
		file, err := os.Open(name) // #nosec G304,G703 -- this is a CLI linter; the caller names the files to check
		if err != nil {
			fail(name, err)
		}
		decoder := yaml.NewDecoder(file)
		for {
			var document any
			err = decoder.Decode(&document)
			if err == io.EOF {
				break
			}
			if err != nil {
				_ = file.Close()
				fail(name, err)
			}
		}
		_ = file.Close()
	}
}

func fail(name string, err error) {
	fmt.Fprintf(os.Stderr, "%s: %v\n", name, err)
	os.Exit(1)
}
