package main

import (
	"fmt"
	"io"
	"os"

	"gopkg.in/yaml.v3"
)

func main() {
	for _, name := range os.Args[1:] {
		file, err := os.Open(name)
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
				file.Close()
				fail(name, err)
			}
		}
		file.Close()
	}
}

func fail(name string, err error) {
	fmt.Fprintf(os.Stderr, "%s: %v\n", name, err)
	os.Exit(1)
}
