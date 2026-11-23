#!/usr/bin/env bash
# Preparar las fuentes APT de los runners Ubuntu para instalar las
# dependencias de WebKit sin el espejo EC2 lento ni repositorios externos.
# No cambia el sitio web, las dependencias del proyecto ni sus archivos.
set -euo pipefail

ubuntu_sources=/etc/apt/sources.list.d/ubuntu.sources
if [[ ! -f "$ubuntu_sources" ]]; then
  echo "::error::No se encuentra ubuntu.sources en el runner Ubuntu" >&2
  exit 1
fi
sudo sed -i 's@mirror+file:/etc/apt/apt-mirrors.txt@https://archive.ubuntu.com/ubuntu@g' "$ubuntu_sources"
if ! grep -q 'archive.ubuntu.com/ubuntu' "$ubuntu_sources"; then
  echo "::error::No se ha podido configurar el espejo oficial de Ubuntu" >&2
  exit 1
fi
sudo mkdir -p /tmp/cuaderno-apt-sources-externas
for source in /etc/apt/sources.list.d/*; do
  case "$source" in
    */ubuntu.sources) ;;
    *.list|*.sources) sudo mv "$source" /tmp/cuaderno-apt-sources-externas/ ;;
  esac
done
echo "Espejo oficial Ubuntu preparado; repositorios externos deshabilitados en este runner."
grep '^URIs:' "$ubuntu_sources"
