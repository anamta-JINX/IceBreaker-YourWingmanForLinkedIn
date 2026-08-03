@echo off
set "OLLAMA_ORIGINS=chrome-extension://*"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_KEEP_ALIVE=-1"
ollama serve
