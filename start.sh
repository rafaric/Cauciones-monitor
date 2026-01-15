#!/bin/bash

# Script para ejecutar backend y frontend simultáneamente

echo "🚀 Iniciando Monitor de Cauciones..."
echo ""

# Función para manejar Ctrl+C
cleanup() {
    echo ""
    echo "⏹️  Deteniendo servidores..."
    kill 0
    exit
}

trap cleanup SIGINT SIGTERM

# Iniciar backend en background
echo "📡 Iniciando backend..."
cd backend && node src/index.js &
BACKEND_PID=$!

# Esperar un poco para que el backend inicie
sleep 2

# Iniciar frontend en background
echo "🎨 Iniciando frontend..."
cd frontend && bun run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servidores iniciados:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores"
echo ""

# Esperar a que terminen los procesos
wait
