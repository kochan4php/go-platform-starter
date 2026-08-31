packer {
  required_plugins {
    hcloud = {
      source  = "github.com/hetznercloud/hcloud"
      version = ">= 1.6.0, < 2.0.0"
    }
  }
}

variable "hcloud_token" {
  type      = string
  sensitive = true
  default   = env("HCLOUD_TOKEN")
}

variable "location" {
  type    = string
  default = "fsn1"
}

source "hcloud" "platform" {
  token         = var.hcloud_token
  image         = "ubuntu-24.04"
  location      = var.location
  server_type   = "cx23"
  ssh_username  = "root"
  snapshot_name = "go-platform-ubuntu-{{timestamp}}"
  snapshot_labels = {
    application = "go-platform"
    managed_by  = "packer"
  }
}

build {
  sources = ["source.hcloud.platform"]

  provisioner "shell" {
    inline = [
      "cloud-init status --wait",
      "apt-get update",
      "DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-apt",
    ]
  }

  provisioner "ansible" {
    playbook_file = "${path.root}/../ansible/site.yml"
    user          = "root"
    extra_arguments = [
      "--extra-vars", "{\"platform_admin_user\":\"root\",\"platform_admin_cidrs\":[\"127.0.0.1/32\"],\"platform_image_build\":true}",
    ]
  }
}
