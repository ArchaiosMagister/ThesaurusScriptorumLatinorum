#!/bin/bash
# Abre exclusivamente la copia local del cuaderno en un navegador del Mac.
set -eo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # NVM no suele cargarse automáticamente al abrir un .command desde Finder.
  . "$HOME/.nvm/nvm.sh"
fi

printf '\n=== Cuaderno de textos latinos | PR #14 | Prueba local ===\n\n'
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Se necesita Node.js 22 o posterior para preparar y abrir el cuaderno.'
  echo 'Instálalo desde https://nodejs.org/en/download y vuelve a abrir este archivo.'
  echo 'No se ha modificado ningún dato ni la web estable.'
  read -r -p 'Pulsa Intro para cerrar esta ventana... ' _
  exit 1
fi
major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$major" -lt 22 ]; then
  echo "Node.js $major es demasiado antiguo. Actualiza a Node.js 22 o posterior."
  read -r -p 'Pulsa Intro para cerrar esta ventana... ' _
  exit 1
fi

if [ ! -d node_modules ]; then
  echo '[1/3] Instalando dependencias (solo la primera vez, necesita internet)...'
  npm install --ignore-scripts --no-audit --no-fund
fi
if [ ! -f dist/index.html ] || [ ! -f dist/library/catalog.json ]; then
  echo '[2/3] Compilando la aplicación y preparando la biblioteca latina (necesita internet)...'
  npm run build
fi

PORT=4179
URL="http://127.0.0.1:$PORT/CuadernoTextosLatinos/"
if curl --silent --max-time 1 --output /dev/null "$URL"; then
  echo "El puerto $PORT ya tiene un servidor. Para evitar abrir una versión equivocada, se detiene este lanzamiento."
  read -r -p 'Pulsa Intro para cerrar esta ventana... ' _
  exit 1
fi

echo '[3/3] Iniciando servidor privado solo en este Mac...'
PORT="$PORT" node scripts/serve-static.mjs &
server_pid=$!
cleanup() { kill "$server_pid" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
for attempt in $(seq 1 40); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo 'El servidor terminó antes de abrirse; revisa el mensaje anterior.'
    read -r -p 'Pulsa Intro para cerrar... ' _
    exit 1
  fi
  if curl -fsS --max-time 1 --output /dev/null "$URL" 2>/dev/null; then
    echo "Abriendo $URL"
    open "$URL"
    echo ''
    echo 'El cuaderno está disponible únicamente mientras esta ventana permanezca abierta.'
    echo 'Para cerrarlo, pulsa Ctrl+C aquí. Tus datos quedan en el navegador.'
    wait "$server_pid"
    exit 0
  fi
  sleep 0.4
done

echo 'No se consiguió iniciar el servidor local.'
read -r -p 'Pulsa Intro para cerrar... ' _
exit 1
